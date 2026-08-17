# R+ — Design system (Teal workbench)

**Genre:** utilitarian clinical · **Theme:** Teal workbench (solid workbench + glass floating)
**Program:** `docs/superpowers/specs/2026-08-17-teal-workbench-ui-design.md`
**Spec:** `docs/superpowers/specs/2026-08-17-teal-workbench-ui-design.md`
**Última actualización:** Teal workbench (2026-08-17)

## Principios

- Densidad alta sin ruido: bordes y tipografía antes que color.
- Acento: **teal** único, `--color-accent` = `oklch(0.52 0.09 195)` en claro, `oklch(0.62 0.09 195)` en oscuro (aclarado para 4.5:1 sobre `#1e222b`). Rojo/ámbar/verde solo para valores y estados clínicos — nunca acción, marca o decoración.
- **Solid** para sidebar, tabs, contenido, tablas labs, Pase; **glass** solo en capas flotantes (sheets, dialogs, menús, toasts, ⌘K).
- Nunca glass-on-glass: overlay anidado = superficie elevated sólida.
- Sin gradientes en chrome/CTAs; sin glow índigo/púrpura.
- Tipografía: system UI (`-apple-system` / SF) para chrome; IBM Plex Mono (400/500/600/700) para labs/valores/columnas comparables.
- Motion: skeleton shimmer al cargar (nunca spinner de página completa); pulso de alerta 2 repeticiones y para; ⌘K y navegación de alta frecuencia **sin** animación; `prefers-reduced-motion` colapsa todo a cambios instantáneos.

## Tokens (fuente de verdad)

Archivo: `public/tokens.css`

| Token | Uso |
| --- | --- |
| `--color-paper` / `--color-surface` / `--color-content` / `--color-elevated` | App gap, chrome, well, cards/tables |
| `--color-ink` / `--color-ink-muted` / `--color-ink-tertiary` | Texto |
| `--color-accent` | Acciones / tab activa: teal en claro y oscuro (único acento no clínico) |
| `--color-accent-soft` / `--color-accent-soft-text` | Chips activos, tinte de acento |
| `--color-danger` / `--color-danger-deep` / `--color-danger-tint(-strong)` / `--color-danger-ring` | Valores fuera de rango, pendiente vencido, halo de pulso |
| `--color-warn` | Falta información, en curso, sin asignar (base propia — ya no comparte valor con `--color-livesync-syncing`) |
| `--color-success` | Listo, dentro de rango, enviado |
| `--color-border-strong` / `--color-border-dashed` / `--color-empty-fill` / `--color-rail` | Borde de botón secundario, borde de estado vacío, relleno de estado vacío, pie de modal/barra secundaria |
| `--material-glass-*` | Floating layers only |
| `--ease-out` / `--ease-in-out` / `--ease-drawer` | Emil curves |
| `--press-scale` / `--dur-press` / `--dur-ui` | Press + UI timing |
| `--font-ui` / `--font-mono` | System UI + mono labs |

Legacy aliases (`--action`, `--surface`, `--text`, `--overlay-bg`, `--primary`, `--warn`, …) apuntan a los tokens de arriba — mismos nombres que Hybrid H, valores nuevos.

## Materiales

1. Solid workbench — hairline borders; soft shadow solo en glass flotante.
2. Glass — `color-mix` + blur; dark denser than light.
3. `prefers-reduced-transparency` → glass = elevated solid, blur 0.

## Motion

| Frecuencia | Política |
| --- | --- |
| ⌘K, J/K paciente, tabs teclado | Sin animación |
| Press | Action buttons + `.ui-pressable` → `--press-scale` |
| Carga de tabla/panel | Skeleton shimmer (`skel-shimmer`), nunca spinner de página completa |
| Valor fuera de rango | `.value-alert-pulse` — 2 repeticiones y para |
| Toast / sheet / dialog | Springs `springTo`, sin bounce en apertura |
| Reduced motion | Opacity snap / cross-fade only — todas las clases `*-pulse` / `*-sweep` a `animation: none` |

## Temas

- `html` — claro Teal workbench
- `html.dark` — oscuro peer (first-class, no es un invert)
- `html.high-contrast` / `.dark` — WCAG; acento vuelve a ink/negro-blanco (el teal se retira en HC, no es un caso de marca)

## No hacer (anti-slop)

- Índigo/púrpura como brand accent.
- Glass en tablas labs o celdas Pase.
- Gradientes en botones/cards; multi-layer glow.
- Hex sueltos en CSS nuevo: siempre `var(--…)`.
- Animar navegación de alta frecuencia.
- Primary relleno blanco en oscuro.
- `999px` en action buttons (`--radius-control` 8px) — 999px solo en chip/badge y barra de progreso.
- Rojo/ámbar/verde para algo que no sea un valor o estado clínico.
- Voseo en copy UI (tú o impersonal).

## Stamp (CSS)

```css
/* Teal workbench · solid workbench + glass floating · 2026-08-17
 * contrast: pass (tokens + HC)
 */
```

## Estado del programa

**Teal workbench: fase 1 completa** (tokens, fuentes, animaciones, docs) — ver `docs/superpowers/plans/2026-08-17-teal-workbench-ui-redesign.md`. La pantalla piloto real es `patient-dashboard/` (ya 100% basada en tokens, recoloreó gratis); faltan las piezas de layout nuevas (banda de contadores, filas alert-tint, estados vacíos) y las 11 pantallas restantes — roadmap en el plan.

### Excepciones documentadas (no brand accent)

- **Labs panel headers** (`--lab-header-indigo`, `--lab-header-green`, etc.): identidad de tipo de panel SOME, no acento de marca.
- **Series EA/Tendencias**: multi-hue para discriminación de series; ejes/labels desde tokens.

## Historial

- **Warm instrument** (2026-08-13): craft sobre Hybrid H — acento ink en claro, azul clínico `#6eb6ff` en oscuro. Reemplazado por Teal workbench, 4 días después, por decisión explícita del usuario. Spec: `docs/superpowers/specs/2026-08-13-warm-instrument-ui-design.md`.
- **Hybrid H** (2026-08-03): solid workbench + glass floating, acento ink. Fundación sobre la que se construyó Warm instrument. Spec: `docs/superpowers/specs/2026-08-03-apple-hybrid-ui-overhaul-program.md`.
- **Hallmark / Quiet workbench**: referencia histórica anterior a Hybrid H.
