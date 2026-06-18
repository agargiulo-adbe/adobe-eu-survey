# Live Pulse — Report di debug end-to-end (2026-06-18)

Verifica completa del backend e di tutte le funzioni della console, contro il progetto
Supabase live (`vqtslejptdpafidbiyuv`), con sessione moderatore reale (`agargiulo@adobe.com`).

## 1. Verifica accesso (auth + RLS)

| Check | Esito |
|------|------|
| `signInWithPassword` (email+password) | ✅ 200 |
| `is_moderator()` con JWT moderatore | ✅ `true` |
| Scrittura su Storage autenticata | ✅ 200 |
| Scrittura su tabelle da **anon** (deve fallire) | ✅ 401/403 (RLS ok) |
| Insert `responses` da **anon** (path survey reale) | ✅ 201 |
| `moderate_set_approved` / `moderate_set_hidden` | ✅ 204, riga → `approved:true` |

## 2. Harness funzioni `LP.*` (31/31 PASS dopo isolamento)

Testate con dati temporanei e cleanup a cascata (FK `on delete cascade`):
`events` (list/get/create/save/duplicate), `recap_sections` (list/insert/save),
`materials` (create/update/click/remove + `material_click` RPC, `click_count` +1),
`microsites` (create/update/remove), `event_photos` (create/update/remove),
`leads.list`, `Store.read/append`, `storage.upload/publicUrl/remove`, `moderate_*`,
`moderate_wipe_all` (scoped per evento). Tutte ✅.

> I 4 "fail" iniziali erano un artefatto del test: l'insert di `responses` fatto come
> utente **autenticato** (moderatore) è respinto perché la policy survey è per ruolo
> `anon`. Path reale anon → 201 ✅. Vedi gap G6.

## 3. Bug trovati e risolti

| # | Problema | Causa | Fix |
|---|----------|-------|-----|
| **G1** | Microsite (zip) caricato ma **non visualizzabile** | Supabase Storage serve i file `.html` come `text/plain` con `nosniff` (misura anti-XSS sul dominio `*.supabase.co`). L'iframe mostrava il sorgente. | `recap.html`/`admin.html`: l'HTML del microsite viene **scaricato, iniettato con `<base href>` verso lo Storage e caricato via Blob `text/html`**. CSS/JS/SVG/PNG/MP4 sono già serviti col MIME corretto. |
| **G2** | Tutti i file dello zip salvati come `text/plain` | I blob estratti da JSZip non hanno `type`, e senza `contentType` Storage default a `text/plain`. | `config.js`: `LP.storage.mime(name)` deduce il MIME dall'estensione; usato in `upload()`/`uploadMany()`. |
| **G3** | File **orfani** su Storage all'eliminazione | `materials/microsites/photos.remove` cancellavano solo la riga DB. | `LP.storage.pathFromUrl()` + `removePrefix()` (ricorsivo); i delete in `admin.html` rimuovono anche i file. |
| **G4** | File Office salvati come `octet-stream` | MIME mancanti. | Aggiunti `doc/docx/xls/xlsx/ppt/pptx` alla mappa MIME. |
| **G6** | Survey non inviabile con **sessione moderatore attiva** | La policy insert di `responses` è per ruolo `anon`; un moderatore loggato invia come `authenticated` → 403. | `sql/05_fixes.sql`: policy insert per `authenticated` (senza auto-approvazione). |

Tutti i fix verificati: `removePrefix` elimina ricorsivamente strutture annidate (3/3 → 0),
microsite ripubblicato su path pulito e **70 file orfani del vecchio prefix rimossi**.

## 4. Comportamenti confermati corretti (non bug)

- **SVG** servito `image/svg+xml`, **PDF** `application/pdf` → anteprime e icone microsite OK
  (solo l'HTML subisce il declassamento a `text/plain`).
- RLS: lettura pubblica solo dei record `published`; scrittura solo moderatori.
- `moderate_wipe_all` è **scoped per evento** (`p_event`), non cancella altri eventi.

## 5. Gap minori noti (accettati, non bloccanti)

- L'accent color per-evento sovrascrive `--adobe-red` ma non il gradiente `--grad` (cosmetico).
- Upload di zip molto pesanti (video) = JSZip in-browser + upload sequenziale: può essere lento.
- Liste materiali/foto senza paginazione (adeguato alla scala di un evento).
- "Apri in nuova scheda" del microsite usa un URL `blob:` (non condivisibile come link).

## 6. Azione richiesta all'utente

Eseguire **`sql/05_fixes.sql`** nell'SQL Editor di Supabase (fix G6). Tutto il resto è già
attivo (codice) o già applicato sul backend (ripubblicazione microsite + cleanup).
