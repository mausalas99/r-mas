# Premium UI Phase 4 — Safety Net (Audit M0) Implementation Plan

**Spec:** `docs/superpowers/specs/2026-06-10-premium-ui-audit-remediation-design.md` (Phase 4)

**Goal:** Glob-based test discovery, GitHub Actions CI, remove broken gitlinks.

## Tasks

- [x] `scripts/run-tests.mjs` — `git ls-files` discovery + `--only` passthrough
- [x] `scripts/run-tests.test.mjs` — meta-test ≥315 tracked test files
- [x] `package.json` — `"test": "node scripts/run-tests.mjs"`
- [x] `.github/workflows/ci.yml` — macos-latest: `npm ci` → `build:ui:check` → `metrics:check` → `npm test`
- [x] Remove gitlinks (`hallmark`, `micode`, `plugins`, `superpowers`, `ui-ux-pro-max-skill`, `.tmp/Vibe-App-Wiki`) + `.gitignore`
- [x] Triage failures from newly activated tests (Task 0.2 — may surface in CI) — closed 2026-06-11: CI green on every `main` push through `99117d0`/`b8764fc`; no failures surfaced to triage. (Note: glob runner later reverted in `3e2af44`; explicit list in `package.json` is the CI entry point.)

## Verification

```bash
npm test                    # full glob suite (slower than legacy list)
node --test scripts/run-tests.test.mjs
git ls-files -s | awk '$1==160000'   # must be empty
```
