# Live Pulse — Project Context

> Documento di contesto vivo del progetto. Mantiene **architettura, feature, decisioni,
> asset e task** in un unico posto, per onboarding rapido e continuità tra sessioni.
> Ultimo aggiornamento: **2026-06-24**.
>
> Doc collegati: [`README.md`](../README.md) (setup operativo) · [`docs/DEBUG-REPORT.md`](DEBUG-REPORT.md) (debug auth/storage end-to-end).

---

## 1. Cos'è

**Live Pulse** è un sistema di *event experience* per Adobe (vertical **Energy & Utilities**):

1. **Survey live in sala** — il pubblico risponde da mobile via QR.
2. **Dashboard a palco** — slideshow 16:9 che mostra i risultati **in tempo reale**.
3. **Recap pubblico post-evento** — landing data-driven condivisibile dopo l'evento.
4. **Console CMS** — moderatori gestiscono eventi e contenuti **senza scrivere codice**.

Tutto **statico** (HTML + JS vanilla, niente build né framework) con backend **Supabase**.
Ingegnerizzato **multi-evento**: un nuovo evento = una riga nel DB + contenuti caricati
dalla console. Evento di riferimento attuale: slug **`adobe-eu-2026`** (Milano, 18 giu 2026).

---

## 2. URL pubblici (GitHub Pages)

Base: `https://agargiulo-adbe.github.io/adobe-eu-survey/`

| Superficie | URL |
|------------|-----|
| Survey (mobile) | `/` (`index.html`) |
| Dashboard palco | `/dashboard.html` |
| Recap pubblico | `/recap.html?event=<slug>` |
| Console CMS | `/admin.html` |
| Generatore QR | `/make_qr.html` |
| Journey microsite | `/journey/` |

Deploy: push su **`main`** → Pages ribuilda in 1-2 min (root del branch).

---

## 3. Mappa del repository

```
index.html          Survey mobile (phone 430px), 6 step, scrive su Supabase
dashboard.html      Slideshow 16:9 a palco, 5 viste, realtime
recap.html          Landing recap pubblica, data-driven, realtime
admin.html          Console CMS (login email+password)
make_qr.html        Generatore QR
config.js           Data layer condiviso: LP, Store, subscribe(), Auth, Storage
README.md           Setup Supabase + Pages + uso console
docs/
  PROJECT-CONTEXT.md  questo file
  DEBUG-REPORT.md     debug end-to-end auth/storage/RLS
sql/
  03_events_content.sql   schema multi-evento + contenuti + seed adobe-eu-2026
  04_auth_storage.sql     Auth, moderators, RLS, bucket Storage
  05_fixes.sql            policy insert survey per utenti autenticati
journey/            Microsite "journey interattiva" (deck end-to-end) + asset (~88MB)
Infrastruttura-Attenzione.pdf   Keynote scaricabile dal recap
— asset marketing (vedi §10) —
dashboard-recap.gif      GIF 5 viste dashboard (dati live)
survey-fill.gif / .mp4   Demo compilazione survey (no submit)
email-pack-scroll.gif / .mp4   Scroll del PDF delle due email
```

> Nota: `sql/01_*` e `sql/02_admin_moderation.sql` sono citati dal README come schema base
> ma **non presenti nel repo** (eseguiti direttamente sul progetto Supabase). Vedi §11 task.

---

## 4. Architettura

- **Frontend**: HTML/CSS/JS vanilla. Font Source Sans 3. Nessun bundler.
- **Backend**: Supabase → Postgres + Realtime + Storage + Auth.
- **Realtime**: `subscribe(cb, table)` in `config.js` apre un channel Supabase; dashboard e
  recap si aggiornano senza refresh quando cambiano `responses` / contenuti.
- **Sicurezza**: l'**anon key** in `config.js` è pubblica per design; ogni scrittura è
  protetta da **RLS + Auth**. Le scritture su DB/Storage sono riservate ai moderatori
  (`is_moderator()`), tranne l'insert delle risposte survey (utenti autenticati anon).

### Schema dati (tabelle)

| Tabella | Ruolo |
|---------|-------|
| `events` | un record per evento: branding, date, stato bozza/pubblicato |
| `recap_sections` | sezioni del recap: visibilità, titolo, auto-hide, ordine |
| `materials` | PDF/doc/immagini/video/link; preview, click count, ordine |
| `microsites` | microsite HTML (journey) scompattati su Storage |
| `event_photos` | foto evento con didascalie e ordine |
| `responses` | risposte survey, con `event_id` |
| `moderators` | allowlist email + ruolo (`super_admin` / `moderator`) |

### Storage

- Bucket pubblico **`event-assets`**, namespace per evento:
  `<slug>/materials/…`, `<slug>/photos/…`, `<slug>/microsites/<id>/…`.
