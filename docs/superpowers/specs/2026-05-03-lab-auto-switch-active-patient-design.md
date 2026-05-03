# Diseño: cambio automático de paciente al pegar laboratorios de otro registro

**Estado:** Aprobado por producto (2026-05-03).  
**Alcance:** Flujo Laboratorio → parseo → historial / envío a nota.

## Problema

Al pegar un reporte en **Laboratorio**, `procesarLabs()` extrae expediente y datos del texto, pero `autoStoreProcessedLabResult()` y `enviarLabsANota()` asocian resultados al **`activeId`** actual. Si el usuario tiene seleccionado al paciente A y pega labs del paciente B, el historial y la nota pueden guardarse en el paciente equivocado. El banner del lab ya muestra el expediente del reporte, lo que aumenta la confusión si no coincide con el activo.

## Objetivo

- Si el **registro/expediente del reporte** coincide con **otro** paciente de la lista (distinto del activo), **cambiar el paciente activo** de forma silenciosa y mostrar un **toast breve** (sin modal, sin deshacer en v1).
- Si el reporte incluye registro pero **no** hay paciente con ese registro: **no** auto-guardar en el activo; avisar con toast y dejar el resultado parseado para acciones manuales (p. ej. «Agregar paciente del lab»).
- Si el reporte **no** incluye registro utilizable: mantener comportamiento actual (todo respecto al paciente activo).
- Reutilizar la misma resolución de «paciente destino» para auto-guardado y para envío a nota.

## Comportamiento detallado

### Resolución de paciente destino

1. Tras `result = procesarLabs(text)`, obtener `reg = String(result.patient.expediente || '').trim()`.
2. Si `reg` está vacío: `targetId = activeId` (o null si no hay activo — reglas actuales de «sin paciente» se mantienen).
3. Si `reg` no está vacío:
   - `match = findPatientByRegistro(reg)` (misma semántica que hoy: igualdad de string tras trim en implementación actual).
   - Si `match` existe y `match.id !== activeId`: `selectPatient(match.id)`; toast: mensaje corto con nombre y registro (copy exacto en implementación).
   - Si `match` existe y `match.id === activeId`: sin cambio de selección.
   - Si `match` es null: **no** ejecutar `pushLabHistory` ni auto-guardar en `activeId`; toast indicando registro no encontrado; `activeLab` / UI de salida permanecen para decisión del usuario.

### Orden de operaciones en `procesarReporte`

1. `result = procesarLabs(text)`.
2. Aplicar resolución de paciente y política de no-guardado si registro desconocido **antes** de `autoStoreProcessedLabResult`.
3. Solo si procede según reglas anteriores, llamar `autoStoreProcessedLabResult(result)` (o equivalente que use el `activeId` ya actualizado).

### Envío a nota

`enviarLabsANota` → `checkStudiosAndInsertLabs` debe operar sobre el paciente que corresponde al contexto actual. Tras el cambio en el paso de parseo, `activeId` ya debe ser el correcto; si en el futuro existe otro camino que no pase por `procesarReporte`, debe reutilizar el mismo helper de resolución para no divergir.

### Normalización de registro

v1: **misma lógica que `findPatientByRegistro`** (sin nuevos algoritmos de fuzzy). Extensiones futuras (guiones, espacios) se documentan como mejora opcional y no forman parte de este spec.

### Auditoría (opcional en implementación)

Entrada de auditoría opcional, p. ej. `lab-patient-auto-switch`, con registro y `targetId`, para diagnóstico; no bloqueante para v1.

## Arquitectura recomendada

- Helper **`resolveLabPastePatientContext(result)`** (nombre final en código puede variar): encapsula pasos de resolución, `selectPatient` si aplica, toasts, y devuelve `{ shouldAutoStore: boolean }` o llama a auto-store internamente según convención del archivo.
- **Un solo lugar** invocado desde `procesarReporte` (y cualquier otro entry point de parseo que se identifique en la planificación).
- Evitar duplicar lógica solo en `autoStoreProcessedLabResult` sin actualizar envío a nota.

## Casos límite

| Situación | Esperado |
|-----------|----------|
| Lista vacía / sin `activeId` | Reglas actuales (p. ej. picker al enviar) sin romper. |
| Registro en reporte = activo | Sin toast de cambio (opcional: no toast). |
| Duplicado de último set en historial | Tras switch, `isDuplicateLatestLabSet` usa el nuevo `activeId`. |
| Replay desde historial (`replayLabHistorySet`) | Fuera de alcance: no pega texto de otro registro desde cero. |

## Mejoras futuras (fuera de v1)

- Ajuste en **Ajustes**: confirmación o toast con deshacer.
- Advertencia si **nombre** del reporte difiere fuerte del perfil con mismo registro.
- Banner ámbar en Laboratorio si `activeLab` refiere a expediente distinto del activo (estado intermedio).
- Atajo «Pegar lab» desde Expediente.

## Pruebas sugeridas

- Reporte con registro de otro paciente: activo cambia, historial en el paciente correcto.
- Reporte con registro inexistente: no auto-guardado en activo; toast; UI sigue mostrando resultado.
- Reporte sin línea de expediente: comportamiento igual al actual respecto al activo.
- Envío a nota tras auto-switch: estudios en la nota del paciente correcto.

## Criterios de éxito

- No se añaden entradas de historial al paciente activo cuando el expediente del texto pertenece a otro paciente listado o a nadie (en el segundo caso, no guardar hasta acción explícita).
- Un solo flujo documentado para decidir paciente destino tras parseo.
