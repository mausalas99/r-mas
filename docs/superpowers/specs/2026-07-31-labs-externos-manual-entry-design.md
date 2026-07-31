# Labs externos (entrada manual) + unificar Actualizar labs

**Fecha:** 2026-07-31  
**Estado:** Approved  
**Dependencias:** `pushLabHistory`, `lab-panel`, `labs-panel-defs`, `lab-repo-batch-import`, `lab-repo-import`

## Resumen

Permitir capturar un estudio de laboratorio **externo / manual** eligiendo el tipo y llenando valores en celdas. El set resultante entra al historial como cualquier otro (tendencias, nota, LiveSync), marcado como externo.

En el mismo corte de UI: quitar **Importar del repositorio** y unificarlo en **Actualizar labs** (antes “de mi equipo”): con paciente activo solo fechas; sin paciente, lista de equipo con checkboxes.

## Decisiones de producto

| Tema | Decisión |
|------|----------|
| Caso principal v1 | Lab privado / fuera del hospital (papel, PDF, WhatsApp); hospital mal parseado es secundario |
| Catálogo | Amplio desde día 1 — section keys core + extendidos existentes |
| UX captura | Un tipo → grilla → Guardar (un set). Sin multi-tipo en el mismo set |
| Destino | Historial completo + tendencias + nota + LiveSync (`origin: 'externo'`) |
| Fecha / hora | Fecha obligatoria (default hoy); hora opcional |
| Entry point | Toolbar Laboratorio: `Procesar` · `Labs externos` · `Actualizar labs` · … |
| Repo | Un solo botón **Actualizar labs**; paciente activo → solo fechas; equipo → checkboxes |
| Fuera de v1 | OCR, cultivos multi-línea complejos, editar set externo in-place, multi-tipo por set |

## Flujo — Labs externos

1. Paciente activo en Laboratorio → **Labs externos**.
2. Modal: selector de tipo, fecha (hoy), hora opcional, grilla de analitos del tipo.
3. Tipos `num`: input numérico (acepta coma/punto). Tipos `qual`: texto corto.
4. Celdas vacías se ignoran. Sin ningún valor → toast error, no guarda.
5. **Guardar** → sintetiza `resLabs` canónico → `pushLabHistory` → cierra → toast → refresca historial/tendencias.
6. Esc / Cancelar descarta.

## Flujo — Actualizar labs (unificado)

1. Toolbar: un botón **Actualizar labs** (elimina Importar del repositorio).
2. **Paciente activo** con registro → modal solo fechas (defaults como batch/import hoy) → fetch ese paciente.
3. **Sin paciente** (o flujo equipo) → modal batch actual con checkboxes mi equipo + fechas.
4. Reutiliza `labRepoFetchRangeFromDateInputs`, gate silencioso/preview y cola sidebar.
5. ⌘K: una acción “Actualizar labs” con el mismo comportamiento contextual.

## Modelo de datos

```js
{
  id, fecha, hora,
  resLabs: ['BH\tHb 12.4  Hto 37 …'],  // un chunk
  origin: 'externo',
  sourceText: '[entrada manual · BH]',  // stub; no pasa labSetIsFromSome
  parsed, parsedBySection, updatedAt, …
}
```

- Síntesis: `SectionKey + '\t' + key + ' ' + value` pairs unidos por espacio (mismo patrón que `parseNumericPanel_` / líneas BH/QS/ESC).
- Solo pares con valor no vacío.
- LiveSync: viaja en historial del paciente sin rama especial.

## Arquitectura

| Módulo | Rol |
|--------|-----|
| `public/js/labs-manual-catalog.mjs` | Catálogo tipos + campos (core + `LAB_EXTENDED_PANEL_DEFS`); puro |
| `public/js/labs-manual-synthesize.mjs` | `{ sectionKey, values }` → chunk `resLabs`; puro |
| `public/js/features/lab-manual-entry.mjs` | Modal UI + Guardar → `pushLabHistory` |
| `lab-repo-batch-import.mjs` | Modo single-patient vs equipo |
| Partials / CSS | Overlay modal, botón toolbar, grilla compacta |
| `lab-panel.mjs`, ⌘K, lazy routes | Wire + quitar import dedicado |

## Errores / edge cases

- Sin paciente activo → toast, no abre modal.
- Paciente sin registro en Actualizar (modo single) → toast / hint; no fetch vacío.
- Valores no numéricos en campos `num` → aceptar texto limpio si el usuario insiste (pegado “12,4”); normalizar coma→punto al sintetizar cuando sea número parseable.
- Qual: guardar texto trim tal cual (o abreviar pos/neg si coincide con convención existente).
- Re-proceso SOME del set: no aplica (`labSetIsFromSome` falso).

## Testing

- Unit: catálogo tiene section keys esperados; synthesize omite vacíos; formato `KEY\t…`.
- Unit/model: batch open en modo single vs team (si se extrae helper puro).
- Manual: BH externo → historial “Externo” → aparece en tendencias; Actualizar con paciente = solo fechas.

## Docs a actualizar al shippear

- `docs/features/features-index.md` — fila Labs externos + nota repo unificado
- `.cursor/rules/project-context.mdc` changelog (al commit arquitectónico)
