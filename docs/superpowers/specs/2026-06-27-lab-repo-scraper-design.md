# Repositorio intrahospitalario de laboratorio — scraper e importación

**Fecha:** 2026-06-27  
**Estado:** Approved  
**Dependencias:** `procesarLabs`, `lab-bulk-paste`, `lab-bulk-preview-modal`, Electron main IPC  
**Portal:** `http://148.234.140.71/laboratorio/index.aspx` (Hospital Universitario Dr. José Eleuterio González — Patología Clínica)

## Resumen

Importar estudios de laboratorio desde el repositorio web institucional directamente en R+, sin pegar SOME manualmente. El usuario indica **registro** y un **rango de fechas**; R+ consulta la tabla de resultados, descarga cada PDF en el rango, extrae texto SOME-compatible, ejecuta `procesarLabs` e ingiere al historial del paciente con la misma deduplicación y consolidación que el pegado masivo.

Los PDF descargados **no se conservan**: solo viven en un directorio temporal durante la extracción de texto y se eliminan de inmediato.

---

## Decisiones de producto

| Tema | Decisión |
|------|----------|
| Integración | Botón en panel de Laboratorio dentro de R+ (Electron) |
| Autenticación | Ninguna en v1 — portal abierto en LAN hospitalaria |
| Criterio de búsqueda | **REGISTRO** (no nombre); ver § Portal ASP.NET |
| Rango temporal | Usuario elige **desde / hasta** (datetime); filtro sobre columna **Fecha Solicitud** |
| Formato de reporte | PDF con mismo layout SOME (`Expediente:`, `Nombre:`, secciones HEMATOLOGÍA / QUÍMICA…) |
| Registro en UI | Auto-llenado desde `patient.registro` si hay paciente activo; editable si no hay paciente o flujo **Agregar paciente** |
| Confirmación | **Híbrida:** importación silenciosa si todo limpio; modal de revisión si warnings, duplicados, paciente no encontrado o fallos parciales |
| Retención PDF | **Cero** — borrar tras extraer texto (§ Ciclo de vida del PDF) |
| Red | Solo LAN hospitalaria; sin proxy cloud ni retransmisión de PHI |
| Fuera de scope v1 | Auto-sync en background, auth, batch multi-registro, servicio LAN separado |

---

## Flujo de usuario

### Entrada A — Paciente seleccionado

1. Usuario abre panel Laboratorio con paciente activo.
2. Pulsa **Importar del repositorio**.
3. Modal muestra **Registro** (solo lectura, desde `patient.registro`) y pickers **Desde / Hasta** (default sugerido: últimas 48 h).
4. **Importar** → progreso («Descargando 3/12…») → resultado híbrido (toast o modal).

### Entrada B — Sin paciente / registro nuevo

1. Mismo modal desde panel Lab o contexto **Agregar paciente** (pegado masivo / registro desde lab).
2. **Registro** editable y obligatorio.
3. Tras fetch, si no hay match de paciente → modal de revisión con **Agregar paciente** (reutilizar `lab-bulk-preview-modal` / `shouldOfferBulkPreviewAddPatient`).

### Pipeline fetch → import

1. Cliente portal: GET `index.aspx` → establecer modo **REGISTRO** → POST búsqueda con número de registro.
2. Parsear tabla HTML; conservar filas con **Fecha Solicitud** ∈ `[desde, hasta]`.
3. Por cada fila: postback **Seleccionar** → bytes PDF → temp file → extraer texto → **eliminar PDF**.
4. Por cada texto: `procesarLabs` + metadatos (folio, tipo, departamento, fecha solicitud).
5. **Puerta híbrida** (§ Importación híbrida).
6. Aplicar vía rutas existentes: dedup (`isDuplicateInPatientHistory`), consolidación ventana 2 h (`lab-consolidation-cluster`), `pushLabHistory`, refresh tendencias.

---

## Portal ASP.NET — modo REGISTRO

