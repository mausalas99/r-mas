# Diseño: Guía clínica unificada (Manejo B/C/D)

**Fecha:** 2026-05-26  
**Estado:** Aprobado (2026-05-26)  
**Alcance:** Reorganizar Patologías, Infusiones y ATB bajo una pestaña con vista lectura; simplificar layout y navegación. Electrolitos sin cambios de arquitectura.

---

## Problema

Manejo acumuló tres subpestañas (Patologías, Infusiones, ATB) que comparten el mismo patrón lista + sidebar + tarjetas, pero con modelos mentales distintos. El flujo principal del usuario es **patología → guía paso a paso**; infusiones y ATB son apoyo.

Síntomas reportados:

- Información difícil de ver (split 38/62, doble scroll, toolbar pesado).
- Layout confuso (grid de tarjetas-boton, modales encima del panel de detalle).
- Tres “apps” dentro de Manejo sin hilo conductor.

## Objetivos

1. Un solo lugar: **Guía clínica** con modos Patología | Infusión | Antibiótico.
2. Vista **lectura a ancho completo** al seleccionar un ítem (índice oculto, `← Índice`).
3. Patología: guía numerada vertical; pedido SOME **inline** (sin modal obligatorio).
4. Reducir chrome: índices compactos, filtros en una fila, cultivo/antibiograma colapsables en ATB.

## No objetivos (esta iteración)

- Rediseñar Electrolitos.
- Cambiar lógica clínica (catálogos, calculadoras, evaluación renal, cultivo).
- Copiar/pegar SOME masivo (sigue deshabilitado si `MANEJO_SOME_COPY_UI` es false).
- Refactor completo de `manejo.mjs` en un solo PR (se permite faseado).

---

## Arquitectura de información

### Pestañas Manejo (expediente)

| Pestaña | Rol |
|---------|-----|
| Electrolitos | Sin cambio de rol |
| Guía clínica | Reemplaza Patologías, Infusiones, ATB |

### Guía clínica — estados

```
Modo:     patologia | infusion | atb     (segmento superior, persistido)
Vista:    indice | lectura                 (mutuamente excluyentes)
Contexto: { fromPathologyId?, fromProtocolId? }  (breadcrumb / deep links)
```

- Cambiar de modo estando en `lectura` → volver a `indice` de ese modo.
- `← Índice` restaura búsqueda/filtros de sesión del modo actual.

### Deep links (opcional v1, recomendado)

- `manejo` subtab `guia` + query o session: `guiaMode`, `guiaView`, `guiaId`
- Ejemplo: abrir lectura directa de `hyperkalemia-acute` en modo patología.

---

## Modo Patología

### Índice

- Búsqueda + filtro rama (menú) + contador.
- Lista: filas compactas (título, rama, badge “N ítems”); **sin** snippet largo ni tarjetas `manejo-card`.
- Agrupación por rama solo cuando filtro = “Todas”.

### Lectura (ancho completo)

**Barra sticky:** `← Índice` · chip rama · título (H1).

**Contenido (scroll único):**

1. Resumen (visible).
2. Definición en `<details>` colapsado.
3. Bloque CAD/EHH si `cadEhhMode` (arriba, no al final).
4. **Línea de tiempo:** por cada `section` del catálogo:
   - H2 = `section.title`
   - Pasos numerados globalmente (1, 2, 3…).
   - `text`: párrafo.
   - `protocol` / `recommendation`: fila compacta + chip 1.ª línea / Alternativa + criterio; acción “Ver pedido SOME” expande panel **inline** (reutilizar `buildProtocolDetailPanel` compacto, sin modal).
   - Pie del expand: enlace terciario “Abrir en modo Infusión”.
5. `<details>` “Infusiones vinculadas (N)” — lista compacta (reemplaza sección grande “Otras infusiones”).
6. Monitoreo — bloque visible.
7. Notas — compacto.
8. Patologías relacionadas — chips; navegan a lectura de otra patología.

**Eliminar del flujo principal:** `openPathologyFocusModal`, grid `manejo-pathology-item-grid`, split lista/detalle en patología.

---

## Modo Infusión

### Índice

- Búsqueda; chips Favoritos | Recientes | Todos; menús Categoría y Uso; toggle “Con calculadora”.
- `+ Infusión` en toolbar.
- Referencia bomba insulina en `<details>` colapsado por defecto.
- Lista compacta (nombre, categoría, icono calculadora).

### Lectura

- `← Índice` · categoría · título.
- Orden: Indicación → Administración/SOME (+ calculadora) → Notas.
- Pie: favorito, editar, vínculos a patologías.
- Entrada desde patología: cambiar modo + lectura + breadcrumb opcional.

---