- MIME dedotto dall'estensione (`LP.storage.mime`) perché i blob da JSZip non hanno `type`.
- Cleanup: eliminando un asset si rimuovono anche i file su Storage (niente orfani).

### Auth

- Login **email + password** (no magic-link: il default SMTP Supabase non consegna ai
  domini corporate `@adobe.com`). `Auto Confirm User = ON` in Supabase.
- L'email deve essere anche in `moderators`. Seed: `agargiulo@adobe.com` (`super_admin`).

---

## 5. Le quattro superfici

### Survey — `index.html`
Form mobile (container `.phone`, max 430px). Step in `const steps=[...]`, navigati da
`#mainBtn` → `nextStep()`. Marketata come "5 domande, < 1 min"; tecnicamente 6 step
(progress "Domanda X di 6"), di cui l'ultimo opzionale (identità).

| Step | ID | Tipo | Contenuto |
|------|----|------|-----------|
| 0 | `s-welcome` | — | Hero "Accendi il volano della CX" |
| 1 | `s-q1` | single | Fase del journey più rilevante (Planning, Creation, Asset, Audience, Delivery) |
| 2 | `s-q2` | scala 1-5 | Maturità CX (con caption `MAT_CAP`) |
| 3 | `s-q3` | multi (max 2) + nota | Capability/obiettivo (mappa a prodotti Adobe) + `#capNote` |
| 4 | `s-q4` | single | Ruolo (Marketing&CX, Digital&IT, Data&Analytics, Leadership) |
| 5 | `s-q5rate` | stelle | Voto 4 interventi (keynote, sfide, ideazione, solutions) |
| 6 | `s-q6` | testo + consensi | Quote + nome/email/azienda + switch consensi (materiali, social) |

**Entry scritta** (`submit()` → `Store.append`):
```js
{ ts, q1, q2:int|null, q3:[], q4, ratings:{keynote,sfide,ideazione,solutions},
  quote|null, name|null, email|null (solo se consent.materials), company|null,
  capNote|null, social:bool, materials:bool }
```
`skipFinal()` invia senza identità/consensi. Schermata finale `s-thanks` con conteggio.

### Dashboard — `dashboard.html`
Slideshow 16:9 (`.screen169`), auto-rotate (`restartRotate`, `DASH_MS`), nav `dashNav()` /
`dashGo(i)`, dots. `DASH_VIEWS` viste; `renderDash()` ogni 15s.

| View | `data-view` | Contenuto |
|------|-------------|-----------|
| 0 | Partecipa | Maxi QR per rispondere (CTA live) |
| 1 | Live pulse | KPI: risposte, maturità media, tema #1, quote, voto medio |
| 2 | Fasi | Barre: quale fase del journey conta di più |
| 3 | Temi | Barre: aree/temi più richiesti |
| 4 | Quote + voti | Testimonianze dal vivo + voto medio interventi |

### Recap — `recap.html`
Landing pubblica `?event=<slug>`, data-driven dal DB, **realtime**. Sezioni: scorecard,
"Chi era in sala", maturità, cover Journey, materiali (con anteprima PDF), foto,
testimonianze (solo consenso social). Auto-hide sezioni vuote.

### Console CMS — `admin.html`
Login moderatore. Tab: **Evento** (branding, KPI, stato, duplica) · **Sezioni** ·
**Materiali** (upload Storage, preview, click count) · **Journey** (upload .zip microsite,
JSZip → Storage) · **Foto** · **Testimonianze** (moderazione: palco / recap social) ·
**Lead** (export CSV). Modifiche pubblicate → realtime sul recap.

---

## 6. API condivisa — `config.js`

- `LP` — namespace principale:
  - `LP.auth` — sign in/out email+password, sessione persistente.
  - `LP.storage` — `mime(path)`, upload con contentType, `pathFromUrl` / `removePrefix` (cleanup).
  - `LP.pdfjs()` / `LP._pdfjs` — caricamento pigro di PDF.js per miniature + viewer.
- `Store` — `append(entry)` (aggiunge `event_id`), `read()`.
- `subscribe(cb, table)` — channel realtime Supabase.

---

## 7. Decisioni tecniche / gotchas

- **Microsite HTML su Storage**: Supabase serve `.html` come `text/plain`. Il recap **non**
  punta l'iframe all'URL Storage: scarica l'HTML, inietta `<base href>` e lo carica come
  **Blob `text/html`** (asset serviti col MIME corretto). Stessa tecnica nella preview console.
- **Anteprima PDF**: miniatura della 1ª pagina generata all'upload con PDF.js (`meta.thumb`);
  clic → **viewer PDF.js** scroll-continuo (zoom/download), funziona su mobile dove l'iframe
  nativo PDF resta vuoto.
