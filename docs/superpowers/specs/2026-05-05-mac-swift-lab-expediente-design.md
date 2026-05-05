# Design Spec: Migracion macOS a Swift nativo (Fase 1: Laboratorio + Expediente)

## Contexto

R+ actualmente corre sobre una base Electron comun para macOS y Windows. El objetivo es migrar macOS a una app nativa en Swift, mientras Windows se mantiene en Electron, sin romper compatibilidad de datos ni la experiencia clinica esperada.

Este diseno cubre la fase 1 de migracion: Laboratorio y Expediente.

## Objetivos

- Implementar app macOS nativa en Swift con UI equivalente a la app actual para los modulos de Laboratorio y Expediente.
- Mantener Windows en Electron sin cambios de comportamiento durante esta fase.
- Reescribir el parser clinico de laboratorio/cultivos 100% en Swift desde fase 1.
- Garantizar compatibilidad de datos entre plataformas usando JSON compartido.
- Mejorar robustez local en macOS usando persistencia interna con CoreData.

## No Objetivos (Fase 1)

- Migrar Medicamentos, Nota de Evolucion, Indicaciones y otros modulos no incluidos en Laboratorio/Expediente.
- Redefinir el contrato de intercambio JSON existente.
- Cambiar el flujo clinico principal o la jerarquia de navegacion conocida por usuarios actuales.

## Enfoque Tecnico Seleccionado

Se adopta el enfoque "CoreData interno + contrato JSON canonico compartido":

- `SwiftUI` para capa de presentacion en macOS.
- `CoreData` como almacenamiento operativo interno.
- Modulo `SharedJSONCodec` en Swift para import/export 1:1 del contrato JSON actual de Electron.
- Parser clinico en Swift puro (`LabParsingEngine`) sin dependencia de runtime JS.

Razon: equilibra rendimiento y mantenibilidad en macOS sin sacrificar interoperabilidad con Windows.

## Arquitectura de Fase 1

### Modulos

- `Patients`: seleccion y contexto de paciente activo.
- `Expediente`: lectura/edicion de datos clinicos del paciente.
- `Laboratorio`: ingreso de texto, vista previa, guardado e historial.
- `Parsing`: normalizacion de laboratorios y cultivos en Swift.
- `SyncJSON`: import/export del formato compartido con Electron.

### Flujo de alto nivel

1. El usuario selecciona paciente.
2. Pega reporte de laboratorio en vista de Laboratorio.
3. `LabParsingEngine` procesa y normaliza resultados.
4. Se muestra vista previa; el usuario confirma guardado.
5. Datos se persisten en CoreData.
6. Estado exportable se mantiene compatible via `SharedJSONCodec`.

## UI y Paridad de Experiencia

En macOS Swift se conserva la experiencia de uso actual:

- Misma estructura conceptual de pantallas para Laboratorio y Expediente.
- Orden de navegacion y nomenclatura clinica equivalente.
- Interacciones clave y expectativas de flujo alineadas con la app actual.

Se permiten ajustes minimos de implementacion propios de SwiftUI siempre que no alteren el comportamiento funcional esperado por el usuario clinico.

## Modelo de Datos y Compatibilidad

### Persistencia interna (macOS)

CoreData define entidades equivalentes a la semantica actual, incluyendo:

- `Patient`
- `LabEntry`
- `ExpedienteEntry`
- `AppSettings` (solo lo requerido para fase 1)

### Contrato compartido

- El formato JSON actual de Electron se mantiene como contrato canonico de intercambio y respaldo cruzado.
- `SharedJSONCodec` implementa dos rutas:
  - `importFromSharedJSON()`
  - `exportToSharedJSON()`
- Cualquier campo nuevo de macOS debe ser opcional y backward-compatible.
- No se eliminan ni renombran claves existentes en fase 1.

## Flujo Funcional Detallado

### Laboratorio

- Entrada de texto -> parseo Swift -> bloques normalizados (BH, QS, gasometria, cultivos y otros soportados).
- Vista previa inmediata antes de persistir.
- Si hay secciones no reconocidas, se muestran sin bloquear el flujo.
- Guardado de resultados normalizados y texto fuente para trazabilidad.
- Historial por paciente con orden y deduplicacion funcionalmente equivalente al comportamiento actual.

### Expediente

- Lectura/edicion del expediente del paciente activo con persistencia transaccional.
- Integracion con contexto de Laboratorio para continuidad clinica.
- Operaciones de guardado atomicas para evitar estados parciales.

## Manejo de Errores y Resiliencia

- **Error de parsing:** fallback legible, preservando texto original; la vista no colapsa.
- **Error de persistencia:** rollback transaccional y mensaje claro para reintento.
- **Error de import/export JSON:** validacion estructural y reporte puntual del conflicto.
- **Diagnostico local:** logs tecnicos minimos, sin datos sensibles identificables.

## Estrategia de Migracion Incremental

- Windows continua en Electron durante toda la fase 1.
- macOS libera app Swift enfocada en Laboratorio + Expediente.
- Compatibilidad JSON habilita coexistencia operativa y respaldos cruzados desde el primer release de fase 1.

## Estrategia de Testing

### Pruebas unitarias

- `LabParsingEngine` por tipo de estudio y casos borde (incluyendo cultivos polimicrobianos).
- `SharedJSONCodec` para mapeo de entidades y manejo de opcionales.

### Pruebas de contrato

- Fixtures reales del proyecto para validar compatibilidad con el JSON compartido.
- Round-trip: `JSON -> CoreData -> JSON` con equivalencia semantica.

### Pruebas de flujo (smoke)

- Seleccionar paciente -> pegar laboratorio -> vista previa -> guardar -> revisar historial -> validar expediente.

## Criterios de Exito (Go/No-Go Fase 1)

- Paridad funcional de Laboratorio + Expediente validada contra checklist de comportamiento actual.
- Import/export JSON interoperable con Windows Electron en escenarios reales.
- Performance estable con historiales amplios (sin bloqueos perceptibles en uso normal).
- Sin perdida de datos en pruebas de error de parseo, persistencia e intercambio.

## Riesgos y Mitigaciones

- **Riesgo:** divergencia del parser Swift vs parser actual.
  - **Mitigacion:** fixtures de regresion y comparacion semantica por bloque clinico.
- **Riesgo:** incompatibilidad silenciosa de JSON entre plataformas.
  - **Mitigacion:** contract tests obligatorios en CI y versionado del contrato.
- **Riesgo:** desviaciones de UI que afecten adopcion clinica.
  - **Mitigacion:** checklist de paridad de flujo y revision funcional temprana con usuarios.

## Entregables de Fase 1

- App macOS Swift con Laboratorio y Expediente funcionales.
- Parser clinico Swift para cobertura de fase 1.
- Capa `SharedJSONCodec` para interoperabilidad con Windows.
- Suite inicial de pruebas unitarias, contrato y smoke.
