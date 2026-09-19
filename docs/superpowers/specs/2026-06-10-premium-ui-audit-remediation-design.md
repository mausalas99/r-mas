# Premium UI Overhaul + Audit Remediation — Design

**Date:** 2026-06-10
**Status:** Approved pending user review
**Inputs:** `docs/AUDIT_2026_06_10.md` (full repo audit), brainstorming session with visual companion (mockups in `.superpowers/brainstorm/84072-1781132178/content/`)

## Goal

Take R+ v7.3.x from "solid app with hygiene gaps" to a verified, hardened codebase wearing a genuinely premium UI, without putting clinical correctness at risk. Two workstreams in one master spec: (1) a premium UI/UX overhaul across all three clients, (2) the audit's remediation plan through Milestone 2. Implementation is phased; each phase gets its own implementation plan and lands on `main` independently.

## Decisions (locked with user)

| Topic | Decision |
|---|---|
| Phase order | **UI first** (user's explicit call, accepting the no-CI risk), then remediation: design system → navigation + desktop → mobile + interno → safety net → hardening → procesarLabs |
| Audit scope | Everything through Milestone 2 (M0 + quick wins + M1 + M2) |
| Visual direction | **A "Workbench Refinado"** — evolve the current indigo/paper identity (depth, typography, consistency) — plus **B glass treatment on overlay surfaces only** (modals, dropdowns, menus, ⌘K, toasts) |
| Navigation | Grouped tab row replaces Expediente levels 2+3 on wide screens; groups collapse to name, expand on hover/focus, active group pinned expanded; context header with mode selector; ⌘K palette |
| Motion | **Mixto** default; Ajustes setting with three presets (Sobrio / Mixto / Expresivo); OS reduce-motion always wins |
| Restyle scope | **All three clients** (desktop Electron, `public/mobile/`, `public/interno/`) get the full premium treatment in this effort |
| Gitlinks (hallmark, micode, plugins, superpowers, ui-ux-pro-max-skill) | `git rm --cached` + `.gitignore`; folders stay on disk |
| iPad/web PHI at rest | Session-scoped localStorage: clinical keys wiped on logout/session end |
| CI platform | GitHub Actions, single `macos-latest` job |
| `public/index.html` | Stays tracked (server runs without build step) — documented deliberate exception; bundles/chunks get untracked |
| Legacy recovery code `'r+123'` | Kept with audit monitoring; sunset on a future version boundary once `legacy: true` unlock events stop appearing |
| Structure | One master spec (this doc), one implementation plan per phase |

## Phase 1 — Design system foundation

**Tokens, evolved not replaced.** `public/tokens.css` keeps the indigo `#4a52e8` + paper identity and its oklab/`color-mix` architecture. Additions:

- 4-level elevation scale (flat / raised / floating / overlay), each layered shadow + hairline border, defined for both themes.
- Refined neutral ramp for text hierarchy; hover/active state tokens for every interactive role; unified focus rings.
- All app CSS (~21k lines, ~25 files in `public/styles/`) migrated to consume only tokens — this is the mechanism that fixes cross-tab inconsistency.

**Typography.** Explicit scale (display / title / section / body / caption / mono-numeric), tightened line-heights. Lab values and trends use `font-variant-numeric: tabular-nums`.

**Glass overlays.** One `.surface-overlay` treatment (translucent bg, `backdrop-filter` blur, hairline light border, deep shadow) for modals, settings/connection dropdowns, ⌘K, context menus, toasts. Content panes stay opaque for clinical legibility. GPU is disabled in `main.js`, so blur performance is verified on the oldest target hardware in this phase; a solid-color fallback token ships alongside.

**Motion engine.** CSS-variable duration/easing tokens consumed everywhere. Three presets switchable in Ajustes, persisted: Sobrio (100–200ms, 1–2px, no spring), Mixto (default — sober for frequent interactions; springs reserved for nota generada, sync completed, ⌘K open, onboarding, group-tab expansion), Expresivo (springs/stagger throughout). `prefers-reduced-motion` overrides all presets.

**Dark theme parity.** Every new token defined in both themes from day one; dark elevation uses lighter surfaces, not only shadows.

## Phase 2 — Navigation rework + desktop rollout

**Grouped row** (validated via live interactive demo): inside Expediente, consolidated tabs + segment bars merge into one row of group pills — Paciente (Datos · Pendientes) · Clínico · Resultados · Salida — driven by the existing maps in `public/js/expediente-tabs.mjs`, so Sala/Interconsulta section differences and the iPad Salida-hidden rule are inherited, not rewritten.

- Active group pinned expanded; others collapse to their name and expand on hover/focus (motion-token animation).
- Touch: first tap expands, second tap selects. Keyboard: focus expands; ⌘K jumps directly.
- Narrow windows: automatic fallback to the current two-level pattern (tabs + segment bar).
- The unused granular tab code path (`useConsolidatedExpedienteTabs` is hardcoded `true`) is deleted, not preserved.

**Context header.** Active patient + bed + diagnosis + current path always visible. The conditional mode chips are replaced by one segmented mode selector: Sala · Interconsulta · Guardia · Pase. Keyboard hints (⌘K, J/K) surface subtly.

**⌘K palette.** Fuzzy-matches sections and patients ("tend gar" → Tendencias of García). Glass overlay, keyboard-first. Reuses the existing patient store and tab-switching functions — a launcher, not a new data layer.

**Desktop surface rollout order:** Expediente panes (notas, indicaciones, estado actual, historia, tendencias, cultivos, salida) → Laboratorio workbench → patient sidebar → Pase & Guardia boards → Manejo + Agenda → all modals/dropdowns/toasts (glass) → onboarding tour & Learn hub. One surface per commit.

## Phase 3 — Mobile + interno rollout

Both web clients consume the same token/motion/typography files — no forked design system. Mobile gets the full pass: patient cards, lab views, touch-adapted nav (tap-to-expand grouped row), glass where iPad Safari's `backdrop-filter` allows. Interno gets the same treatment scaled to its simpler surface. Verification on a real iPad over LAN per merge: rendering, touch targets ≥ 44px, sync flows.

## Phase 4 — Safety net (audit M0)

- `scripts/run-tests.mjs`: discovery via `git ls-files '*.test.js' '*.test.mjs' '*.test.cjs'`, spawns `node --test`; `npm test` points at it; `pretest`/`posttest` (native DB rebuild) untouched; `--only <pattern>` passthrough; meta-test asserts discovered count ≥ 315.
- Triage newly-running failures: fix or ticket with reasons — never silently re-exclude.
- Gitlink removal per decision above; verify `git ls-files -s | awk '$1==160000'` is empty and a scratch clone is clean.
- GitHub Actions CI (`.github/workflows/ci.yml`): `npm ci` → `build:ui:check` → `metrics:check` → `npm test` on `macos-latest`; `submodules: false` on checkout.

## Phase 5 — Hardening & hygiene (audit QW + M1 + M2)

- `setWindowOpenHandler` protocol allowlist mirroring `main.js:428`'s `https?://` pattern; unit test.
- `npm audit fix` (qs advisory).
- Delete dead plaintext writers in `public/js/storage.js` (`savePatients`/`saveNotes` + siblings; zero callers verified by audit).
- CSP meta tags on all four HTML entry points; manual pass through every tab (re-validates the new UI; new UI markup is written CSP-clean from Phase 1 — no inline `style=`, no eval).
- LAN plaintext trade-off documented in `docs/core/15-security.md` as formal risk acceptance with conditions and revisit trigger.
- Legacy recovery decision recorded (see table).
- README Python claims fixed; `scripts/fetch-python*.js`, `_clean_listado_template.py`, `__pycache__/`, empty `tests/` deleted.
- Untrack `public/js/chunks/` + `app.bundle.*`; verify a local pack still ships the bundle; `git status` clean after build.
- iPad/web session-scoped storage: clinical localStorage keys wiped on logout/session end.
- `globalThis.__rplusDbManager` replaced with explicit injection at one composition point (`server.js`, `lan-squad/auth-router.js`).

## Phase 6 — procesarLabs decomposition (audit M2.2)

Characterization tests first, from real anonymized SOME lab-paste fixtures; only then decompose the complexity-49 parser (`public/js/labs.js:3101`) into functions ≤ complexity 15. Acceptance: zero output diffs against fixtures; lint errors in `labs.js` trend down.

## Cross-cutting verification

- During UI phases (no CI yet): full local suite + smoke matrix (surface × Sala/Interconsulta × light/dark × desktop/iPad) before each merge; `metrics:check` run locally so UI work cannot add lint debt.
- Restyling commits never touch clinical logic files; behavior changes live in separate commits so regressions bisect cleanly.
- From Phase 4 on, CI enforces everything on push.

## Risks

1. **UI overhaul runs before CI exists** — user's accepted trade-off; mitigated by the manual verification discipline above.
2. **`backdrop-filter` performance with GPU disabled** — tested in Phase 1 on oldest target hardware; solid-color fallback token ready.
3. **CSP (Phase 5) may flag UI inline styles** — new UI written CSP-clean from the start.
4. **122 newly-activated tests may surface real failures in Phase 4** — that is the point; triage is budgeted.

## Explicitly out of scope

Per the audit: no TypeScript migration, no framework, no TLS-on-LAN, no bulk lint-cleanup of legacy files, no replacement of the metrics system. Additionally: no data-model changes and no new clinical features in this effort.
