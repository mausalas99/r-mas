# R+ — Design system (Hybrid H)

**Genre:** utilitarian clinical · **Theme:** Hybrid H (solid workbench + glass floating)  
**Program:** `docs/superpowers/specs/2026-08-03-apple-hybrid-ui-overhaul-program.md`  
**Spec:** `docs/superpowers/specs/2026-08-13-warm-instrument-ui-design.md`  
**Última actualización:** Warm instrument (2026-08-13)

## Principios

- Densidad alta sin ruido: bordes y tipografía antes que color.
- Acento: **ink** en claro (`--color-accent` = `--color-ink`); en oscuro `#6eb6ff` en primarios; chips / `--color-accent-soft` = elevated en claro, lavado azul clínico en oscuro (sin ocre). Éxito/error semánticos, no segundo brand.
- **Solid** para sidebar, tabs, contenido, tablas labs, Pase; **glass** solo en capas flotantes (sheets, dialogs, menús, toasts, ⌘K).
- Nunca glass-on-glass: overlay anidado = superficie elevated sólida.
- Sin gradientes en chrome/CTAs; sin glow índigo/púrpura.
- Tipografía: system UI (`-apple-system` / SF) para chrome; IBM Plex Mono para labs/valores.
- Motion: Emil easings; press `scale(0.97)`; ⌘K **sin** animación open/close; springs vía `ui-motion.mjs` + `motion`.

## Tokens (fuente de verdad)

Archivo: `public/tokens.css`

| Token | Uso |
| --- | --- |
| `--color-paper` / `--color-surface` / `--color-content` / `--color-elevated` | App gap, chrome, well, cards/tables |
| `--color-ink` / `--color-ink-muted` | Texto |
| `--color-accent` | Acciones / tab activa: ink en claro; `#6eb6ff` en oscuro (primarios) |
| `--color-accent-soft` / `--color-accent-soft-text` | Chips: elevated (light) / clinical blue wash (dark); never ochre |
| `--color-danger` / `--color-success` | Alterados / LiveSync live |
| `--material-glass-*` | Floating layers only |
| `--ease-out` / `--ease-in-out` / `--ease-drawer` | Emil curves |
| `--press-scale` / `--dur-press` / `--dur-ui` | Press + UI timing |
| `--font-ui` / `--font-mono` | System UI + mono labs |

Legacy aliases (`--action`, `--surface`, `--text`, `--overlay-bg`, …) apuntan a tokens Hybrid H.

## Materiales

1. Solid workbench — hairline borders; soft shadow solo en glass flotante.
2. Glass — `color-mix` + blur; dark denser than light.
3. `prefers-reduced-transparency` → glass = elevated solid, blur 0.

## Motion

| Frecuencia | Política |
| --- | --- |
| ⌘K, J/K paciente, tabs teclado | Sin animación |
| Press | Action buttons + `.ui-pressable` → `--press-scale` |
| Toast / sheet / dialog | Spec B; springs `springTo` |
| Reduced motion | Opacity snap / cross-fade only |

## Temas

- `html` — claro Hybrid H  
- `html.dark` — oscuro peer (first-class)  
- `html.high-contrast` / `.dark` — WCAG; accent ink  

## No hacer (anti-slop)

- Índigo/púrpura como brand accent.
- Glass en tablas labs o celdas Pase.
- Gradientes en botones/cards; multi-layer glow.
- Hex sueltos en CSS nuevo: siempre `var(--…)`.
- Animar navegación de alta frecuencia.
- Primary relleno blanco en oscuro.
- `999px` en action buttons (`--radius-control` 8px).
- Voseo en copy UI (tú o impersonal).

## Stamp (CSS)

```css
/* Hybrid H · soft workbench + glass floating · 2026-08-03
 * contrast: pass (tokens + HC)
 */
```


## Estado del programa

**Hybrid H: completo** (Specs A–D, 2026-08-03). **Warm instrument** (2026-08-13): craft sobre Hybrid H — ver spec. Hallmark / Quiet workbench queda como referencia histórica.

### Excepciones documentadas (no brand accent)

- **Labs panel headers** (`--lab-header-indigo`, `--lab-header-green`, etc.): identidad de tipo de panel SOME, no acento de marca.
- **Series EA/Tendencias**: multi-hue para discriminación de series; ejes/labels desde tokens.
