# Agenda de procedimientos (vista semanal, v1 local) — diseño

> **Para implementación:** tras aprobación de producto de este archivo, usar **superpowers:writing-plans** para el plan por tareas; no mezclar otras skills de implementación en la misma transición.

**Fecha:** 2026-05-14  
**Estado:** Especificación de producto (recuperada; alineada a v1 local + evolución LiveSync).

## Objetivo

Ofrecer en R+ una **agenda de procedimientos por paciente** con una **vista semanal tipo timeline** (inspiración visual: Calendar de Apple: rejilla día × hora, bloques redondeados, legible en claro y oscuro), **integrada al sistema de diseño existente** (`--surface`, `--bg`, `--text`, `--text-muted`, `--action`, etc.).

**v1:** datos **solo locales** (`localStorage`, patrón `storage.js`, clave `rpc-scheduled-procedures`). **v2 (fuera de este spec):** integración con LiveSync/LAN con el mismo enfoque que el resto de la app (modelo de eventos estable; sincronización después).

## Alcance v1

- **Una sola vista temporal:** semana **lunes a domingo** con **eje vertical de horas** (franja visible acotada en código, p. ej. 06:00–22:00).
- **Navegación temporal:** únicamente **una semana atrás** y **una semana adelante** (ancla ±7 días, normalizada al lunes de esa semana). Sin vista mes, sin vista día/año como alternativas principales.
- **Sin** línea indicadora de “hora actual” en la rejilla.
- **Sin** export iCal ni integración con calendarios del sistema.
- **Sin** recordatorios / notificaciones del sistema operativo por evento.

## Fuera de alcance v1

- Sincronización multi-equipo, conflictos concurrentes, colas offline hacia host.
- Import/export de calendario externo.
- Duración configurable por el usuario o hora de fin persistida (solo se guarda **inicio**; ver abajo).

## Modelo de datos

Lista global: arreglo JSON bajo **`rpc-scheduled-procedures`**. Cada elemento es un **evento**:

| Campo | Tipo | Reglas |
|--------|------|--------|
| `id` | string | Único estable. |
| `patientId` | string | Obligatorio; paciente existente en el listado principal (no `demo-*` en persistencia). |
| `procedure` | string | Obligatorio (trim); nombre del procedimiento. |
| `location` | string | Obligatorio (trim); dónde se realiza. |
| `materialApproved` | boolean | Por defecto `false`. En UI: **checkbox** (`<input type="checkbox">` o equivalente accesible). |
| `anesthesiaScheduled` | boolean | Por defecto `false`. Significado producto: **Anestesio agendado**. Mismo tipo de control: **checkbox**. |
| `start` | string ISO 8601 | Único instante **persistido** (fecha + hora de inicio). No hay campo `end` ni duración en almacenamiento. |
| `createdAt` | string ISO | Automático al crear. |
| `updatedAt` | string ISO | Automático al crear/actualizar (base para políticas de sync futuras). |

**Borrado de paciente:** al eliminar un paciente del expediente, **eliminar en cascada** todos los eventos con ese `patientId`.

**Demostración:** no persistir eventos ligados a `patientId` que empiece por `demo-` (coherencia con el resto de R+).

## Presentación: bloque de dos horas

- En **datos** solo existe `start`.
- En **UI**, cada evento se dibuja como una **cajita** ocupando **exactamente dos horas** en el eje vertical, **anclada al inicio:** el bloque representa visualmente el intervalo desde `start` hasta dos horas después, **solo para layout y lectura**, no se guarda el fin.

## UI — Cabecera

- Título / contexto de la vista (“Agenda” o “Agenda de procedimientos”).
- Rango de fechas de la semana visible (locale `es`, fechas locales).
- Botones **semana anterior** / **semana siguiente** (accesibles, `aria-label` en español).
- Acción **Nuevo procedimiento** (deshabilitada o con mensaje claro si no hay pacientes reales).

## UI — Rejilla

- Siete columnas (lunes → domingo).
- Etiquetas de hora en margen izquierdo alineadas a la rejilla.
- **Bloques:** bordes redondeados, colores acordes al tema; texto compacto: procedimiento; línea secundaria con **hora de inicio** y lugar; nombre del paciente (o tooltip si el espacio aprieta).
- Si **material** o **anestesio** no están marcados, reflejo visual opcional (p. ej. borde ámbar) además de los checkboxes en el formulario.
- **Solapes:** varios eventos el mismo día a horas que hacen solapar las ventanas visuales de 2 h deben **repartirse en columnas** (“lanes”) para seguir siendo clicables.

## UI — Crear / editar / eliminar

- **Modal o panel** con: selector de paciente (solo no-demo), procedimiento, lugar, **fecha y hora de inicio** (control que produzca un `Date` válido coherente con el resto de la app), checkboxes **Material aprobado** y **Anestesio agendado**, **Guardar**, **Cancelar**, **Eliminar** (con confirmación si así se hace en el resto de R+).
- Clic en bloque abre el mismo formulario en modo edición.
- Validación: paciente válido, campos obligatorios, fecha parseable.

## Integración en la app

- **Pestaña principal** al mismo nivel que Laboratorio / Expediente / Medicamentos (no anidada bajo LAN).
- Atajo de teclado opcional documentado en ayuda (p. ej. **Ctrl/⌘+5** para Agenda) sin romper atajos existentes (p. ej. **⌘+4** = Ajustes).

## Nota de implementación (renderer Electron)

Los elementos que usen la clase global **`.modal-backdrop`** en `index.html` están ocultos por defecto (`display: none`) y requieren la clase **`.open`** para mostrarse (`display: flex`), igual que otros modales de la app.

## Errores y validación

- `patientId` inexistente al guardar: bloquear y mensaje claro.
- `start` obligatorio y válido.
- Zona horaria: misma convención que el resto de fechas en R+ (típicamente hora local al mostrar y serializar según patrones ya usados).

## Pruebas (orientación)

- `storage`: lectura/escritura, JSON inválido → lista vacía o normalización, exclusión `demo-`, `removeScheduledProceduresForPatient`.
- Módulo de semana (si existe): inicio lunes 00:00 local, fin de semana exclusivo, filtrado de eventos por semana, utilidad de solape de intervalos de 2 h.
- Humo: crear evento, refrescar app, borrar paciente y comprobar cascada.

## Evolución v2 (no incluida en v1)

- Replicación hacia host LAN u otro backend; campos e `updatedAt` preparan LWW u otra política acordada entonces.
- La vista semanal debe poder alimentarse de un **adaptador** (local vs remoto) sin rediseño completo.
