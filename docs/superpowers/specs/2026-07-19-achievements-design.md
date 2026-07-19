# Achievements (Logros) — Design Spec

**Date:** 2026-07-19  
**Status:** Approved (brainstorming)  
**Component:** Event-driven achievements engine, SQLCipher progress, Learn Hub “Logros” shelf, quiet unlock toast  
**Application:** R+ — Electron renderer + clinical DB  
**Builds on:** [2026-06-06-guardia-v7-onboarding-design.md](./2026-06-06-guardia-v7-onboarding-design.md), Learn Hub (`features/settings-help/learn-hub.mjs`), `design.md` (Quiet workbench)  
**North star check:** Lowers TTD indirectly by nudging Learn Hub completion and real magic-moment workflows; must not add habit/streak game loops that steal patient time.

## Summary

Add a **catalog-forward achievements system** that celebrates (1) onboarding / Learn Hub milestones and (2) real workflow mastery (labs → note, LiveSync, entrega, etc.). Unlocks are **per clinical user** in SQLCipher. Day-to-day UX is a **quiet Spanish toast** on unlock plus a **Logros shelf** inside Aprender R+. No XP, no streaks, no LAN leaderboards.

## Product decisions (locked)

| Topic | Decision |
|--------|----------|
| Purpose | Onboarding nudge **+** skill mastery (not habit/retention streaks) |
| Surface | Quiet toast on unlock + browse shelf in Learn Hub (Aprender R+) |
| Catalog size | **20+** entries from day one (stubs allowed; locked until earned) |
| Locked visibility | Most show title + hint; **~2–3 secrets** as silhouette + `???` |
| Identity / storage | Per clinical user in SQLCipher (schema bump) |
| Gamification | **No** XP, seasons, streaks, or LAN vanity sync |
| Mobile / iPad shelf | Out of scope for v1 UI; engine may still unlock if hooks fire |
| Tour/demo actions | **Do** count (practice = mastery) |
| Failed / cancelled actions | Do **not** emit |
| Historical backfill | **None** for v1 — empty progress for existing users |
| Boot graph | Lazy via settings-help / Learn Hub; no new eager import in `app.js` |

## Problem

1. Learn Hub progress is chapter checkmarks only — no lightweight celebration when a resident finishes a module or hits the magic moment.
2. Real workflow milestones (first SOME process, first note export, first LiveSync join) are invisible; mastery is not reinforced.
3. A full game layer (XP/leaderboards) would violate the north-star anti-goal of tool time over patient time.

## Architecture

Event-driven engine with a static catalog:

```
Workflow / Tour hooks
  → emitAchievementEvent(eventId, ctx?)
achievements-engine
  → match catalog rules → unlock?
SQLCipher clinical_user_achievements (per user)
  → on unlock: quiet toast + Learn Hub Logros shelf refresh
```

### Modules (proposed paths)

| Piece | Path | Role |
|-------|------|------|
| Catalog | `data/achievements-catalog.mjs` | Static registry (id, title, hint, category, secret, events, once) |
| Engine | `public/js/achievements-engine.mjs` | Pure match/unlock helpers; no DOM |
| Runtime / emit | `public/js/achievements-runtime.mjs` | Load progress, emit, persist via IPC, fire toast |
| UI shelf | `public/js/features/settings-help/learn-hub-achievements.mjs` | Logros grid inside Learn Hub |
| Toast | Reuse existing toast helper (`ui-toast`) with Spanish copy |
| Schema | `lib/db/schema-migrate-v22-*.mjs` | New table + migrate tests |
| IPC | `lib/db/ipc-handlers*.mjs` + `preload.js` | get/set unlocks for signed-in user |

### Catalog entry shape

```js
{
  id: 'labs.first_procesar',
  title: 'Laboratoriazo',
  hint: 'Pegá y procesá tu primer SOME',
  category: 'labs',       // onboarding | labs | docs | lan | entrega | equipos | …
  secret: false,          // true → silhouette + "???" until unlocked
  events: ['labs.procesar'],
  once: true
}
```

Spanish UI strings only for `title` / `hint`. Catalog may include stub rows whose events are not yet hooked — they remain locked until hooks ship.

### Initial catalog themes (20+ IDs in plan)

