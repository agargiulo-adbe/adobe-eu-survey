-- =====================================================================
-- LIVE PULSE · 04 — Supabase Auth (moderatori) + Storage + RLS
-- =====================================================================
-- Da eseguire DOPO 03_events_content.sql.
--
-- Sostituisce la "password condivisa" con account reali Supabase Auth:
--   • i moderatori entrano con EMAIL + PASSWORD (nessuna email inviata)
--   • la tabella `moderators` è l'allowlist di chi può scrivere
--   • RLS: lettura pubblica dei soli contenuti `published`, scrittura ai moderatori
--   • Storage bucket `event-assets`: lettura pubblica, upload solo moderatori
--
-- PREREQUISITO dashboard Supabase (una tantum, non SQL):
--   Authentication > Users > Add user  -> crea l'utente moderatore con una
--     password e "Auto Confirm User" = ON (così il login NON richiede email).
--   L'email dell'utente deve coincidere con una riga in `moderators` (sotto).
--   (Magic-link / SMTP / Redirect URL servono SOLO per l'eventuale reset password.)
-- =====================================================================

-- ---------------------------------------------------------------------
-- MODERATORI (allowlist) + helper is_moderator()
-- ---------------------------------------------------------------------
create table if not exists public.moderators (
  email      text primary key,
  name       text,
  role       text not null default 'moderator' check (role in ('moderator','admin','super_admin')),
  created_at timestamptz not null default now()
);
-- compat: aggiunge role se la tabella esisteva già senza la colonna
alter table public.moderators add column if not exists role text not null default 'moderator';

-- Moderatore / admin / super_admin (modifica/aggiungi pure altre email qui).
insert into public.moderators (email, name, role)
values ('agargiulo@adobe.com', 'Antonio Argiulo', 'super_admin')
on conflict (email) do update set name = excluded.name, role = excluded.role;

-- True se l'utente JWT corrente è un moderatore in allowlist.
-- SECURITY DEFINER per poter leggere `moderators` aggirando la sua RLS.
create or replace function public.is_moderator()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.moderators m
    where lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

alter table public.moderators enable row level security;
drop policy if exists moderators_self_read on public.moderators;
create policy moderators_self_read on public.moderators
  for select using (public.is_moderator());

-- ---------------------------------------------------------------------
-- RLS sulle tabelle di contenuto
--   lettura: pubblica per i record "published"; moderatori vedono tutto
--   scrittura: solo moderatori
-- ---------------------------------------------------------------------

-- EVENTS
alter table public.events enable row level security;
drop policy if exists events_public_read on public.events;
create policy events_public_read on public.events
  for select using (status = 'published' or public.is_moderator());
drop policy if exists events_mod_write on public.events;
create policy events_mod_write on public.events
  for all using (public.is_moderator()) with check (public.is_moderator());

-- RECAP_SECTIONS (non sensibili: lettura sempre consentita; scrittura moderatori)
alter table public.recap_sections enable row level security;
drop policy if exists sections_public_read on public.recap_sections;
create policy sections_public_read on public.recap_sections
  for select using (true);
drop policy if exists sections_mod_write on public.recap_sections;
create policy sections_mod_write on public.recap_sections
  for all using (public.is_moderator()) with check (public.is_moderator());

-- MATERIALS
alter table public.materials enable row level security;
drop policy if exists materials_public_read on public.materials;
create policy materials_public_read on public.materials
  for select using (published or public.is_moderator());
drop policy if exists materials_mod_write on public.materials;
create policy materials_mod_write on public.materials
  for all using (public.is_moderator()) with check (public.is_moderator());

-- MICROSITES
alter table public.microsites enable row level security;
drop policy if exists microsites_public_read on public.microsites;
create policy microsites_public_read on public.microsites
  for select using (published or public.is_moderator());
drop policy if exists microsites_mod_write on public.microsites;
create policy microsites_mod_write on public.microsites
  for all using (public.is_moderator()) with check (public.is_moderator());

-- EVENT_PHOTOS
alter table public.event_photos enable row level security;
drop policy if exists photos_public_read on public.event_photos;
create policy photos_public_read on public.event_photos
  for select using (published or public.is_moderator());
drop policy if exists photos_mod_write on public.event_photos;
create policy photos_mod_write on public.event_photos
  for all using (public.is_moderator()) with check (public.is_moderator());

-- RESPONSES — i moderatori devono vedere anche hidden/non-approvate e le email (lead).
-- (Le policy anon di 01/02 restano: insert pubblico + select dei record visibili.)
alter table public.responses enable row level security;
drop policy if exists responses_mod_read on public.responses;
create policy responses_mod_read on public.responses
  for select using (public.is_moderator());

-- ---------------------------------------------------------------------
-- MODERAZIONE — riscrittura su Auth (niente più p_pwd)
-- ---------------------------------------------------------------------
drop function if exists public.moderate_set_approved(uuid, boolean, text);
drop function if exists public.moderate_set_hidden(uuid, boolean, text);
drop function if exists public.moderate_wipe_all(text, text);

create or replace function public.moderate_set_approved(p_id uuid, p_approved boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'unauthorized'; end if;
  update public.responses set approved = p_approved where id = p_id;
end $$;

create or replace function public.moderate_set_hidden(p_id uuid, p_hidden boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator() then raise exception 'unauthorized'; end if;
  update public.responses set hidden = p_hidden where id = p_id;
end $$;

-- Azzera le risposte di UN evento (default: evento corrente). Richiede conferma 'CANCELLA'.
create or replace function public.moderate_wipe_all(p_confirm text, p_event uuid default '11111111-1111-4111-8111-111111111111')
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if not public.is_moderator() then raise exception 'unauthorized'; end if;
  if coalesce(p_confirm,'') <> 'CANCELLA' then raise exception 'confirm_required'; end if;
  delete from public.responses where event_id = p_event;
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- STORAGE — bucket pubblico per gli asset degli eventi
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('event-assets', 'event-assets', true)
on conflict (id) do update set public = true;

-- lettura pubblica
drop policy if exists eventassets_public_read on storage.objects;
create policy eventassets_public_read on storage.objects
  for select using (bucket_id = 'event-assets');

-- scrittura (upload/update/delete) solo moderatori
drop policy if exists eventassets_mod_insert on storage.objects;
create policy eventassets_mod_insert on storage.objects
  for insert with check (bucket_id = 'event-assets' and public.is_moderator());
drop policy if exists eventassets_mod_update on storage.objects;
create policy eventassets_mod_update on storage.objects
  for update using (bucket_id = 'event-assets' and public.is_moderator());
drop policy if exists eventassets_mod_delete on storage.objects;
create policy eventassets_mod_delete on storage.objects
  for delete using (bucket_id = 'event-assets' and public.is_moderator());

-- =====================================================================
-- Fatto. Ricorda di abilitare il provider Email (magic-link) e di
-- inserire l'URL di admin.html tra i Redirect URL consentiti.
-- =====================================================================
