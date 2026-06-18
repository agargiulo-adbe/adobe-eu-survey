-- =====================================================================
-- LIVE PULSE · 05 — Fix emersi dal debug end-to-end
-- =====================================================================
-- Da eseguire DOPO 04_auth_storage.sql. Idempotente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- FIX: invio survey con sessione autenticata attiva.
-- La policy di insert di `responses` (01/02) è pensata per il ruolo `anon`.
-- Se un moderatore è loggato (Supabase Auth) e apre la survey nello stesso
-- browser, l'insert avviene come ruolo `authenticated` e viene rifiutato (403).
-- Aggiungiamo una policy gemella per `authenticated`, SENZA permettere
-- l'auto-approvazione/occultamento (approved/hidden devono restare falsi).
-- ---------------------------------------------------------------------
drop policy if exists responses_auth_insert on public.responses;
create policy responses_auth_insert on public.responses
  for insert to authenticated
  with check (coalesce(approved,false) = false and coalesce(hidden,false) = false);

-- =====================================================================
-- Nota: i file HTML su Supabase Storage vengono serviti come text/plain
-- (misura di sicurezza del provider). Il recap aggira la cosa caricando
-- l'HTML del microsite via Blob con <base href> iniettato (vedi recap.html).
-- Nessuna azione SQL necessaria per questo: è gestito lato client.
-- =====================================================================
