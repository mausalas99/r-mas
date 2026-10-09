# 7 · Glossary

One place for every term in the wiki. Grouped so you can skim: **clinical (Spanish)**, **R+ concepts**, **tech**.

---

## Clinical & hospital terms (Spanish → plain English)

| Term | Meaning |
|---|---|
| **SOME** | The hospital's lab system; its plain-text report (starting at `Expediente:`) is what gets pasted |
| **Expediente / registro** | Hospital record (chart) number. The part before `-` is the "base"; same base = same patient |
| **Censo** | Ward patient list; exported as a landscape PDF |
| **Sala** | Ward / team (Sala 1, Sala 2, Sala E, Torre HU, Interconsultas, UX, Eme, Área A/Pensionistas, UCI, PostQx, Subespecialidad) |
| **UCI / PostQx / Subespecialidad** | ICU / post-surgical / subspecialty rotation (service «Rotación») |
| **Cuarto / cama** | Room / bed |
| **Servicio / área** | Treating service / physical area |
| **Guardia** | On-call shift (often 24 h) |
| **Pase** | Rounds |
| **Entrega** | Shift handoff |
| **Inicio de turno** | Start-of-shift summary |
| **Interno (MIP)** | Medical intern (undergraduate) |
| **R1–R4** | Residency year |
| **Nota de evolución** | Daily progress note |
| **Interrogatorio** | History & exam section |
| **Estudios (auxiliares)** | Labs & studies section of the note |
| **Indicaciones** | Medical orders sheet |
| **Listado de problemas** | Problem list (activos / inactivos) |
| **Pendientes** | To-dos |
| **Agenda** | Weekly procedure calendar |
| **Estado actual (EA)** | Structured current status: vitals, glucose, I/O, meds by system |
| **N / V / HD / HI / NM** | Body-system sections used in the note's evolución and EA |
| **Signos vitales** | TA (TAS/TAD) blood pressure, FC heart rate, FR resp. rate, Temp, Sat O₂ |
| **DXT / glucometría** | Capillary glucose |
| **I/O** | Intake / output (balance) |
| **Alterado** | Out of range |
| **BH** | Biometría hemática — complete blood count |
| **QS** | Química sanguínea — blood chemistry |
| **ESC** | Electrolitos séricos — serum electrolytes |
| **PFH** | Pruebas de función hepática — liver tests |
| **Gasometría / GASES** | Blood gas |
| **EGO** | Examen general de orina — urinalysis |
| **LCR** | Cerebrospinal fluid |
| **Citoquímico** | Body-fluid chemistry |
| **Hto / Ret** | Hematocrit / reticulocytes |
| **Cultivo (hemo-, uro-)** | Culture (blood, urine) |
| **Antibiograma / germen** | Antibiotic susceptibility (S/I/R) / organism |
| **Interconsulta** | Consult; in *Interconsulta mode* the note only includes the latest lab day |

## R+ concepts

