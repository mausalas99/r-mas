# Spec B — Chrome + Overlay Kit

> **Program:** [`2026-08-03-apple-hybrid-ui-overhaul-program.md`](2026-08-03-apple-hybrid-ui-overhaul-program.md)  
> **Depends on:** Spec A (Foundation)  
> **Next:** Spec C (Clinical work surfaces)

**Date:** 2026-08-03  
**Status:** Draft for review  

---

## Problem

Shell chrome and overlays are the always-on language of R+. Today they mix Hallmark indigo, inconsistent glass, and CSS keyframe closes that are not interruptible. ⌘K and toasts exist but do not yet match Sonner/cmdk/base-ui contracts under Hybrid H.

## Goals

- [ ] Shell, sidebar, tabs, titlebar patient context, LiveSync chip restyled to Hybrid H (light+dark).
- [ ] New `public/js/ui-overlay.mjs`: dialog, sheet, menu primitives (base-ui contracts, ESM).
- [ ] Toasts: Sonner-grade behavior + glass material.
- [ ] ⌘K: glass material H; **zero open/close animation**; instant subsequent feel.
- [ ] Popovers/menus origin-aware; modals centered; sheets edge-anchored with drag + velocity dismiss via `motion`.
- [ ] Pressable chrome controls use `--press-scale`.

## Non-goals

- Redesigning Labs table layout, Pase board structure, Conexión step content (Spec C).
- Rewriting every historical modal markup in one PR — migrate high-traffic overlays first; leave a compatibility path through `modal-dismiss.mjs`.
- Adding React cmdk/Sonner/base-ui packages.

---

## Architecture

```
tokens (A)
   │
   ├─ shell CSS (sidebar, tabs, titlebar)
   │
   └─ ui-overlay.mjs ──► dialog | sheet | menu
            │
            ├─ modal-dismiss.mjs (Esc / backdrop stack — keep)
            ├─ ui-motion.mjs (springs)
            └─ consumers: command-palette, ui-toast, app-shell modals, eventualidades (C), …
```

### `ui-overlay.mjs` contracts (base-ui-inspired)

| Behavior | Rule |
| --- | --- |
| Open | Focus trap inside; store previously focused el |
| Close | Esc, backdrop click (configurable), explicit dismiss; restore focus |
| Stack | Last registered wins (reuse `modal-dismiss` stack order) |
| Sheet | Drag 1:1 with pointer capture; rubber-band; project velocity on release; interruptible spring |
| Dialog | Centered; scale from `0.95`+opacity (never `scale(0)`); no drag required |
| Menu / popover | `transform-origin` from trigger; light glass |
| Nested | Inner layer **solid elevated**, not second glass |
| Reduced motion | Opacity only; sheets do not slide |

### Toast (Sonner principles)

Upgrade `ui-toast.mjs`:

- Swipe-dismiss with velocity threshold (~0.11 px/ms equivalent).
- Pause timers on hover and `document.hidden`.
- Max stack 3 (keep); gap filler for hover continuity if needed.
- Glass material token; action slot (“Deshacer”) optional API.
- Enter/exit same axis (spatial consistency).
- Transitions, not keyframes, for interruptibility.

### ⌘K (cmdk principles)

- **No** open/close animation (Emil frequency rule).
- Glass panel; solid results rows for legibility.
- Keep fuzzy model (`command-palette-model.mjs`).
- Dark denser glass; reduced transparency → solid.

---

## Chrome surfaces

### Sidebar

- Solid `--color-surface`.
- Active patient: left ink bar `2.5px` + subtle fill (not indigo wash).
- Auto-hide strip unchanged behaviorally.

### Tabs

- Underline active (2px ink), not floating pill.
- Keyboard tab changes: no motion.

### LiveSync / Nube chip

- Solid chip background; semantic dot color unchanged in meaning.
- Must remain readable on both themes (no low-contrast muted green).

### Titlebar / patient context

- System type; muted meta; traffic-light gap preserved for Electron.

---

## CSS entry points

| Area | Likely files |
| --- | --- |
| Shell / sidebar / tabs | `public/styles/sidebar.css`, shell partials CSS, `overlays.css` |
| Toasts | toast rules in `overlays.css` or dedicated |
| ⌘K | existing command palette CSS |
| New overlay primitives | `public/styles/ui-overlay.css` (new, keep ≤600 lines) |

Apply glass via utility classes: `.material-glass`, `.material-solid-elevated`.

---

## Migration strategy

1. Ship `ui-overlay.mjs` + CSS utilities.
2. Migrate: toast, ⌘K chrome, one representative dialog (e.g. recovery or settings subsection), and **one demo/stub sheet** proving drag+velocity dismiss. Full Eventualidades sheet migration is **Spec C** (do not double-build).
3. Point `closeOverlayAnimated` through motion springs when motion allowed.
4. Leave obscure modals on old markup until Spec C/D touches them — but they must inherit token colors from A.

---

## Testing

- `ui-toast` tests: swipe dismiss, pause on hidden, stack cap.
- `ui-overlay` tests: focus restore, Esc, reduced motion path, nested solid rule (class assertion).
- `command-palette` tests: open has no transition class / duration 0.
- Manual: light/dark shell; drag sheet interrupt mid-close; LiveSync chip on glass-less chrome.

## Debt / boot

- Dynamic `import('motion')` only if needed to protect boot — prefer static import from `ui-motion.mjs` already on path; do **not** add new static imports from `app-runtimes.mjs` for cold features.
- New files must pass Tier 1 complexity/length.

## Success criteria

- [ ] Chrome reads Hybrid H in light and dark.
- [ ] Toast swipe + glass works; ⌘K feels instant.
- [ ] At least one sheet uses interruptible spring dismiss.
- [ ] No React dependencies added.
