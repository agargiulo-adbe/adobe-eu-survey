# Live Pulse

Sistema di **event experience** per Adobe: survey live in sala, dashboard a palco e
**recap pubblico post-evento** gestito da una console CMS — tutto statico (HTML + JS)
con backend **Supabase**, senza build né framework. Ingegnerizzato **multi-evento**:
un nuovo evento = una riga nel DB + contenuti caricati dalla console, **zero codice**.

## Pagine

| File | Ruolo | URL pubblico (Pages) |
|------|-------|----------------------|
| `index.html` | Survey (5 domande, mobile) | `.../adobe-eu-survey/` |
| `dashboard.html` | Slideshow 16:9 per il palco | `.../adobe-eu-survey/dashboard.html` |
| `recap.html` | Landing recap pubblica, data-driven | `.../adobe-eu-survey/recap.html?event=<slug>` |
| `admin.html` | **Console CMS** (login moderatori) | `.../adobe-eu-survey/admin.html` |
| `make_qr.html` | Generatore QR | `.../adobe-eu-survey/make_qr.html` |
| `config.js` | Data layer condiviso (`LP`, `Store`, Auth, Storage) | — |

## Architettura

- **Frontend**: HTML/CSS/JS vanilla. Font Source Sans 3. Realtime via Supabase channels.
- **Backend**: Supabase Postgres + Realtime + Storage + Auth.
  - Tabelle: `events`, `recap_sections`, `materials`, `microsites`, `event_photos`,
    `responses` (con `event_id`), `moderators`.
  - Storage: bucket pubblico `event-assets`, namespace per evento
    (`<slug>/materials/…`, `<slug>/photos/…`, `<slug>/microsites/<id>/…`).
  - Auth: **magic-link** email; scrittura su DB/Storage riservata ai moderatori via RLS.

## Setup Supabase (una tantum)

1. **SQL Editor** → esegui in ordine (idempotenti):
   - `sql/01_*.sql`, `sql/02_admin_moderation.sql` (schema base — già presenti sul progetto)
   - `sql/03_events_content.sql` (schema multi-evento + contenuti + seed evento `adobe-eu-2026`)
   - `sql/04_auth_storage.sql` (Auth, `moderators`, RLS, bucket Storage, moderazione)
   - `sql/05_fixes.sql` (policy insert survey per utenti autenticati — vedi [report di debug](docs/DEBUG-REPORT.md))
2. **Account moderatore** — il login è **Email + Password** (nessuna email inviata,
   indipendente dai filtri corporate). In **Authentication → Users → Add user**:
   - Email (es. `agargiulo@adobe.com`), una password, **Auto Confirm User = ON**.
3. **Allowlist** — l'email deve essere anche nella tabella `moderators` (già seedato
   `agargiulo@adobe.com`, role `super_admin`). Per aggiungerne altri:
   ```sql
   insert into public.moderators (email, name, role)
   values ('nome@adobe.com', 'Nome', 'moderator');
   ```
   poi creane l'utente con password (passo 2).

> **Magic-link / SMTP / Redirect URL** non servono per il login: sono opzionali e utili
> solo per l'eventuale *reset password* via email. Il provider di default Supabase
> spesso non consegna ai domini corporate (`@adobe.com`) — per questo usiamo le password.
>
> Le credenziali in `config.js` (URL + **anon key**) sono pubbliche per design:
> ogni scrittura è protetta da RLS + Auth.

## Deploy — GitHub Pages

Il sito è servito da Pages sul branch **`main`** (cartella root).

1. **Settings → Pages**: *Source* = `Deploy from a branch`, *Branch* = `main` / `/ (root)`.
2. Ogni `git push origin main` ribuilda il sito in 1-2 minuti.
3. URL base: `https://agargiulo-adbe.github.io/adobe-eu-survey/`.

```bash
git add -A
git commit -m "…"
git push origin main
```

## Uso della console (`admin.html`)

Login con **email + password** del moderatore. Tab disponibili:

- **Evento** — hero, sottotitolo, data, luogo, badge, accent color, KPI (speaker/fasi),
  contatto footer, stato bozza/pubblicato; link recap + QR; **Duplica evento**.
- **Sezioni** — visibilità, titolo, **auto-hide** (nascondi se vuota) e ordine.
- **Materiali** — upload PDF/doc/immagini su Storage; video/link via URL; preview,
  pubblica/nascondi, riordino, conteggio click.
- **Journey** — carica uno **.zip** con un microsite HTML (es. `journey_v5/journey_v05.html`):
  viene scompattato (JSZip), ospitato su Storage e mostrato nel recap in un viewer
  iframe navigabile + fullscreen.
- **Foto** — upload immagini, didascalie, riordino.
- **Testimonianze** — moderazione citazioni (approva → palco; consenso social → recap pubblico).
- **Lead** — contatti che hanno chiesto i materiali; export **CSV**.

Le modifiche pubblicate appaiono **in tempo reale** sul recap (nessun refresh).

## Nuovo evento

1. Console → **Evento → Duplica** (clona branding + sezioni) **oppure** *+ Evento*.
2. Carica materiali / foto / microsite e pubblica le sezioni.
3. Condividi `recap.html?event=<nuovo-slug>` (QR dalla tab Evento).

## Sviluppo locale

```bash
python3 -m http.server 8799
# poi http://localhost:8799/recap.html  /  /admin.html
```
Il login email+password funziona anche in locale senza configurazioni aggiuntive.

## Note tecniche

- **Microsite HTML su Storage**: Supabase serve i file `.html` come `text/plain` (sicurezza).
  Il recap quindi non punta l'iframe all'URL Storage: scarica l'HTML, inietta `<base href>`
  verso lo Storage e lo carica come **Blob `text/html`** (gli asset — css/js/svg/img/mp4 —
  sono serviti col MIME corretto). Stessa tecnica per l'anteprima nella console.
- **MIME upload**: i file caricati ricevono il `content-type` dedotto dall'estensione
  (`LP.storage.mime`), necessario perché i blob da JSZip non hanno `type`.
- **Cleanup Storage**: eliminando materiali/foto/microsite vengono rimossi anche i file su
  Storage (`LP.storage.pathFromUrl` / `removePrefix`), niente file orfani.
- **Auth**: login email+password; la tabella `moderators` autorizza le scritture via
  `is_moderator()` + RLS. Vedi il [report di debug end-to-end](docs/DEBUG-REPORT.md).
- **Anteprima PDF**: le card materiali mostrano una **miniatura** della prima pagina (generata
  all'upload con PDF.js, salvata in `meta.thumb`); il clic apre un **viewer PDF.js** a scroll
  continuo (zoom/download/nuova scheda) che funziona anche su mobile, dove l'iframe nativo dei
  PDF resta vuoto. PDF.js è caricato pigro via `LP.pdfjs()`.
