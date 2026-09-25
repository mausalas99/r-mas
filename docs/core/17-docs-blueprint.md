---
type: "core"
name: "Documentation Blueprint"
status: "stable"
description: "In-repo documentation taxonomy and maintenance rules."
---

# Documentation Blueprint

## Folder taxonomy

| Directory | Role |
|-----------|------|
| `docs/core/` | Strategy, architecture, hub (`00-system-index.md`) |
| `docs/features/` | Feature workflows → code paths |
| `docs/logic/` | Parsers, sync engines, generators |
| `docs/database/` | SQLCipher schema |
| `docs/api/` | HTTP + IPC API reference |
| `docs/logs/` | Profiling / session notes |

## Root-level docs

| File | Role |
|------|------|
| `CHANGELOG.md` | Consolidated release history (auto-generated) |
| `CONTRIBUTING.md` | Contribution guide |
| `design.md` | Hallmark design system |

## Naming

- Core: `0x-name.md` (e.g. `01-vision-north-star.md`)
- Features: `feat-<name>.md`
- Logic: `util-<name>.md`

## Maintenance rules

1. **Product trade-offs** → read `01-vision-north-star.md` before proposing features
2. **Code locations** → `04-directory-structure.md` + category indices
3. **New feature domain** → update `features-index.md`
4. **Schema changes** → update `docs/database/`
