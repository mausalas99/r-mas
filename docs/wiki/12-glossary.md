# 12 · Glossary

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
| **Alta** | In R+ copy, **admitting** a patient to the census («+ Agregar da de alta»), not discharge |
| **Archivar / Fijados / Incompletos** | Remove from active census / pinned patients / cards missing cuarto, cama or servicio |
| **FOUR / esferas** | Coma scale (x/16) / orientation spheres, in the N line |
| **Rescate de insulina** | Sliding-scale insulin dose given for a high glucose |
| **Reto de furosemida** | Furosemide challenge; ≥ 200 mL in 2 h = *respondedor* |
| **VPO** | Valoración preoperatoria (pre-op assessment) |
| **Perfil farmacoterapéutico** | Monthly drug × day administration grid |
| **Receta (SOME)** | The hospital prescription block pasted into Medicamentos |
| **Rotación / Nueva rotación** | A rotation period / archiving all teams to start a new one |
| **Modo Guardia / «solo entregados»** | The night board view / census filter showing only patients handed to you |
| **Interconsulta** | Consult; in *Interconsulta mode* the note only includes the latest lab day |

## R+ concepts

| Term | Meaning | Page |
|---|---|---|
| **Procesar** | The parse button for pasted labs | [06](./06-labs-to-word.md) |
| **Laboratoriazo** | The app's name for its lab feature | — |
| **Lab set / conjunto** | One stored group of results at a date/time; reports ≤ 2 h apart merge | [06](./06-labs-to-word.md) |
| **resLabs** | Formatted text lines, one per lab section | [06](./06-labs-to-word.md) |
| **`*`** | Value outside the lab's reference range | [06](./06-labs-to-word.md) |
| **Tendencias** | Lab trend charts | [06](./06-labs-to-word.md) |
| **TTD** | Time-to-document: lab arrival → printable note | [01](./01-the-big-picture.md) |
| **clinical_blob** | DB table storing patient data as JSON per key | [09](./09-storage-and-security.md) |
| **app-state** | The live in-memory patient record; getters return mutable objects | [03](./03-shared-state-and-wiring.md) |
| **persistClinicalState / scheduleCloudSyncPush** | The two calls every edit needs: local save (`db:clinical-command`) and cloud push | [03](./03-shared-state-and-wiring.md) |
| **Runtime context (`rt`)** | Object of shared callbacks each feature receives at registration | [03](./03-shared-state-and-wiring.md) |
| **Change log / projector** | Main-process record of clinical commands; the projector turns unsynced changes into Nube ops | [03](./03-shared-state-and-wiring.md) |
| **Domain** | A user-facing feature group on the feature map (e.g. Estado actual) | [04](./04-feature-map.md) |
| **Area / hub file** | A group of source files on the codebase map / a file imported by dozens of others (`app-state.mjs`) | [05](./05-codebase-map.md) |
| **Mirror file** | The same rule written twice, in `lib/` and the renderer (privileges, username) | [05](./05-codebase-map.md) |
| **monitoreo / medición** | The Estado actual object on a patient / one recorded row in its historial | [07](./07-patient-desk.md) |
| **deriveSnapshot** | Computes current vitals, I/O, glucose from historial; never stored | [07](./07-patient-desk.md) |
| **pendienteReceta / confirmado** | Med text proposed from the receta / fields the clinician confirmed | [07](./07-patient-desk.md) |
| **SOAP destination** | Which N/V/HD/HI/NM slot a drug goes to | [07](./07-patient-desk.md) |
| **Cycle letter** | A–D (or A–F, A1–D2) letter that decides which team is on call today | [08](./08-team-layer.md) |
| **Scope** | Rules deciding which patients a user may see | [08](./08-team-layer.md) |
| **active_guardias / pendientes_json** | One row per handed-off patient / its handoff payload (vitals plan, context, items) | [08](./08-team-layer.md) |
| **Staged team** | A team created mid-rotation; becomes active at the next «Nueva rotación» | [08](./08-team-layer.md) |
| **Nube** | Cloud sync (Cloudflare Worker + D1) | [10](./10-nube-sync.md) |
| **Room** | One shared Nube workspace per sala per month (`YYYY-MM`) | [10](./10-nube-sync.md) |
| **Join code** | 6-char room code; also unlocks the room key | [10](./10-nube-sync.md) |
| **Owner / member** | Room creator / joiner | [10](./10-nube-sync.md) |
| **Op / mutation** | One "set path → value" change | [10](./10-nube-sync.md) |
| **Outbox** | Local queue of unsent ops (survives crashes) | [10](./10-nube-sync.md) |
| **Revision** | A room's change counter | [10](./10-nube-sync.md) |
| **clinicalOps** | Synced blob of teams, users, assignments, guardias, entrega templates | [10](./10-nube-sync.md) |
| **labsHave** | "Patients I already hold" hint on catch-up pulls | [10](./10-nube-sync.md) |
| **R+ Móvil** | Resident phone/iPad web client | [10](./10-nube-sync.md) |
| **Equipos** | (1) device-loan queue Worker; (2) clinical teams in clinicalOps | [10](./10-nube-sync.md) |
| **Recuérdame** | "Remember me" — keeps tokens/keys on the device | [02](./02-how-the-app-is-built.md), [10](./10-nube-sync.md) |
| **LiveSync / lan-squad** | Retired LAN sync (removed 8.0.5); only name fossils remain | [02](./02-how-the-app-is-built.md) |
| **Module update** | Signed renderer bundle verified at boot | [11](./11-releases-and-updates.md) |
| **min-version / stable-versions** | Forced-update floor / downgrade catalog | [11](./11-releases-and-updates.md) |

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
