# R+ vs R+ HF diff (2026-09-14)

Fork point: `211395d4`. Upstream (`upstream/main`, R+) has 161 commits not in `main` (R+ HF).
Full list: see `git log --oneline main..upstream/main` in this repo.

Shared engine = applies to HF as-is. IM-specific = built for internal medicine, evaluate before porting.

## Tier 1 — port now (data loss, security, perf; shared engine)

- **Nube quota bug caused silent data loss.** `maxLivePatients` was 50, sized for daily rooms. Rooms moved to monthly. Any sala with 50+ patients/month silently dropped new admissions. Fixed: cap raised to 300. (`lib/db/clinical-ops-sync-export.mjs`, `cloud/sync-worker/src/quotas.js`)
- **Lab history could hard-fail a patient's sync forever.** One D1 row per patient for all lab history hit the 2MB row cap on long stays, then every future push failed. Fixed: sharded to one row per lab set (`room_state_lab_sets`). Migration is lazy, safe to port. (`cloud/sync-worker/schema/010-shard-room-state-lab-sets.sql`)
- **Teams could vanish for other clients** — 3 separate bugs: creator dropped from her own team snapshot, an FK error silently dropped the whole team row, and merge order could un-archive last month's rotation. Fixed in `lib/db/clinical-ops-sync-export.mjs`, `clinical-ops-sync-merge-teams.mjs`, `clinical-ops-sync-merge.mjs`. (IM-specific data, but the merge-order/FK-drop bug classes may exist in HF's own sync code — worth checking.)
- **DB perf: guardia/team queries 3.7ms → 0.007ms** via composite indexes. (`lib/db/schema-migrate-v24-active-guardias-index.mjs`)
- **SOME-parser O(n²) fixed**, 783ms → 78ms on a 53k-line paste. Directly on HF's north-star path (SOME paste → structured labs). (commit `97b6ed8d`, file outside agent scope — re-check `lib/` parser location)
- **Electron IPC fetch had no timeout** — could hang forever. Now 20s. (`lib/cloud-sync-ipc-fetch.cjs`)
- **Patient-merge vitals tiebreak bug**: used editable `recordedAt`, lost updates on same-minute entries. Fixed to use `savedAt`. (`public/js/patient-merge.mjs`)
- **Sync echo-loop bug**: a deterministically-rejected LWW conflict could resend forever. New guard skips resend of identical `(path, updatedAt)`. (`public/js/features/cloud-sync/cloud-sync-echo-guard.mjs`)
- **medReceta not synced correctly** — missing from LWW entry-field map. Fixed. Directly affects HF's Medicamentos/Receta module. (`lib/clinical-repo/sync/op-encoder-persist.mjs`)
- **Admin DEK rescue**: second wrap of room DEK under admin's own ECDH key (private half in Mac Keychain, never sent to server) — recovers a room if the join code is lost. General Nube feature, portable to HF's opt-in Nube. (`lib/admin-rescue-key.mjs`, `cloud/sync-worker/src/room-dek.js`)
- **App-version gating on sync**: blocks stale clients from reading/writing once fleet is on new protocol. Off by default via flag. Relevant if HF ever changes its sync protocol. (`cloud/sync-worker/src/auth-util.js`, schema `012-app-version.sql`)
- **Antibiotic-classifier regex bug**: trailing `\b` broke matching for CEFTRIAXONA/CEFTAZIDIMA etc. Check HF's own med-name matching for the same bug.

## Tier 2 — worth porting (QOL / accessibility, shared UI engine)

Batch of 14 "work unit" (WU) accessibility fixes, all in shared CSS/JS, not IM-specific:

- Keyboard focus trap inside every modal (was leaking focus to page behind)
- Fix invisible keyboard focus ring app-wide
- Fix color roles/contrast that resolved to nothing; darken faint text/chip labels
- Raise 16 sub-10px labels to readable size
- Screen-reader invalid-field marking on 5 forms
- Keyboard activation (Enter/Space) on card-shaped buttons
- Scroll-edge fade cues on 10 horizontal scrollers
- Show full text on hover where CSS truncates
- Confirm before every delete/archive (6 sites)
- Error/undo toasts stay until dismissed instead of vanishing too fast
- Hide raw JS errors from user toasts, keep plain Spanish copy
- Stop clinical-value pulses blinking forever (reduced-motion)
- Adaptive census table columns via CSS var
- Fix infinite focusin loop (RangeError) in modal focus-trap stacking

Other shared-engine QOL:

- Row add/remove fade/slide motion on lists (new motion tokens)
- Danger-button style for destructive actions, bulk-selection-bar CSS pattern
- `package.json` test script: hardcoded file list → glob discovery, easier to maintain
- Metrics/CI fixes: max-lines-per-function scoring bug, `&&`-chain bug hiding a real test failure, dead `spacing-ratchet.mjs` removed, `forbid-lan-imports.mjs` actually wired in

## Tier 3 — IM-specific, evaluate case-by-case

Not directly portable (built for IM rotations/wards), but some underlying CSS/pattern may be reusable:

- Interconsulta team board redesign (4-team board, Preop/Pendientes buckets, guard rollover)
- Red tab: cross-area network census across 8 sala rooms (pattern — batch admin read vs N round-trips — is portable even if the sala concept isn't)
- Admin/Red/Equipo/Perfil UI cleanup pass (danger-button + bulk-bar CSS is shared, rest is team/roster specific)
- Next-rotation team staging (`succeeds_team_id`)
- Estado actual T1/T2/T3 shift-split fluid balance + "otras fuentes" (ultrafiltrado, drenaje) — **relevant for cardiology (HF fluid balance tracking), worth a real look**
- Medicamentos tab (schedule-grid + PRN log) — general feature, may be worth adapting
- Tendencias "Tablas Dinámicas" combined-analyte table builder — general feature, worth a look

## Tier 4 — cleanup, low priority

- Upstream deleted a large batch of dead code (LAN ward server routers, 7.9 cutover wizard, legacy sync outbox, lab OCR, one-shot verify scripts). HF forked before this cleanup and still carries all of it. Check if HF still uses any of it (especially lab OCR — upstream dropped it, confirm HF doesn't need it), then delete.
- LAN LiveSync fully removed upstream; HF likely still has this debris too.
- `cloud/equipos-pages/public/**` and `cloud/sync-pages/public/**` moved to `.gitignore`d build output upstream (not committed). Not a behavior change, just repo hygiene.

## Not reviewed

- `public/js/features/cardio/**` and `lib/cardio/**` — HF-only, no upstream equivalent, skipped.
- Pure build artifacts (`chunks/`, `.js.map`, icons) — skipped everywhere.