Al cargar `index.aspx`, el portal muestra por defecto búsqueda por **NOMBRE** (toggle visible en la barra azul: NOMBRE / REGISTRO).

**Requisito obligatorio:** antes de enviar **Buscar**, el cliente debe activar el toggle a **REGISTRO**. No basta con escribir el número en el campo de texto si el modo sigue en NOMBRE.

Implementación esperada en `portal-client.mjs`:

1. GET inicial → parsear HTML + hidden fields (`__VIEWSTATE`, `__EVENTVALIDATION`, `__VIEWSTATEGENERATOR`, etc.).
2. Identificar el control del toggle (dropdown/listbox o postback link) y el valor/event target que corresponde a **REGISTRO** (descubrir en implementación; capturar en fixture de test).
3. POST que fija modo REGISTRO (si requiere paso separado del POST de búsqueda).
4. POST **Buscar** con el registro en el input correcto y el modo REGISTRO activo.
5. Validar en test: respuesta contiene filas con columna **Registro** igual al solicitado, no búsqueda por nombre.

---

## Arquitectura

```
Lab panel UI (renderer)
    │  registro, date range
    ▼
lab-repo-import.mjs          ← modal, progreso, puerta híbrida
    │  electronAPI.labRepoFetch({ registro, desde, hasta })
    ▼
preload → IPC `lab-repo-fetch`
    ▼
lib/lab-repo/                ← main process only
  portal-client.mjs          ← sesión ASP.NET, toggle REGISTRO, búsqueda, tabla
  portal-select.mjs          ← postback Seleccionar → Buffer PDF
  pdf-text.mjs               ← PDF → texto SOME; validación looksLikeSomeLabReport
  fetch-run.mjs              ← orquestación N folios + ciclo de vida temp
    │
    ▼
Renderer: procesarLabs(text) por folio → import / bulk preview / finalizeBulkLabPaste
```

### Módulos

| Módulo | Responsabilidad |
|--------|-----------------|
| `lib/lab-repo/portal-client.mjs` | Sesión HTTP, ViewState, toggle REGISTRO, búsqueda, parseo tabla, filtro por fecha |
| `lib/lab-repo/portal-select.mjs` | Postback por fila (**Seleccionar**) → descarga PDF |
| `lib/lab-repo/pdf-text.mjs` | `Buffer` → string; smoke `looksLikeSomeLabReport` |
| `lib/lab-repo/fetch-run.mjs` | Temp dir, secuencia de folios, borrado PDF, agregación errores |
| `lib/lab-repo/lab-repo-fetch.mjs` | Handler IPC; expone API única al renderer |
| `public/js/features/lab-repo-import.mjs` | UI modal, llamada IPC, puerta híbrida, delegación a bulk/historial |
| `main.js` + `preload.js` | Registrar canal `lab-repo-fetch` |

URL base configurable v1: constante `LAB_REPO_BASE_URL`; override en Ajustes es mejora futura opcional.

---

## Ciclo de vida del PDF

1. Crear directorio temporal: `os.tmpdir()/rplus-lab-repo/<runId>/`.
2. Escribir cada PDF solo ahí (nunca `userData`, sidecar LAN, ni bundle de paciente).
3. Extraer texto desde buffer o path temporal.
4. **Eliminar el archivo PDF inmediatamente** tras extracción (éxito o fallo irrecuperable de parseo).
5. Al terminar o abortar la corrida: `rm -rf` del directorio de corrida en bloque `finally`.
6. Historial guarda **`sourceText`** (string SOME extraído), igual que pegado manual — no binario PDF.

---

## Importación híbrida

### Importación silenciosa cuando TODO:

- Cada PDF se extrajo y pasó `looksLikeSomeLabReport` + `procesarLabs` sin error bloqueante
- Registro en reporte coincide con registro solicitado (y paciente seleccionado si aplica)
- Ningún set es duplicado en historial (`isDuplicateInPatientHistory`)
- Cero errores de fetch por fila