- **MIME upload**: i blob da JSZip non hanno `type` → MIME dedotto dall'estensione.
- **Auth corporate**: password invece di magic-link per i domini `@adobe.com`.
- **Bug fix storico**: collisione classe `.lead` nei grafici risolta con componente `.barc`
  (commit `3423ddd`).

---

## 8. Workflow nuovo evento

1. Console → **Evento → Duplica** (clona branding + sezioni) **oppure** *+ Evento*.
2. Carica materiali / foto / microsite, pubblica le sezioni.
3. Condividi `recap.html?event=<nuovo-slug>` (QR dalla tab Evento).

Zero deploy, zero codice.

---

## 9. Sviluppo locale & deploy

```bash
# locale
python3 -m http.server 8799      # → http://localhost:8799/recap.html | /admin.html
# deploy
git add -A && git commit -m "…" && git push origin main   # Pages ribuilda in 1-2 min
```

---

## 10. Asset marketing & comunicazione

Asset prodotti a corredo dell'evento (parte nel repo, parte in `~/Downloads`).

**Email (template `.emltpl`, MIME con corpo HTML base64)** — in `~/Downloads`:
- `Orchestrare la CX con l'AI — il recap da Milano_v3.emltpl` (IT) — corretti: spazio in
  eccesso, bordo CTA arrotondato (rimosso bg rettangolare dello `<span>`), firma Rosa.
- `Adobe × E&U — Event Follow-up.emltpl` (IT) · `Adobe × E&U — Event Recap.emltpl` (EN).
- `Adobe × E&U — Event Email Pack.pdf` — le due email renderizzate in **un unico PDF** (2 pagine).

**GIF / video (nel repo)**:
- `dashboard-recap.gif` — 5 viste dashboard, dati live, 600×338, loop.
- `survey-fill.gif` / `.mp4` — demo compilazione survey **senza submit** (cursore + typing).
- `email-pack-scroll.gif` / `.mp4` — scroll verticale del PDF delle email, loop.

### Pipeline di generazione asset (riusabile)
Strumenti: **Playwright** (Chromium headless), **ffmpeg**, **gifsicle**, **poppler**
(`pdftoppm`, `pdfunite`). Playwright è in cache npx:
`/Users/agargiulo/.npm/_npx/<hash>/node_modules/playwright` → richiamare con path assoluto.

- **`.emltpl` → HTML**: il corpo è MIME multipart; estrarre la parte `text/html`
  (base64) e decodificarla. Per ri-scrivere: editare l'HTML, ri-encodare base64 a 76
  col + CRLF, re-splice tra header e boundary.
- **HTML email → PDF**: render Chromium `page.pdf()` a pagina unica alta quanto il
  contenuto (`scrollHeight`) per evitare tagli; merge con `pdfunite`.
- **Pagina live → GIF**: screenshot/registrazione, poi ffmpeg `palettegen`+`paletteuse`.
  GIF pesanti → `dither=none` + `gifsicle -O3 --lossy`. Per scroll/demo lunghe preferire
  **MP4** (1/5 del peso). La dashboard si pilota via `dashGo(i)` disattivando l'auto-rotate.
- **Survey demo**: pilotare `index.html` (viewport 430px), cursore finto iniettato +
  `page.type` con delay; **non** chiamare submit (cur=6) per non scrivere su Supabase.

---

## 11. Stato & task aperti

- [ ] **Supabase non ancora deployato end-to-end** (vedi memoria progetto): eseguire in
  ordine `sql/03_events_content.sql` → `04_auth_storage.sql` → `05_fixes.sql`, creare
  utente moderatore (password, Auto Confirm ON) e verificare allowlist `moderators`.
- [ ] `sql/01_*` / `02_admin_moderation.sql` citati ma non versionati: recuperarli dal
  progetto Supabase e committarli per riproducibilità completa.
- [ ] Subject + preheader definitivi per l'email "Live Pulse" (sviluppo AI custom riusabile).
- [ ] Decidere versioni email-friendly delle GIF (< ~1MB) o passare a MP4 linkato.

---

## 12. Storia di sviluppo (milestone git)

| Commit | Milestone |
|--------|-----------|
| `8dc25bc` | Adobe E&U survey live (prima versione) |
| `c3fb81a` | CMS multi-evento per `recap.html` |
| `9561f5e` | README: setup Supabase, Pages, console, multi-evento |
| `c8340a1` | Auth admin → email+password (rimuove magic-link) |
| `9e20b0c` | Fix microsite (HTML text/plain) + cleanup Storage + debug end-to-end |
| `5044e91` | Anteprima PDF: miniatura card + viewer PDF.js mobile-safe |
| `3a4f74c` | Recap target-oriented: scorecard, "Chi era in sala", maturità, cover Journey |
| `3423ddd` | Fix barre grafici (collisione `.lead`) + `.barc` + 3 scorecard |
| `8f44221` | Deploy asset email recap: PDF keynote + journey microsite |
