---
type: "core"
name: "Core Architecture"
status: "stable"
dependencies: ["04-directory-structure"]
description: "Electron, Nube sync, SQLCipher, and document pipeline architecture."
---

# Core Architecture

## Process model

```mermaid
flowchart TB
  subgraph electron [Electron Main]
    M[main.js]
    M --> W[BrowserWindow]
    M --> IPC[IPC + updater]
  end
  subgraph renderer [Renderer]
    APP[app.js → app.bundle.mjs]
    APP --> FEAT[features/*]
  end
  subgraph nube [Nube]
    SW[cloud/sync-worker]
    D1[D1 room state]
  end
  W --> APP
  APP -->|IPC| DBM[lib/db/db-manager.mjs]
  FEAT -->|HTTPS| SW
  SW --> D1
```

## Layers

| Layer | Entry | Responsibility |
|-------|-------|----------------|
| Main | `main.js` | Window (`app://rplus`), updater, IPC |
| Preload | `preload.js` | `window.electronAPI` surface |
| Renderer | `public/js/app.js` | Feature registration via `app-runtimes.mjs` |
| Cloud sync | `cloud/sync-worker/` | Room LWW, Interno MIP, R+ Móvil `/mobile/` |
| Clinical DB | `lib/db/` | SQLCipher, Argon2, outbox |

LAN LiveSync and `server.js` (:3738) are removed. Phones do not talk to the Mac.

## Nube sync

1. **Typed mutations** — HTTPS to the Worker (note, labs, clinical-ops, commands)
2. **Pull** — D1 snapshot / revision reconcile
3. **Notify** — Durable Object can wake peers (paid Workers)
4. **Conflict policy** — LWW on overlap

## Document pipeline

Desktop export is IPC → `lib/doc-export-service.js` → `lib/doc-generators/{note,indicaciones,listado}.js` (JSZip `.docx`).

## Related

- [database/database-index.md](../database/database-index.md)
- [logic/logic-index.md](../logic/logic-index.md)
- [15-security.md](./15-security.md)