→ Toast: «N estudios importados» (+ omitidos duplicados si aplica).

### Modal de revisión cuando CUALQUIERA:

- Warnings del parser o secciones parciales
- Duplicados detectados (opción omitir / forzar según patrón bulk preview)
- Registro del reporte ≠ paciente seleccionado
- Sin paciente en censo → fila con **Agregar paciente**
- Uno o más folios fallaron (listar; permitir importar los exitosos)

Reutilizar componentes y copy de `lab-bulk-preview-modal.mjs` donde sea posible.

---

## Manejo de errores

| Fallo | UX |
|-------|-----|
| Sin red / timeout / IP inalcanzable | Toast: «No se pudo conectar al repositorio de laboratorio» |
| Toggle REGISTRO no aplicado o búsqueda vacía errónea | Log detallado; toast si cero filas inesperadas |
| Cero filas en rango | «Sin estudios en el rango seleccionado» |
| PDF sin texto / ilegible | Fila en modal; PDF ya eliminado |
| ViewState / markup del portal cambió | «El portal cambió de formato»; no importación silenciosa parcial |
| Usuario cancela modal | No revertir sets ya importados en pasos silenciosos previos (misma semántica que bulk paste) |

Progreso: toast o indicador inline durante descarga; modal bloqueante solo cuando la puerta híbrida lo exige.

---

## Dependencia PDF

Añadir extracción de texto en main process (p. ej. `pdf-parse` o equivalente Node puro). Criterio: texto extraído debe preservar líneas `Expediente:`, encabezados de sección y columnas Estudio/Resultado suficientes para `procesarLabs` sin adaptador dedicado. Si la calidad del PDF exige normalización mínima (espacios/joins de línea), limitarla a `pdf-text.mjs` — no duplicar lógica de `labs-procesar.mjs`.

---

## Pruebas

### Unit (main, `node --test`)

- Fixture HTML post-búsqueda → filas filtradas por rango de **Fecha Solicitud**
- Fixture con toggle: secuencia GET → set REGISTRO → POST Buscar (sin red en CI)
- Fixture PDF SOME → texto con `Expediente:` y `HEMATOLOGIA`

### Renderer

- Puerta híbrida: casos silencioso vs modal
- Registro auto-llenado vs manual
- Integración con `shouldOfferBulkPreviewAddPatient`

### Smoke manual (LAN hospital)

- Registro conocido + ventana 24 h → historial y tendencias equivalentes a pegado manual

---

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Portal cambia markup / ViewState | Fixtures + test de caracterización; mensaje claro al usuario |
| PDF con layout distinto al SOME pegado | Validar `looksLikeSomeLabReport`; modal en lugar de silencioso |
| Extracción PDF pobre (columnas pegadas) | Normalizador fino en `pdf-text.mjs`; golden tests con PDF real anonimizado |
| Toggle REGISTRO olvidado | Paso explícito documentado + test; validar columna Registro en respuesta |
| Muchos folios en rango amplio | Progreso incremental; límite soft configurable si hace falta en v1.1 |

---

## Alineación con north star

- **Reduce TTD:** elimina copiar/abrir PDF uno por uno en el navegador.
- **Local-first / LAN:** fetch directo desde Mac en red hospital; PHI no sale a cloud.
- **Human-in-the-loop:** importación silenciosa solo cuando confiable; modal en casos ambiguos.
- **Reutiliza parser:** un solo pipeline SOME → tendencias → nota.

---

## Referencias de código existente

- Parser: `public/js/labs-procesar.mjs`, `public/js/labs-report-refs.mjs` (`looksLikeSomeLabReport`)
- Bulk import: `public/js/lab-bulk-paste.mjs`, `public/js/features/lab-bulk-preview-modal.mjs`
- Historial: `public/js/features/lab-panel-workbench-store.mjs` (`applyDriveImportLabSets`, dedup)
- IPC patrón: `preload.js` / `main.js`
