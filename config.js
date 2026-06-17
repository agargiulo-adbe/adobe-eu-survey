// =====================================================================
// ADOBE · E&U — Config condivisa (incolla le TUE credenziali)
// Stesso file referenziato da index/dashboard/admin/recap .html
// =====================================================================

// >>> 1. INCOLLA QUI  (Supabase > Project Settings > API) <<<
const SUPABASE_URL  = "https://vqtslejptdpafidbiyuv.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxdHNsZWpwdGRwYWZpZGJpeXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2OTY3MDEsImV4cCI6MjA5NzI3MjcwMX0.-rCleuBvGe-NxbEyU4tWdK-XhKJ2zsMEpaKP_uzh2do";   // anon public key

// >>> 2. La password admin NON sta qui (repo pubblico!). 
//        Vive solo nella funzione SQL (02_admin_moderation.sql) e viene
//        digitata in admin.html ad ogni sessione. <<<
let ADMIN_PWD = "";   // riempita a runtime dal gate di admin.html

// >>> URL pubblico della survey (per il QR sul palco). Lascia vuoto per QR decorativo. <<<
const SURVEY_URL = "";   // es. "https://tuo-utente.github.io/adobe-eu-survey/"

// --- client (supabase-js v2 via CDN, caricato nell'HTML) -------------
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
  realtime: { params: { eventsPerSecond: 5 } }
});

// =====================================================================
// DATA LAYER — sostituisce il vecchio oggetto Store (window.storage)
// =====================================================================
const Store = {
  // legge tutte le righe visibili (hidden=false grazie alla RLS)
  async read(){
    const { data, error } = await sb
      .from('responses').select('*')
      .order('created_at', { ascending: true });
    if(error){ console.error('read', error); return []; }
    return data || [];
  },

  // inserisce una risposta dalla survey (approved/hidden forzati a false dalla RLS)
  async append(entry){
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
    const { error } = await sb.from('responses').insert(row);
    if(error){ console.error('append', error); return false; }
    return true;
  }
};

// --- REALTIME: richiama cb() ad ogni insert/update -------------------
function subscribe(cb){
  return sb.channel('responses-live')
    .on('postgres_changes',
        { event: '*', schema: 'public', table: 'responses' },
        () => cb())
    .subscribe();
}

// --- MODERAZIONE (solo admin.html) -----------------------------------
async function setApproved(id, val){
  const { error } = await sb.rpc('moderate_set_approved',
    { p_id:id, p_approved:val, p_pwd:ADMIN_PWD });
  if(error){ console.error('approve', error); alert('Errore moderazione'); return false; }
  return true;
}
async function setHidden(id, val){
  const { error } = await sb.rpc('moderate_set_hidden',
    { p_id:id, p_hidden:val, p_pwd:ADMIN_PWD });
  if(error){ console.error('hide', error); alert('Errore moderazione'); return false; }
  return true;
}
