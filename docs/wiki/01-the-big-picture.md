# 1 · The big picture

> **You'll learn:** what R+ is for, who uses it, the four big moving parts, and how they connect — enough to know which page to read next.

---

## What R+ is, in one breath

R+ is a **desktop app (Mac/Windows) for internal-medicine residents** at a Mexican hospital. It's two things at once:

1. **The resident's desk** — one place per patient: labs (pasted from the hospital's **SOME** lab system or pulled from the portal), trends, cultures, *Estado actual* (vitals, glucose, intake/output, meds), *pendientes* (to-dos) and *agenda*. Notes, orders and the census are **outputs** of the desk — `.docx` and PDF files.
2. **The team's shared board** — every resident's laptop, iPad and intern's phone in the same ward sees the same patients live, via **Nube** (cloud sync on Cloudflare). It still works fully **offline**.

**North Star** (`docs/core/01-vision-north-star.md`): *"Everyone on the shift knows how every patient is — and nothing gets lost at handoff."* The ideal user is an R1/R2 resident on a 24-hour *guardia*.

**Hard "no"s** worth remembering when you design features: no autonomous diagnosis/treatment suggestions (R+ calculates and flags out-of-range values, it never *interprets*); not an EMR replacement; cloud is opt-in; if a feature makes residents manage R+ instead of patients, it's wrong.

---

## The four moving parts

```
                 ┌───────────────────────── Resident's laptop ─────────────────────────┐
                 │                                                                      │
 SOME lab text ─►│  RENDERER (UI)  ──IPC──►  MAIN (Node)  ──►  local SQLite DB          │
                 │  public/js/**              main.js           <userData>/rplus-       │
                 │  parse labs, forms,        .docx / PDF       clinical.db             │
                 │  census, Nube client       generation                                │
                 └──────────┬───────────────────────────────────────────────────────────┘
                            │ HTTPS push/pull + WebSocket nudges
                            ▼
                 ┌──────── Cloudflare ────────┐          ┌──── other devices ────┐
                 │ sync-worker  (Nube rooms,  │ ◄──────► │ laptops, R+ Móvil,    │
                 │   D1 + Durable Objects)    │          │ Interno phones        │
                 │ update-worker (app updates)│          └───────────────────────┘
                 │ equipos-worker (devices)   │
                 └────────────────────────────┘
```

| Part | One-line job | Read |
|---|---|---|
| **The Electron shell** | Window, IPC, startup, build | [02](./02-how-the-app-is-built.md) |
| **The clinical pipeline** | Paste → parse → lab sets → note → `.docx` | [06](./06-labs-to-word.md) |
| **Local storage** | SQLite file of JSON blobs, migrations, crypto toolbox | [09](./09-storage-and-security.md) |
| **Nube** | Monthly ward rooms, ops, LWW, E2E room keys | [10](./10-nube-sync.md) |
| **Release machinery** | Bump → build → sign → GitHub → auto-update | [11](./11-releases-and-updates.md) |

---

## The repo in 30 seconds

```
r-mas/
├── packages/
│   ├── core/            ← ~all code (root lib/, public/, scripts/, cloud/ are symlinks here)
│   │   ├── lib/         Node-side logic: db/, doc-generators/, update, crypto
│   │   ├── public/      the UI: index.src.html, partials/, styles/, js/features/
│   │   ├── cloud/       Cloudflare Workers: sync-worker, equipos-worker, update-worker, landing
│   │   ├── scripts/     build, release, CI guards, e2e scenarios
│   │   └── template*.docx
│   ├── im/              main.js + preload.js (the Internal Medicine app shell)
│   └── shared-signing/  verify signed UI bundles
├── docs/                core/ (vision, architecture, decision log), features/, logic/, wiki/ ← you are here
├── dist/                only latest*.yml are tracked
├── min-version.json     the "everyone must update" floor
└── stable-versions.json known-good versions for downgrade
```

---

## How the team works (conventions)

- **UI is in Spanish.** Code identifiers mix Spanish and English (`procesarLabs`, `marcarSegunRango`, `persistClinicalState`).
- **E2E first** (decision log 2026-09-27): behaviour is tested by driving the real app (`npm run e2e -- <scenario>`). Unit tests only for pure clinical logic, data integrity, crypto/security, the Nube Worker and patient-safety routing.
- **Never hand-edit generated files** (`public/index.html`, `app.bundle.mjs`, `chunks/`).
- **Decisions go in** `docs/core/18-knowledge-capture.md` — read it; it's the best history of *why* things are the way they are.
- **Gate:** `npm test` + `npm run metrics:check` must pass.

---

## Daily commands

| Want to… | Run |
|---|---|
| Start the app | `npm start` (rebuilds native DB module + UI first) |
| Rebuild UI only | `npm run build:ui` |
| Run one e2e scenario | `npm run e2e -- labs-to-docx` |
| Run one unit test file | `npm run test:one -- path/to/file.test.mjs` |
| Check debt/structure gates | `npm run metrics:check` |
| Fix "native module" errors | `npm run rebuild:db-native` |
| Cut a release | `npm run release:bump -- X.Y.Z` → edit notes → `npm run release:publish -- --yes` |

**Next:** [02 · How the app is built →](./02-how-the-app-is-built.md)
