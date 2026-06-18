// =====================================================================
// LIVE PULSE · config + data layer condiviso
// Referenziato da index / dashboard / admin / recap / make_qr .html
// =====================================================================

// >>> Supabase (Project Settings > API) <<<
const SUPABASE_URL  = "https://vqtslejptdpafidbiyuv.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxdHNsZWpwdGRwYWZpZGJpeXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2OTY3MDEsImV4cCI6MjA5NzI3MjcwMX0.-rCleuBvGe-NxbEyU4tWdK-XhKJ2zsMEpaKP_uzh2do";

// URL pubblico della survey (per il QR sul palco). Vuoto = QR decorativo.
const SURVEY_URL = "";

// Bucket Storage per gli asset degli eventi (vedi 04_auth_storage.sql)
const ASSET_BUCKET = "event-assets";

// Evento di default quando l'URL non ha ?event=...
const DEFAULT_EVENT_SLUG = "adobe-eu-2026";

// --- client supabase-js v2 (CDN, caricato nell'HTML) -----------------
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
  realtime: { params: { eventsPerSecond: 5 } },
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

// =====================================================================
// EVENTO CORRENTE
// =====================================================================
function getEventSlug(){
  const p = new URLSearchParams(location.search);
  return (p.get('event') || DEFAULT_EVENT_SLUG).trim();
}
let _eventCache = null;
async function getEvent(force){
  if(_eventCache && !force) return _eventCache;
  try{
    const { data, error } = await sb.from('events')
      .select('*').eq('slug', getEventSlug()).maybeSingle();
    if(error) throw error;
    _eventCache = data || null;
  }catch(e){ console.warn('getEvent:', e.message||e); _eventCache = null; }
  return _eventCache;
}
async function getEventId(){ const e = await getEvent(); return e ? e.id : null; }

// =====================================================================
// DATA LAYER legacy (retro-compatibile: index/dashboard/recap)
// Ora le risposte sono filtrate per evento; degrada se lo schema
// multi-evento non è ancora stato applicato.
// =====================================================================
const Store = {
  async read(){
    const eid = await getEventId();
    let q = sb.from('responses').select('*').order('created_at', { ascending: true });
    if(eid) q = q.eq('event_id', eid);
    const { data, error } = await q;
    if(error){ console.error('read', error); return []; }
    return data || [];
  },
  async append(entry){
    const eid = await getEventId();
    const row = {
      q1: entry.q1 ?? null,
      q2: entry.q2 ?? null,
      q3: entry.q3 ?? [],
      q4: entry.q4 ?? null,
      ratings: entry.ratings ?? {},
      quote: entry.quote || null,
      name: entry.name || null,
      email: entry.email || null,
      company: entry.company || null,
      cap_note: entry.capNote || null,
      materials: !!entry.materials,
      social: !!entry.social
    };
    if(eid) row.event_id = eid;       // omesso se lo schema non è ancora migrato
    const { error } = await sb.from('responses').insert(row);
    if(error){ console.error('append', error); return false; }
    return true;
  }
};

// --- REALTIME: cb() ad ogni insert/update su una tabella -------------
function subscribe(cb, table){
  return sb.channel((table||'responses')+'-live')
    .on('postgres_changes',
        { event: '*', schema: 'public', table: table || 'responses' },
        () => cb())
    .subscribe();
}

// --- MODERAZIONE (gated via Supabase Auth, vedi 04_auth_storage.sql) --
async function setApproved(id, val){
  const { error } = await sb.rpc('moderate_set_approved', { p_id:id, p_approved:val });
  if(error){ console.error('approve', error); alert('Errore moderazione: '+(error.message||'')); return false; }
  return true;
}
async function setHidden(id, val){
  const { error } = await sb.rpc('moderate_set_hidden', { p_id:id, p_hidden:val });
  if(error){ console.error('hide', error); alert('Errore moderazione: '+(error.message||'')); return false; }
  return true;
}

