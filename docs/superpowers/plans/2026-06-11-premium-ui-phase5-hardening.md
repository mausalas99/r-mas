# Phase 5 — Hardening & hygiene (audit QW + M1 + M2)

**Branch:** `feature/phase5-hardening`  
**Spec:** `docs/superpowers/specs/2026-06-10-premium-ui-audit-remediation-design.md` § Phase 5

## Done

- `lib/window-open-policy.cjs` + `setWindowOpenHandler` allowlist (http/https only)
- `lib/db/lan-db-bridge.cjs` — explicit DB injection (replaces `globalThis.__rplusDbManager`)
- Dead plaintext `storage.save*` writers removed (`saveAll` / `saveTodos` retained)
- CSP meta on `index.src.html`, `mobile/index.html`, `mobile/join.html`, `interno/index.html`
- `session-clinical-wipe.mjs` — mobile web PHI wipe on `pagehide` / `beforeunload`
- `docs/core/15-security.md` — LAN plaintext risk acceptance + legacy recovery note
- README Python claims removed; `fetch-python*.js` + `_clean_listado_template.py` deleted
- Bundles/chunks untracked (`.gitignore`); CI runs `npm run build:ui` instead of `:check`

## Remaining (Phase 6+)

- `procesarLabs` decomposition (characterization tests first)
- Full CSP manual tab pass on device
- `npm audit` devDependency tar chain (electron-builder) — monitor only
