# R+ (Claude Code entry point)

R+ is an Electron 41 desktop medical workbench for hospital guardia workflows: Spanish UI, local-first SQLCipher clinical data, LAN LiveSync between ward Macs, and structured documentation export (.docx) from pasted SOME/lab text.

This file is a **pointer** — canonical rules and the live code map live elsewhere. Do not duplicate `.cursor/rules/` here.

## Read next

1. [`.cursor/rules/project-context.mdc`](.cursor/rules/project-context.mdc) — project map, entry points, conventions, changelog (start here)
2. [`docs/core/00-system-index.md`](docs/core/00-system-index.md) — full documentation hub
3. [`docs/core/01-vision-north-star.md`](docs/core/01-vision-north-star.md) — product trade-offs and anti-goals

Claude-specific config also lives under [`.claude/`](.claude/).

## Build and test

```bash
npm run build:ui    # assemble index.html + bundle renderer (required after public/js edits)
npm start           # Electron; prestart rebuilds natives + bundle
```

**Tests:** use targeted runs only — never full `npm test` during dev (CI and release only):

```bash
node --test lib/db/schema.test.mjs
```

SQLCipher-native tests: run `node scripts/ensure-native-db-for-node.mjs` first; after native rebuilds run `node scripts/rebuild-native-db.mjs`.

Debt gate: `npm run metrics:check` (must pass before merge).

## Hard rules

Sourced from `.cursor/rules/` — read the full files for detail.

- **Debt ratchet:** cyclomatic complexity ≤ 15, function ≤ 80 lines, file ≤ 600 lines on touched Tier-1 files; `npm run metrics:check` must pass; never edit `scripts/metrics/baseline.json`.
- **Bundles:** never hand-edit generated renderer output (`public/js/chunks/`) — edit `public/js/**/*.mjs` sources and run `npm run build:ui`.
- **UI copy:** Spanish for user-facing strings.
- **Changelog:** prepend architectural changes to `.cursor/rules/project-context.mdc` (see `.cursor/rules/sync-context-on-commit.mdc`).
- **Large features:** write specs in `docs/superpowers/specs/` before coding.
- **Plans:** do not modify `docs/superpowers/plans/` unless executing that plan.

## Dev environment

Copy [`.env.example`](.env.example) for optional `R_PLUS_*` dev knobs (LAN peer scripts, persistence rollback, team code override). No secrets — leave values empty.

## Advisor plan backlog

Implementation handoff plans: [`plans/README.md`](plans/README.md).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for PR conventions and the multi-agent rules table.