// =====================================================================
// LIVE PULSE API — usata da recap.html (lettura) e admin.html (CMS)
// =====================================================================
const LP = {
  // ----- auth -----
  auth: {
    // login principale: email + password (nessuna email inviata)
    async signInPassword(email, password){
      return sb.auth.signInWithPassword({ email, password });
    },
    // magic-link: fallback opzionale (richiede consegna email funzionante)
    async signIn(email){
      const redirect = location.href.split('#')[0];
      return sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } });
    },
    // reset password: opzionale, richiede SMTP configurato
    async resetPassword(email){
      const redirect = location.href.split('#')[0];
      return sb.auth.resetPasswordForEmail(email, { redirectTo: redirect });
    },
    async signOut(){ return sb.auth.signOut(); },
    async user(){ return (await sb.auth.getUser()).data.user || null; },
    async isModerator(){
      try{ const { data, error } = await sb.rpc('is_moderator'); if(error) throw error; return !!data; }
      catch(e){ return false; }
    },
    onChange(cb){ return sb.auth.onAuthStateChange((_e, session)=>cb(session)); }
  },

  // ----- storage -----
  storage: {
    publicUrl(path){
      return sb.storage.from(ASSET_BUCKET).getPublicUrl(path).data.publicUrl;
    },
    async upload(path, fileOrBlob, opts){
      const o = Object.assign({ upsert:true, cacheControl:'3600' }, opts||{});
      if(fileOrBlob && fileOrBlob.type) o.contentType = fileOrBlob.type;
      const { error } = await sb.storage.from(ASSET_BUCKET).upload(path, fileOrBlob, o);
      if(error) throw error;
      return LP.storage.publicUrl(path);
    },
    // carica molti file (es. unzip microsite) preservando i path relativi.
    // files: [{ path:'journey_v5/...', blob:Blob }]  -> onProgress(done,total)
    async uploadMany(prefix, files, onProgress){
      let done = 0;
      for(const f of files){
        const full = prefix.replace(/\/$/,'') + '/' + f.path.replace(/^\//,'');
        const o = { upsert:true, cacheControl:'3600' };
        if(f.blob && f.blob.type) o.contentType = f.blob.type;
        const { error } = await sb.storage.from(ASSET_BUCKET).upload(full, f.blob, o);
        if(error) throw new Error(f.path + ': ' + error.message);
        done++; if(onProgress) onProgress(done, files.length);
      }
      return done;
    },
    async remove(paths){
      const { error } = await sb.storage.from(ASSET_BUCKET).remove([].concat(paths));
      if(error) throw error;
    }
  },

  // ----- events -----
  events: {
    get: getEvent,
    slug: getEventSlug,
    async list(){
      const { data, error } = await sb.from('events').select('*').order('event_date',{ascending:false});
      if(error){ console.error(error); return []; }
      return data||[];
    },
    async save(id, patch){
      const { error } = await sb.from('events').update(patch).eq('id', id);
      if(error) throw error; _eventCache = null;
    },
    async create(row){
      const { data, error } = await sb.from('events').insert(row).select().single();
      if(error) throw error; return data;
    },
    // duplica evento: clona branding + sezioni (NON i contenuti pesanti)
    async duplicate(srcId, newSlug, newName){
      const { data: src, error: e1 } = await sb.from('events').select('*').eq('id', srcId).single();
      if(e1) throw e1;
      const created = await LP.events.create({
        slug:newSlug, name:newName||('Copia di '+src.name), subtitle:src.subtitle,
        location:src.location, config:src.config, status:'draft'
      });
      const secs = await LP.sections.list(srcId);
      if(secs.length){
        const clones = secs.map(s=>({ event_id:created.id, key:s.key, title:s.title,
          visible:s.visible, auto_hide:s.auto_hide, sort_order:s.sort_order, config:s.config }));
        const { error } = await sb.from('recap_sections').insert(clones);
        if(error) throw error;
      }
      return created;
    }
  },

  // ----- recap_sections -----
  sections: {
    async list(eventId){
      const { data, error } = await sb.from('recap_sections')
        .select('*').eq('event_id', eventId).order('sort_order',{ascending:true});
      if(error){ console.error(error); return []; }
      return data||[];
    },
    async save(id, patch){
      const { error } = await sb.from('recap_sections').update(patch).eq('id', id);
      if(error) throw error;
    }
  },

  // ----- materials -----
  materials: {
    async list(eventId, opts){
      let q = sb.from('materials').select('*').eq('event_id', eventId).order('sort_order',{ascending:true});
      if(opts && opts.publishedOnly) q = q.eq('published', true);
      const { data, error } = await q;
      if(error){ console.error(error); return []; }
      return data||[];
    },
    async create(row){ const { data, error } = await sb.from('materials').insert(row).select().single(); if(error) throw error; return data; },
    async update(id, patch){ const { error } = await sb.from('materials').update(patch).eq('id', id); if(error) throw error; },
    async remove(id){ const { error } = await sb.from('materials').delete().eq('id', id); if(error) throw error; },
    async click(id){ try{ await sb.rpc('material_click', { p_id:id }); }catch(e){} }
  },

  // ----- microsites -----
  microsites: {
    async list(eventId, opts){
      let q = sb.from('microsites').select('*').eq('event_id', eventId).order('created_at',{ascending:false});
      if(opts && opts.publishedOnly) q = q.eq('published', true);
      const { data, error } = await q;
      if(error){ console.error(error); return []; }
      return data||[];
    },
    async create(row){ const { data, error } = await sb.from('microsites').insert(row).select().single(); if(error) throw error; return data; },
    async update(id, patch){ const { error } = await sb.from('microsites').update(patch).eq('id', id); if(error) throw error; },
    async remove(id){ const { error } = await sb.from('microsites').delete().eq('id', id); if(error) throw error; }
  },

  // ----- photos -----
  photos: {
    async list(eventId, opts){
      let q = sb.from('event_photos').select('*').eq('event_id', eventId).order('sort_order',{ascending:true});
      if(opts && opts.publishedOnly) q = q.eq('published', true);
      const { data, error } = await q;
      if(error){ console.error(error); return []; }
      return data||[];
    },
    async create(row){ const { data, error } = await sb.from('event_photos').insert(row).select().single(); if(error) throw error; return data; },
    async update(id, patch){ const { error } = await sb.from('event_photos').update(patch).eq('id', id); if(error) throw error; },
    async remove(id){ const { error } = await sb.from('event_photos').delete().eq('id', id); if(error) throw error; }
  },

  // ----- lead (contatti che hanno chiesto i materiali) -----
  leads: {
    async list(eventId){
      const { data, error } = await sb.from('responses')
        .select('name,email,company,created_at')
        .eq('event_id', eventId).eq('materials', true).not('email','is',null)
        .order('created_at',{ascending:true});
      if(error){ console.error(error); return []; }
      return data||[];
    }
  }
};