## Modo Antibiótico

### Índice

- Banner cultivo (si hay aislamiento): organismo, sitio, fecha, selector multi-aislado; antibiograma en `<details>`.
- Chip eTFG/Cr junto a búsqueda.
- Filtros RIS (S/R/I) solo con cultivo activo; familia en menú.
- Lista compacta con badge sensibilidad vs aislado activo.

### Lectura

- `← Índice` · familia · nombre.
- Orden: Indicaciones → Ajuste renal → Pedido SOME → Cultivo (resumen sensibilidad).
- Sin paneles RIS flotantes en `document.body`; datos en lectura o banner colapsable.

---

## Navegación cruzada

| Origen | Acción | Destino |
|--------|--------|---------|
| Patología, expand inline | Ver pedido SOME | Panel bajo el paso |
| Patología, enlace terciario | Abrir en modo Infusión | `modo=infusion`, `lectura`, `id=protocol` |
| Patología, enlace ATB | Abrir en modo ATB | `modo=atb`, `lectura`, `id=drug` |
| Infusión lectura | Patologías que lo usan | `modo=patologia`, `lectura`, `id=pathology` |

`← Índice` no cruza modos; solo resetea vista del modo actual.

---

## Impacto técnico (implementación)

### Nuevos / refactor sugerido

| Unidad | Responsabilidad |
|--------|-----------------|
| `public/js/features/manejo-guia.mjs` | Shell: modo, vista índice/lectura, segmento, persistencia |
| `public/js/features/manejo-guia-patologia.mjs` | Índice + lectura patología (extraer de `manejo-patologias.mjs`) |
| `public/js/features/manejo-guia-infusion.mjs` | Índice + lectura infusiones (extraer de `renderManejoProtocolos`) |
| `public/js/features/manejo-guia-atb.mjs` | Índice + lectura ATB (extraer de `renderManejoAtb`) |
| `public/styles/manejo-guia.css` | Layout lectura, índice compacto, timeline; reducir reglas muertas de split |

### Cambios en existentes

- `manejo.mjs`: `MANEJO_SUBTABS` → `electrolitos`, `guia`; `renderManejo` delega guía al shell.
- `manejo-patologias.mjs`: lógica de detalle migra a guía-patologia; mantener catálogo/helpers.
- Migrar `setActiveManejoSubtab('infusiones'|'patologias'|'atb')` → API guía unificada.
- Session keys: prefijo `manejoGuia.*`; alias temporal para keys viejas si hace falta una release.

### CSS

- Deprecar en guía: `.manejo-proto-split`, `.manejo-proto-detail-col` (desktop), modales patología como layout principal.
- Tokens: una columna, `max-width` lectura ~72ch para párrafos largos; H2 con acento de rama (borde izquierdo 3px).

### Compatibilidad

- Links “Ver en Infusiones” en código legacy → redirigir a guía modo infusión lectura.
- `openAtbDrug`, `setPathologySelectedId`: adaptar a API guía.

### Fases sugeridas

1. Shell guía + modo patología (índice + lectura timeline) — mayor valor.
2. Modo infusión lectura + índice compacto.
3. Modo ATB + banner cultivo colapsable.
4. Limpieza CSS y eliminación split/modal paths muertos.

---

## Criterios de éxito

| Criterio | Medida |
|----------|--------|
| Legibilidad patología | En &lt;3 s: resumen, paso 1 numerado, acción SOME visible sin modal |
| Píxeles útiles | En lectura, ≥85% ancho útil para contenido (sin columna lista visible) |
| Profundidad de UI | Flujo patología→SOME: máx. 2 niveles (lectura + expand), no 3 (lista+panel+modal) |
| Paridad funcional | Favoritos, recientes, calculadoras, cultivo/RIS, renal, custom protocols siguen operativos |
| Regresión | Tests existentes de catálogos/links; smoke manual en 375px y desktop |

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| PR enorme | Fases 1–4; shell con feature flag `manejoGuiaV2` opcional |
| Usuarios acostumbrados a 4 subpestañas | Segmento claro; electrolitos igual |
| Pérdida de “ver dos cosas a la vez” | Expand inline cubre SOME; infusión full en modo dedicado |

---

## Decisiones registradas (brainstorming)

- Flujo principal: patología primero.
- Una pestaña Guía clínica; tres modos internos incl. ATB.
- Layout lectura A: índice oculto, ancho completo, volver atrás.
- Sección 1 arquitectura: aprobada.
- Sección 2 patología lectura: aprobada.
- Sección 3 infusión/ATB: aprobada.

---

## Siguiente paso

Tras aprobación de este spec: plan de implementación (`writing-plans`) con tareas por fase y puntos de verificación.
