# R+ Documentation

## Start here

| Audience | Entry |
|----------|-------|
| **Developers** | [../README.md](../README.md) (install & releases) → [core/04-directory-structure.md](./core/04-directory-structure.md) |
| **Contributors** | [../CONTRIBUTING.md](../CONTRIBUTING.md) |
| **Product / strategy** | [core/01-vision-north-star.md](./core/01-vision-north-star.md) |
| **Docs hub** | [core/00-system-index.md](./core/00-system-index.md) |
| **API reference** | [api/README.md](./api/README.md) |
| **Release history** | [../CHANGELOG.md](../CHANGELOG.md) |

## Structure

```
docs/
├── core/           # Strategy & architecture (numbered 00–18, slots 05/07/09-14 have placeholders)
├── features/       # Feature index → code paths
├── logic/          # Parsers & engines
├── database/       # SQLCipher map
├── api/            # HTTP + IPC API reference
└── logs/           # profiling / session notes
```

Root-level docs:

- `CHANGELOG.md` — consolidated release history (auto-generated from `docs/RELEASE_NOTES_*.txt`)
- `CONTRIBUTING.md` — contribution guide
- `design.md` — Hallmark design system

Maintained per [core/17-docs-blueprint.md](./core/17-docs-blueprint.md).
