# Apple Hybrid UI Overhaul — Program

> **For implementation:** After review, use **writing-plans** per phase (A → B → C → D). Do not implement a later phase until the prior phase’s plan is done or explicitly parallelized.

**Date:** 2026-08-03  
**Status:** Draft for review  
**Codename:** Hybrid H (Soft workbench + Glass floating)  
**Related skills:** `apple-design`, `emil-design-eng`, `pick-ui-library`  
**Replaces (visual language):** Hallmark “Quiet workbench” chrome accents (indigo) with ink-first Hybrid H; keeps clinical density and Tufte chart rules.

---

## Decisions locked (brainstorm 2026-08-03)

| Decision | Choice |
| --- | --- |
| Visual direction | **H — Hybrid**: solid workbench + glass only on floating layers |
| Dark mode | **First-class** — light and dark designed together |
| Scope | Full app, **split into 4 specs** |
| Stack | ESM vanilla Electron — **no React** |
| New dependency | **`motion`** (motion.dev) only |
| Ports (principles, not React libs) | Sonner → `ui-toast.mjs`; cmdk → `command-palette.mjs`; base-ui → overlay kit |
| Accent | Ink `#1c1c1e` / dark `#f5f5f7` — **retire indigo as brand accent** |
| Type | System UI (`-apple-system` / SF) for chrome; keep mono for labs/values |

---

## Phase map

```
A Foundation ──► B Chrome + Overlay kit ──► C Clinical work surfaces ──► D Rest of app
```

| Spec | File | Shippable outcome |
| --- | --- | --- |
| **A** | [`2026-08-03-apple-hybrid-ui-foundation-design.md`](2026-08-03-apple-hybrid-ui-foundation-design.md) | Tokens H light/dark, materials, motion dep, easings, a11y media queries |
| **B** | [`2026-08-03-apple-hybrid-ui-chrome-overlays-design.md`](2026-08-03-apple-hybrid-ui-chrome-overlays-design.md) | Shell/sidebar/tabs + toast/sheet/dialog/⌘K kit |
| **C** | [`2026-08-03-apple-hybrid-ui-clinical-surfaces-design.md`](2026-08-03-apple-hybrid-ui-clinical-surfaces-design.md) | Labs, Eventualidades, Pase, Conexión |
| **D** | [`2026-08-03-apple-hybrid-ui-rest-of-app-design.md`](2026-08-03-apple-hybrid-ui-rest-of-app-design.md) | Expediente, Manejo, Agenda, EA, Guardia, Settings, leftovers |

Each phase must leave the app **usable on guardia** — no half-migrated chrome that breaks contrast or LiveSync trust.

---

## North-star fit

- **Lower TTD:** press feedback + interruptible sheets; ⌘K stays instant (no open animation).
- **LiveSync trust:** connection chip remains obvious in both themes; no glass washing status color.
- **Anti-goals:** no unmanaged SaaS chrome; no “demo glass” on lab tables; no motion on high-frequency keyboard paths.

---

## Library matrix (pick-ui-library × R+)

| Curated | Action | Target |
| --- | --- | --- |
| motion | **Install** | Springs, sheet drag, interruptible close |
| Sonner | Port principles | `public/js/ui-toast.mjs` + toast CSS |
| cmdk | Port principles | `public/js/features/command-palette.mjs` |
| base-ui | Port contracts | `modal-dismiss.mjs` + new `ui-overlay.mjs` |
| cva / clsx / zustand / recharts / Virtuoso / dnd-kit | **Out** | Tokens + existing app-state + Tufte charts |

---

## Material rules (global)

1. **Solid** for sidebar, tabs, patient content, lab tables, Pase board, settings forms.
2. **Glass** for sheets, dialogs, menus, toasts, ⌘K — floating layers only.
3. **Never glass on glass.** Nested overlays use solid elevated surface on the inner layer.
4. **Dark glass is denser** (`rgba` higher opacity) than light glass.
5. Honor `prefers-reduced-transparency` → solid frost; `prefers-reduced-motion` → opacity cross-fade only.

---

## Motion rules (global · Emil + Apple)

| Frequency | Policy |
| --- | --- |
| ⌘K, tab switch via keyboard, J/K patient | **No animation** |
| Button press | `scale(0.97)`, 100–160ms ease-out |
| Toast / sheet / dialog | Standard (≤300ms UI; springs for drag) |
| Onboarding / rare delight | Allowed, still restrained |

Easings (tokens):

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

Springs (motion): default critically damped (`bounce: 0`); bounce only after flick momentum.

---

## Success criteria (program)

- [ ] Guardia R1 can work a full turn in light **and** dark without contrast regressions on alterados.
- [ ] Floating layers read as materials; workbench stays dense and calm.
- [ ] `npm run metrics:check` does not regress; no new cold boot imports of feature modules.
- [ ] `design.md` + `tokens.css` become the Hybrid H source of truth.
- [ ] Phases A→D land as separate plans/PRs; program doc stays the index.

## Non-goals (program)

- Rewriting renderer to React / adopting Sonner|cmdk|base-ui npm React packages.
- Redesigning clinical parsers, LAN/Nube sync protocol, or doc generators.
- Marketing gradients, purple themes, or decorative hero chrome.
- Animating every list insert or keyboard navigation.

---

## Doc / context sync (when implementing)

- Update `design.md` and `docs/core/06-design-system.md` in Spec A.
- Update `.cursor/rules/project-context.mdc` changelog on architectural landings.
- Update `docs/features/features-index.md` only if a new user-facing domain appears (unlikely — this is chrome/language).

---

## Review gate

Approve this program + Specs A–D before writing implementation plans. Prefer implementing **A then B** before opening C/D plans so tokens/overlays are real.
