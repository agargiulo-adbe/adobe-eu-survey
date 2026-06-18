-- =====================================================================
-- LIVE PULSE · 03 — Schema multi-evento + contenuti del recap
-- =====================================================================
-- Da eseguire sull'SQL Editor di Supabase DOPO 01_*.sql e 02_admin_moderation.sql.
-- Idempotente: si può rieseguire senza danni.
--
-- Obiettivo: rendere recap.html completamente data-driven e multi-evento.
--   events          -> un record per evento (hero, branding, KPI, stato)
--   recap_sections  -> visibilità / ordine / auto-hide delle sezioni del recap
--   materials       -> documenti, video, link (la grid "Materiali della giornata")
--   microsites      -> microsite HTML caricati da zip (la "journey" embeddata)
--   event_photos    -> foto della giornata
--   responses.event_id -> ogni risposta survey appartiene a un evento
-- =====================================================================

create extension if not exists pgcrypto;

-- ID fisso dell'evento corrente: serve come DEFAULT per responses.event_id
-- (così le righe storiche e le nuove restano legate a questo evento).
--   evento "adobe-eu-2026" = 11111111-1111-4111-8111-111111111111

-- ---------------------------------------------------------------------
-- helper: updated_at automatico
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- EVENTS
-- ---------------------------------------------------------------------
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  subtitle    text,
  event_date  date,
  location    text,
  config      jsonb not null default '{}'::jsonb,   -- accent, badge, KPI manuali, footer, lang...
  status      text  not null default 'draft' check (status in ('draft','published')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
drop trigger if exists trg_events_touch on public.events;
create trigger trg_events_touch before update on public.events
  for each row execute function public.touch_updated_at();

insert into public.events (id, slug, name, subtitle, event_date, location, config, status)
values (
  '11111111-1111-4111-8111-111111111111',
  'adobe-eu-2026',
  'Orchestrare la Customer Experience nel settore Energy & Utilities',
  'Una mattinata tra dati, contenuti e AI. Ecco cosa è emerso dalla voce di chi era in sala.',
  '2026-06-18',
  'Adobe Italia, Milano',
  jsonb_build_object(
    'accent',         '#EB1000',
    'badge',          '⚡ EVENT RECAP · 18 GIUGNO 2026',
    'stats_speakers', 5,
    'stats_phases',   7,
    'footer_contact', 'Michela Cimmino · mcimmino@adobe.com',
    'lang',           'it'
  ),
  'published'
) on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- RECAP_SECTIONS — orchestrazione sezioni (visibilità, ordine, auto-hide)
-- ---------------------------------------------------------------------
create table if not exists public.recap_sections (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  key        text not null,           -- hero|stats|topics|caps|ratings|quotes|materials|journey|photos
  title      text,
  visible    boolean not null default true,
  auto_hide  boolean not null default true,   -- se la sezione è vuota, nascondila
  sort_order int  not null default 0,
  config     jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (event_id, key)
);
drop trigger if exists trg_sections_touch on public.recap_sections;
create trigger trg_sections_touch before update on public.recap_sections
  for each row execute function public.touch_updated_at();

-- Seed delle sezioni per l'evento corrente (hero/stats non auto-hide).
insert into public.recap_sections (event_id, key, title, visible, auto_hide, sort_order)
values
  ('11111111-1111-4111-8111-111111111111','hero',     null,                              true, false, 10),
  ('11111111-1111-4111-8111-111111111111','stats',    null,                              true, false, 20),
  ('11111111-1111-4111-8111-111111111111','topics',   'Le fasi che vi hanno colpito di più', true, true, 30),
  ('11111111-1111-4111-8111-111111111111','caps',     'I temi più richiesti',            true, true,  40),
  ('11111111-1111-4111-8111-111111111111','ratings',  'Gli interventi più apprezzati',   true, true,  50),
  ('11111111-1111-4111-8111-111111111111','quotes',   'Le vostre parole',                true, true,  60),
  ('11111111-1111-4111-8111-111111111111','materials','Materiali della giornata',        true, true,  70),
  ('11111111-1111-4111-8111-111111111111','journey',  'Rivivi la journey',               true, true,  80),
  ('11111111-1111-4111-8111-111111111111','photos',   'Momenti della giornata',          true, true,  90)
on conflict (event_id, key) do nothing;

-- ---------------------------------------------------------------------
-- MATERIALS — documenti / video / link della grid materiali
-- ---------------------------------------------------------------------
create table if not exists public.materials (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  type        text not null check (type in ('pdf','doc','image','video','link')),
  title       text not null,
  description text,
  icon        text,                    -- emoji o nome icona (fallback per tipo)
  url         text not null,           -- storage path (bucket event-assets) oppure URL esterno
  is_external boolean not null default false,
  meta        jsonb not null default '{}'::jsonb,  -- size, mime, pages, provider (youtube/vimeo)...
  sort_order  int not null default 0,
  published   boolean not null default false,
  click_count int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_materials_event on public.materials(event_id, sort_order);
drop trigger if exists trg_materials_touch on public.materials;
create trigger trg_materials_touch before update on public.materials
  for each row execute function public.touch_updated_at();

-- Contatore click (chiamabile dal recap pubblico senza auth).
create or replace function public.material_click(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.materials set click_count = click_count + 1 where id = p_id;
$$;

-- ---------------------------------------------------------------------
-- MICROSITES — bundle HTML caricati da zip (la journey embeddata)
-- ---------------------------------------------------------------------
create table if not exists public.microsites (
  id             uuid primary key default gen_random_uuid(),
  event_id       uuid not null references public.events(id) on delete cascade,
  title          text not null,
  storage_prefix text not null,        -- es. adobe-eu-2026/microsites/<id>
  entry_path     text not null,        -- es. journey_v5/journey_v05.html (relativo al prefix)
  version        text,
  cover_path     text,                 -- screenshot/cover opzionale
  published      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_microsites_event on public.microsites(event_id);
drop trigger if exists trg_microsites_touch on public.microsites;
create trigger trg_microsites_touch before update on public.microsites
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- EVENT_PHOTOS — foto della giornata
-- ---------------------------------------------------------------------
create table if not exists public.event_photos (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  storage_path text not null,
  caption      text,
  sort_order   int not null default 0,
  published    boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists idx_photos_event on public.event_photos(event_id, sort_order);

-- ---------------------------------------------------------------------
-- RESPONSES.event_id — lega ogni risposta survey a un evento
-- ---------------------------------------------------------------------
alter table public.responses
  add column if not exists event_id uuid
  default '11111111-1111-4111-8111-111111111111'
  references public.events(id) on delete cascade;

-- backfill righe storiche all'evento corrente
update public.responses set event_id = '11111111-1111-4111-8111-111111111111'
where event_id is null;

create index if not exists idx_responses_event on public.responses(event_id);

-- =====================================================================
-- NOTA: le policy RLS per queste tabelle e per lo Storage sono in
--       04_auth_storage.sql (read pubblico dei record published,
--       write riservata ai moderatori autenticati via Supabase Auth).
-- =====================================================================
