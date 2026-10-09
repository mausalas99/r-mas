---
type: "core"
name: "Directory Structure"
status: "stable"
description: "Canonical map of where source files, docs, and build artifacts belong in R+."
---

# Directory Structure

This doc is the canonical map of *where* paths exist and *why*.

## Root layout

```
R+/
├── packages/core/                      # Shared core: lib, public, cloud, scripts, data
│   ├── lib/                            # Node shared logic (importable from main)
│   ├── public/js/                      # Renderer source (pre-bundle)
│   │   └── features/                   # Primary place for new UI features
│   ├── public/interno/                 # Mobile interno/guardia web client
│   ├── cloud/                          # sync-worker, equipos-worker, update-worker, landing
│   └── scripts/                        # build-ui, bundle, release, metrics
├── packages/im/                        # Free IM app shell: main.js, preload.js
├── packages/shared-signing/            # Module signing shared by apps
├── packages/hf/, packages/neumo/       # Separate apps (own CLAUDE.md; not R+ work)
├── lib/, public/, cloud/, scripts/     # Root paths are committed symlinks into packages/core
└── docs/
    ├── core/                           # Strategy & architecture
    ├── features/                       # Feature docs + features-index.md
    ├── logic/                          # Parsers, engines + logic-index.md
    ├── database/                       # Schema docs + database-index.md
    └── logs/                           # profiling / session notes
```

## Where to add new work

| Change type | Location |
|-------------|----------|
| New UI feature | `public/js/features/<name>/` + register in `app-runtimes.mjs` |
| Node shared logic | `lib/<domain>/` as `.mjs` or `.js` |
| Cloud / Nube route | `cloud/sync-worker/` or `cloud/equipos-worker/` |
| IPC channel | `preload.js` + `main.js` or `lib/db/ipc-handlers.mjs` |
| DB schema change | `lib/db/schema.mjs` + `schema.test.mjs` (bump version) |
| Feature documentation | `docs/features/feat-*.md` + update `features-index.md` |
| Agent graph memory | `scripts/graph-memory/` (not shipped in Electron) |

## Generated — do not hand-edit

- `public/js/app.bundle.mjs`, `public/js/chunks/*`
- `public/index.html` (from `scripts/build-ui.mjs`)

Run `npm run build:ui` after renderer changes.

## Related

- [08-core-architecture.md](./08-core-architecture.md)
- [features/features-index.md](../features/features-index.md)