| Term | Meaning | Page |
|---|---|---|
| **Procesar** | The parse button for pasted labs | [03](./03-labs-to-word.md) |
| **Laboratoriazo** | The app's name for its lab feature | — |
| **Lab set / conjunto** | One stored group of results at a date/time; reports ≤ 2 h apart merge | [03](./03-labs-to-word.md) |
| **resLabs** | Formatted text lines, one per lab section | [03](./03-labs-to-word.md) |
| **`*`** | Value outside the lab's reference range | [03](./03-labs-to-word.md) |
| **Tendencias** | Lab trend charts | [03](./03-labs-to-word.md) |
| **TTD** | Time-to-document: lab arrival → printable note | [01](./01-the-big-picture.md) |
| **clinical_blob** | DB table storing patient data as JSON per key | [04](./04-storage-and-security.md) |
| **Nube** | Cloud sync (Cloudflare Worker + D1) | [05](./05-nube-sync.md) |
| **Room** | One shared Nube workspace per sala per month (`YYYY-MM`) | [05](./05-nube-sync.md) |
| **Join code** | 6-char room code; also unlocks the room key | [05](./05-nube-sync.md) |
| **Owner / member** | Room creator / joiner | [05](./05-nube-sync.md) |
| **Op / mutation** | One "set path → value" change | [05](./05-nube-sync.md) |
| **Outbox** | Local queue of unsent ops (survives crashes) | [05](./05-nube-sync.md) |
| **Revision** | A room's change counter | [05](./05-nube-sync.md) |
| **clinicalOps** | Synced blob of teams, users, assignments, guardias, entrega templates | [05](./05-nube-sync.md) |
| **labsHave** | "Patients I already hold" hint on catch-up pulls | [05](./05-nube-sync.md) |
| **R+ Móvil** | Resident phone/iPad web client | [05](./05-nube-sync.md) |
| **Equipos** | (1) device-loan queue Worker; (2) clinical teams in clinicalOps | [05](./05-nube-sync.md) |
| **Recuérdame** | "Remember me" — keeps tokens/keys on the device | [02](./02-how-the-app-is-built.md), [05](./05-nube-sync.md) |
| **LiveSync / lan-squad** | Retired LAN sync (removed 8.0.5); only name fossils remain | [02](./02-how-the-app-is-built.md) |
| **Module update** | Signed renderer bundle verified at boot | [06](./06-releases-and-updates.md) |
| **min-version / stable-versions** | Forced-update floor / downgrade catalog | [06](./06-releases-and-updates.md) |

## Tech terms

| Term | Meaning |
|---|---|
| **Electron** | Framework: Chromium window + Node.js process in one desktop app |
| **Main process** | The Node side — windows, disk, DB, native dialogs |
| **Renderer** | The web page (UI); no Node access in R+ |
| **Preload** | Script bridging the two; exposes `window.electronAPI` |
| **IPC / channel** | Messages between renderer and main, named by a string (`'db:status'`) |
| **contextIsolation / nodeIntegration** | Security switches that keep the page away from Node |
| **CSP** | Content Security Policy; here it bans inline `onclick`, hence `data-onclick` |
| **windowHandlers** | Functions a feature puts on `window` for `data-onclick` |
| **Runtime context (`ctx`)** | Shared getters/callbacks passed to each feature's `registerXRuntime` |
| **esbuild / bundle / chunks** | Tool that combines source modules into `app.bundle.mjs` + lazy split files |
| **npm workspace** | One repo, several packages (`packages/*`) |
| **Symlink** | Filesystem alias (`lib` → `packages/core/lib`) |
| **Native module / ABI** | Compiled `.node` code; must match Electron's binary interface |
| **SQLite / WAL** | One-file database / its write-ahead log |
| **SQLCipher / multiple-ciphers** | Whole-file DB encryption add-on |
| **Migration / schema version** | Forward-only DB upgrade steps / the current step number (31) |
| **KDF** | Password → key function (Argon2, scrypt, PBKDF2) |
| **Salt** | Random non-secret bytes mixed into a KDF |
| **DEK / wrapping** | Data-encryption key / encrypting a key with another key |
| **AES-256-GCM** | Symmetric cipher with tamper detection |
| **ECDSA / ECDH (P-256)** | Elliptic-curve signatures / key agreement |
| **HKDF** | Derives sub-keys from a key (Interno subkey) |
| **safeStorage** | Electron API that encrypts with the OS keychain |
| **Hash chain** | Log where each entry includes the previous hash |
| **LWW** | Last-writer-wins conflict rule |
| **Tombstone** | Deletion marker |
| **Shard** | One DB row holding a slice of a larger state |
| **Cloudflare Worker / D1 / Durable Object / R2** | Edge server / hosted SQLite / single-instance stateful object / object storage |
| **wrangler** | Cloudflare's CLI and config (`wrangler.toml`) |
| **electron-builder / electron-updater** | Make installers / self-update from `latest*.yml` |
| **NSIS / notarization / fuses / asar** | Windows installer / Apple malware check / Electron hardening switches / packed app archive |
| **E2E test** | Test that drives the real app end to end |
| **dependency-cruiser** | Tool that enforces import rules between folders |