Exact titles/copy land in the implementation plan. v1 themes:

- **Onboarding:** Fundamentos modules, Sala/IC/Guardia chapter completes, first full branch  
- **Labs:** first SOME process, tendencias open, gasometría / coag / cultivo touchpoints (stubs OK)  
- **Docs:** first note export, first indicaciones export  
- **LAN / turn:** join LiveSync, start host, complete entrega, use equipos queue  
- **Secrets (~2–3):** rare mastery (e.g. full magic-moment chain labs→tendencias→note in one session) — spoiler-light until unlocked

### Persistence

Schema version **21 → 22**:

```
clinical_user_achievements
  user_id TEXT PRIMARY KEY
  unlocked_json TEXT   -- { "achievement.id": unlockedAtMs, ... }
  updated_at INTEGER
```

- Payload is achievement IDs + timestamps only — **never PHI** (no patient ids, names, lab values).
- Progress is keyed to the signed-in clinical user identity.
- No LAN mirror of unlocks in v1.

### Events (v1 set)

Named events only. Payload: `{ event, ts }` plus optional non-PHI metadata (e.g. `chapterId`).

| Domain | Events |
|--------|--------|
| Onboarding | `tour.chapter_complete`, `tour.branch_complete`, `fundamentos.module_complete` |
| Labs / docs | `labs.procesar`, `tendencias.open`, `doc.note_exported`, `doc.indicaciones_exported` |
| Team / turn | `lan.joined`, `lan.host_started`, `entrega.completed`, `equipos.queue_used` |

Call sites add a one-liner after the real success path, e.g. `emitAchievementEvent('labs.procesar')`. The engine maps events → catalog rows. `once: true` prevents re-toasts on repeat actions.

### UI

**Unlock toast**

- Quiet bottom-right toast (~3.5s).
- Copy: “Logro desbloqueado” + title + hint.
- No modal, no sound, no confetti.
- Queue if multiple unlocks fire in one burst (rare).

**Learn Hub — Logros shelf**

- Section below modules in Aprender R+.
- Counter `unlocked / total`.
- Tile states: unlocked (full title); locked (greyed title, hover hint); secret (silhouette + `???`).
- Uses existing Learn Hub chrome and design tokens — not a new Ajustes destination.

## Edge cases

| Case | Behavior |
|------|----------|
| No clinical user signed in | Events no-op until session exists |
| Already unlocked | Silent ignore (`once`) — no toast spam |
| IPC / DB fail | Do not block the clinical action; retry persist on next successful emit |
| Existing DBs | Migrate to v22 with empty table — no historical backfill |
| Mobile / iPad | Shelf out of scope for v1; hooks may still unlock |
| Demo / tour patients | Events may fire; unlocks attach to the real clinical user |

## Out of scope (v1)

- XP, levels, seasons, daily streaks
- LAN / team leaderboards or syncing vanity metrics
- Mobile Logros shelf
- Backfilling unlocks from historical lab/doc activity
- New header badge / chrome destination outside Learn Hub

## Testing

Targeted only (`npm run test:one`):

- Engine: event → unlock set; `once`; secret visibility helpers; catalog stubs do not throw
- Schema: migrate 21 → 22 creates `clinical_user_achievements`
- Optional: IPC get/set with fake `ipcMain` harness pattern

Do **not** run full `npm test` during implementation.

## Success criteria

1. Completing a Learn Hub chapter unlocks the matching onboarding logro (toast + shelf).
2. First successful SOME process / note export / LiveSync join unlocks the matching mastery logro.
3. Secrets stay spoiler-light until unlocked.
4. Debt gate: Tier 1 budgets on touched files; no new boot-graph eager imports; `npm run metrics:check` still passes.
5. No PHI in achievement payloads or persisted JSON.

## Implementation notes (for plan)

- Prefer new focused modules over growing `learn-hub.mjs` / `labs.js` beyond Tier 1 budgets.
- Catalog lives in `data/` next to release-notes style static content.
- Wire hooks at the smallest successful-exit points (after `procesarLabs` success, after doc export success, after tour chapter complete, etc.).
- Update `docs/features/features-index.md` and `project-context.mdc` changelog when shipping.
