# R+

Herramienta clínica de escritorio para generación de **notas de evolución**, **indicaciones médicas** y visualización de **laboratorios** con diagramas automáticos.

**Versión estable actual: [3.0.1](https://github.com/mausalas99/r-mas/releases/tag/v3.0.1)** — descarga desde [Releases (última)](https://github.com/mausalas99/r-mas/releases/latest).

---

## R+ 3.0.1 (parche — procalcitonina y listado de problemas en 8 pt)

- **Procalcitonina (PCT)** — El bloque de Estudios Especiales se procesa y la procalcitonina aparece en QS junto a PCR (`QS  PCT 0.09*`). El extractor ignora los rangos pediátricos por horas y usa el límite de adulto (`ADULTO <0.05 ng/mL`) para marcar valores fuera de rango. También disponible como serie en Tendencias.
- **Listado de Problemas** — El texto generado en el `.docx` (fecha, número y descripciones de activos/inactivos) ahora sale en 8 pt para que entren más problemas por hoja.

Notas: `docs/RELEASE_NOTES_3.0.1.txt`.

---

## R+ 3.0.0 (modos Sala/Interconsulta, Estado Actual, Listado de Problemas, anion gap)

- **Modos** — Sala oculta Nota/Indicaciones y expone **Estado Actual** y **Listado de Problemas**; Interconsulta mantiene el comportamiento original. Default: Sala. En Sala, el alta de paciente usa **Servicio** (con default configurable en Mi Perfil) en lugar de Área.
- **Estado Actual** — Botón rápido en el expediente que reusa la Plantilla de Evolución sin **Subjetivo**: guarda el snapshot por paciente con timestamp y lo copia al portapapeles.
- **Listado de Problemas** — Pestaña con **Activos / Inactivos** sin límite, fecha por problema, drag-and-drop y auto-save. Generador `.docx` con numeración nativa `a) b) c)` de Word, títulos en negritas y firma editable (médicos por defecto se configuran en Mi Perfil).
- **Anion gap** — AG (Na − (Cl + HCO3)) se calcula desde Na/Cl de Química Sanguínea o Electrolitos Séricos del mismo reporte; si no hay química, no se muestra. Se marca cuando cae fuera de 8–12 mEq/L.
- **Calcio ionizado** — Extracción y marcado desde el bloque de Observaciones de la gasometría.
- **Tutorial** — Navegación automática a la zona del paso, resaltado del control esperado y "Siguiente" oculto cuando se requiere una acción. Dock más discreto en la esquina inferior derecha (clic para expandirlo si lo minimizas). Aviso preventivo al guardar paciente sin expediente.
- **Salida rápida** — En Sala exporta Listado de Problemas si hay datos; en Interconsulta sigue exportando la Nota.

Notas: `docs/RELEASE_NOTES_3.0.0.txt`.

---

## R+ 2.4.1 (parche — medicamentos compactos y tooltip de tendencias)

- **Medicamentos** — En la salida resumida «nombre + día», el formato ahora es compacto: `MEDICAMENTO + DOSIS + VÍA abreviada + FRECUENCIA abreviada + DÍA de uso` (por ejemplo: `MEROPENEM 2G IV C/8H DIA 2`).
- **Tendencias** — En la mini-gráfica ampliada, el tooltip vuelve a aparecer al pasar el cursor sobre el último punto de la serie. La detección ahora se hace por columna del eje X y los puntos tienen un pequeño offset para que el tooltip no quede recortado contra el borde del canvas.

Notas: `docs/RELEASE_NOTES_2.4.1.txt`.

---

## R+ 2.4.0 (sidebar, drag&drop y nuevos parsers)

- **Sidebar pacientes** — Pinned/Fijados, archivado y reordenamiento por drag&drop con desplazamiento de tarjetas en tiempo real.
- **UI** — Mi Perfil se abre tocando **R+**; tarjetas de pacientes más limpias y scrollbar translúcido sin barra horizontal en el listado.
- **Laboratorio** — Soporte para **Fisicoquímico de heces** y **Frotis de sangre periférica**.

Notas: `docs/RELEASE_NOTES_2.4.0.txt`.

---

## R+ 2.3.1 (parche — tendencias sin cultivos)

- **Tendencias** — Solo paneles de laboratorio clínico; no se muestran secciones de cultivos (urocultivo, hemocultivo, etc.) como gráficas. Los cultivos siguen en la pestaña **Cultivos**.

Notas: `docs/RELEASE_NOTES_2.3.1.txt`.

---

## R+ 2.3.0 (tendencias por sección, ocultos y gasometría)

- **Tendencias** — Agrupación por tipo de estudio; secciones colapsables; sin mezclar el mismo analito entre paneles (p. ej. Hto biometría vs gasometría).
- **Ocultos** — Ojo en cada tarjeta; barra con chips, «Mostrar todos» y barra colapsable con contador; preferencias persistidas.
- **Gasometría** — Extracción opcional de hematocrito del bloque de gases para su serie en tendencias.

Notas: `docs/RELEASE_NOTES_2.3.0.txt`.

---

## R+ 2.2.1 (parche — onboarding y texto de Consolidar)

- **Tutorial guiado** (Sala e Interconsulta) y **modal inicial**: explicación de **Sincronizar**, **Consolidar**, pestaña **Cultivos**, tendencias y revisión global en **Ajustes → Laboratorio**.
- **Mini-tour Laboratorio**: paso dedicado al historial (**Sincronizar** / **Consolidar**).
- **Consolidar** — Diálogo de confirmación y tooltip del botón con redacción más clara.

Notas: `docs/RELEASE_NOTES_2.2.1.txt`.

---

## R+ 2.2.0 (pestaña Cultivos y mejoras de historial)

- **Pestaña Cultivos** — Tabla en el expediente agrupada por tipo de estudio (hemo, uro, catéter, Gram, fungicultivo), orden **más reciente primero** dentro de cada grupo; resumen de negativos arriba.
- **Historial** — Consolidar por día y tipo homogéneo; mejor separación cultivo vs labs; tendencias sin puntos duplicados; fechas correctas al copiar bloques de laboratorio.

Notas: `docs/RELEASE_NOTES_2.2.0.txt`.

---

## R+ 2.1.2 (parche — historial y expediente en laboratorio)

- **Historial de labs** — Sincronizar duplicados (misma fecha, hora y bloques de resultados): botón en Laboratorio y revisión global en **Ajustes → Laboratorio**; se conserva la entrada más antigua de cada grupo.
- **Pegar reporte** — Si el expediente del texto coincide con otro paciente, la selección cambia a ese paciente; si el registro no está en la lista, no se guarda automáticamente en el historial del paciente activo.

Notas: `docs/RELEASE_NOTES_2.1.2.txt`.

---

## R+ 2.1.1 (parche — cultivos polimicrobianos)

- **Cultivos** — Si el informe trae varios `MICROORGANISMO` con aislamientos distintos (p. ej. Klebsiella y Enterococcus en el mismo urocultivo), el resumen incluye **cada germen** con su antibiograma compacto y cuenta asociada; el bloque MALDI no mezcla resultados posteriores.

Notas: `docs/RELEASE_NOTES_2.1.1.txt`.

---

## R+ 2.1.0 (laboratorio y barra lateral)

- **Cultivos** — Resumen con tipo de estudio (uro/hemo/catéter) y muestra entre paréntesis; resistencias (BLEE, ESBL, carbapenemasas, etc.) y antibiograma compacto (solo R / I / ESBL).
- **Citoquímico de líquidos corporales** — Nuevo bloque **Liq:** sin mezclar glucosa/proteínas del líquido con la química sérica.
- **Mi Perfil** — Lista de pacientes con scroll interno; perfil usable con muchos pacientes.

Notas: `docs/RELEASE_NOTES_2.1.0.txt`.

---

## R+ 2.0.1 (parche)

- **Actualizaciones** — En el modal «Nueva versión», las notas de release se muestran como texto legible (sin etiquetas HTML crudas).

Notas: `docs/RELEASE_NOTES_2.0.1.txt`.

---

## R+ 2.0.0 (resumen)

- **Pestaña Medicamentos** — Importa la receta hospitalaria (TSV), formatea líneas de egreso, envía a **tratamiento** o a la **plantilla SOAP** (analgesia, antibióticos, antiHTA, vasopresores). Catálogo de palabras clave / acentos **exportable e importable** desde **Ajustes → Respaldos, sync y recuperación**.
- **Ajustes** — Centro de ayuda visible arriba; resto en **acordeones**; scroll corregido; **restaurar copia automática** previa a una importación completa (cuando exista).
- **Deshacer** — Instantánea coherente en memoria (incluye catálogo SOAP); menos riesgo de perder datos al revertir eliminación de paciente u operaciones de importación.
- **Laboratorio e historial** — Mejoras en historial de laboratorio y detección de duplicados.
- **Tutorial** — Recorridos **Sala** e **Interconsulta** con guías más claras.

Notas extendidas en el repo: docs/RELEASE_NOTES_2.0.0.txt (texto plano).

---

## Funcionalidades

- **Laboratoriazo** — Interpreta resultados de laboratorio y genera diagramas visuales: Biometría Hemática, Coagulación, Diagrama de Gamble, Química Sanguínea, Gasometría y más. Historial por paciente y **tendencias** con mini-gráficas.
- **Medicamentos** — Receta hospitalaria (TSV), copia desde sistemas tipo SOME, volcado a nota / SOAP y copia al portapapeles.
- **Nota de Evolución** — Formulario estructurado que genera un archivo `.docx` listo para imprimir, con membrete y formato clínico. **Plantilla SOAP** integrada.
- **Indicaciones médicas** — Generación de hoja de indicaciones en `.docx` con secciones configurables.
- **Salida configurable** — Exportación clínica rápida del paciente actual en `.docx`, `.html` o `.txt` desde Nota/Indicaciones.
- **Auto-actualización** — La app detecta nuevas versiones automáticamente y se actualiza con un clic.
- **Búsqueda** — Pacientes en la barra lateral; **búsqueda unificada** (⌘/Ctrl+K) sobre notas e indicaciones.
- **Atajos** — **⌘/Ctrl+1** Laboratorio; **⌘/Ctrl+2** Expediente; **⌘/Ctrl+3** abre **Mi Perfil** en la barra lateral; **⌘/Ctrl+4** abre **Ajustes**.
- **Portabilidad** — Exporta / importa copia completa (JSON), **paciente único**, **rango de fechas** o **paquete sync** cifrado.

---

## Instalación

### Mac

Descarga el `.dmg` correspondiente a tu procesador desde [Releases](https://github.com/mausalas99/r-mas/releases/latest):

- `R+-3.0.1-arm64.dmg` — Apple Silicon (M1/M2/M3/M4) *(sustituye `3.0.1` por el número de la última release si lees esto en el futuro)*
- `R+-3.0.1-x64.dmg` — Intel

Abre el `.dmg`, arrastra R+ a Aplicaciones y ejecútalo.

> Si macOS muestra "no se puede abrir porque proviene de un desarrollador no identificado": clic derecho → Abrir → Abrir de todas formas.

### Windows

Descarga `R+-3.0.1-x64.exe` (nombre `R+-<versión>-x64.exe`) desde [Releases](https://github.com/mausalas99/r-mas/releases/latest) y ejecútalo. La instalación es automática.

> Si Windows SmartScreen advierte sobre el archivo: Más información → Ejecutar de todas formas.

---

## Requisitos

- **Instalación desde el instalador oficial** (`.dmg` / `.exe` en [Releases](https://github.com/mausalas99/r-mas/releases/latest)): no necesitas instalar Python; la app incluye un runtime empaquetado para generar los `.docx`.
- **Desarrollo desde el código fuente** (`npm start` / compilar tú mismo): hace falta **Python 3** en el PATH para la generación de documentos (o el runtime en `python-runtime/` tras ejecutar los scripts de build).
  - Mac: `brew install python3` o el Python del sistema.
  - Windows: [python.org](https://www.python.org/downloads/) — marcar "Add to PATH".

Los documentos generados se guardan en tu carpeta **Descargas** por defecto. Puedes cambiar la carpeta de salida en **Ajustes** (icono ⚙ arriba a la derecha) → sección **Documentos y salida** → **Cambiar**. Allí también defines **Salida rápida** (`docx`, `html` o `txt`). **Respaldos**, **catálogo medicamentos (SOAP)**, **privacidad** y **actualizaciones** están en las demás secciones del mismo panel. En la barra lateral, **Mi Perfil** concentra médico tratante, plantillas por defecto y tutorial.

---

## Desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm start

# Compilar para Mac (arm64 + x64). Con certificado de firma en el llavero, electron-builder firma automáticamente.
npm run build:mac

# Igual que build:mac (nombre explícito para releases firmados)
npm run build:mac:signed

# Mac sin firma de desarrollador (ad-hoc; útil en CI o pruebas locales)
npm run build:mac:unsigned

# Mac más rápido: solo arm64 (omitir universal / segunda arquitectura)
npm run build:mac:arm64-only
```

Para **notarizar** tras firmar, exporta en la misma terminal antes de `build:mac:signed`:

- `APPLE_ID` — Apple ID
- `APPLE_APP_SPECIFIC_PASSWORD` — contraseña específica de app
- `APPLE_TEAM_ID` — identificador del equipo (10 caracteres)

Y en `package.json`, dentro de `build.mac`, añade `"notarize": true` (sin eso, el build firmado no pasa por notarización automática de electron-builder).

Firmar y notarizar **no acelera** el build: suele tardar más que un build sin notarizar. Para iterar más rápido en tu Mac Apple Silicon, `npm run build:mac:arm64-only` evita empaquetar la segunda arquitectura.

**Stack:** Electron 41 · Express 5 · electron-builder 26 · electron-updater 6 · Python 3 (python-docx)

---

## Architecture

R+ is organized into modular components for maintainability and performance:

### Module Structure

```
public/
├── index.html (UI shell: layout, styles, markup)
├── js/
│   ├── app.js (main application: state, UI handlers, Chart.js tendencias, tours, medicamentos)
│   ├── update-helpers.mjs (formato MB/velocidad para el modal de actualización)
│   ├── storage.js (localStorage: pacientes, notas, labs, recetas, catálogo SOAP, ajustes)
│   ├── labs.js (lab text parsing and line rendering helpers)
│   ├── med-receta-core.mjs (parse/format receta TSV, clasificación SOAP)
│   └── lab-history-auto-store-core.mjs (deduplicación / utilidades historial labs)
└── vendor/
    └── chart.umd.min.js (Chart.js library)
```

### Module Responsibilities

- **app.js**: Single ES module entry; loads data via `storage`, labs desde `labs`, medicamentos desde `med-receta-core.mjs`; expone handlers en `window` para `index.html`
- **storage.js**: localStorage para pacientes, notas, indicaciones, historial de labs, receta por paciente, catálogo SOAP opcional, ajustes
- **labs.js**: Parsing de reportes de laboratorio; sin estado de aplicación
- **med-receta-core.mjs**: Pegado TSV hospitalario, formato de líneas y clasificación para plantilla SOAP

### Performance Notes

- Chart.js is loaded from `vendor/` in the document head; tendencias sparklines destroy/recreate charts when the tab refreshes
- `storage.saveAll` centralizes persisted writes from the main save path
- `server.js` expone `GET /health` para que el front compruebe si el servidor local sigue respondiendo

---

## Actualizaciones

La app busca actualizaciones automáticamente al iniciar. También puedes verificar manualmente desde el menú **R+ → Buscar actualizaciones…** (Mac) o **Aplicación → Buscar actualizaciones…** (Windows).

En **macOS**, el instalador automático (Squirrel) solo acepta actualizaciones firmadas de forma compatible con la app ya instalada; el **identificador de paquete** (`appId`) debe mantenerse entre versiones. El nombre visible sigue siendo «R+»; el id interno no afecta el título de la ventana.

### Canal de actualizaciones (estable / beta)

En **Ajustes → Aplicación y actualizaciones → Canal de actualizaciones** puedes elegir entre:

- **Estable** (predeterminado): solo recibes releases publicados oficialmente.
- **Beta**: además recibes pre-releases. El modal de actualización muestra un distintivo **Beta**. Puedes cambiar a Estable en cualquier momento y la próxima verificación solo considerará releases estables.

El canal se guarda localmente (`rpc-settings.updateChannel`) y se sincroniza con `electron-updater` al iniciar la app vía IPC (`autoUpdater.allowPrerelease`).

### Telemetría anónima de actualización (opcional)

- **Desactivada por defecto.** Se habilita en **Ajustes → Aplicación y actualizaciones → Enviar telemetría anónima de actualización**.
- Cuando está activa, al completar una actualización (éxito o fallo) se envía un `POST` no bloqueante con exactamente `{ version, result, platform }`.
- **Nunca** se envían datos clínicos ni identificables del paciente, del usuario, de la red, ni del equipo.
- Los errores de red son silenciosos; el toggle es la única forma de enviar datos. La URL de telemetría es configurable en `public/js/app.js` (constante `UPDATE_TELEMETRY_URL`).

### Versión mínima soportada

Al iniciar, R+ intenta leer `min-version.json` desde el repositorio oficial (`main` branch) con el formato:

```json
{ "minVersion": "1.8.0", "message": "Por favor actualiza para continuar." }
```

Si la versión instalada es menor a `minVersion`, se muestra un modal **bloqueante no descartable** (no se puede cerrar con Escape ni haciendo clic fuera) con dos acciones: **Buscar actualización** (usa el autoupdater) y **Descargar desde GitHub** (abre Releases). Si el fetch falla o el archivo no existe, no se bloquea al usuario.

### Volver a una versión anterior (rollback manual)

No hay reversión automática del binario instalado. Si una versión nueva introduce un problema, puedes reinstalar una versión previa siguiendo estos pasos.

**Antes de empezar (recomendado):**

- **Haz un respaldo** desde **Ajustes → Respaldo local → Exportar copia de seguridad…** (o **Exportar paciente actual / Exportar por rango** si solo quieres parte de los datos). Guarda el `.json` fuera de la carpeta de la app.
- Confirma la versión instalada actualmente en **Ajustes → Aplicación → Versión** por si necesitas regresar.

**Pasos:**

1. **Cierra R+ por completo** (en macOS, ⌘Q; no basta con cerrar la ventana).
2. Abre la página de [Releases](https://github.com/mausalas99/r-mas/releases) y localiza la versión a la que quieres volver (**no uses “Latest”**). Expande **Assets** y descarga el instalador adecuado:
   - **Mac Apple Silicon (M1/M2/M3/M4):** `R+-x.x.x-arm64.dmg`
   - **Mac Intel:** `R+-x.x.x-x64.dmg`
   - **Windows:** `R+-x.x.x-x64.exe`
3. Instala la versión descargada:
   - **Mac:** abre el `.dmg` y arrastra **R+** a **Aplicaciones**. Si macOS ofrece **Reemplazar**, acéptalo. Si aparece un aviso de firma inválida, elimina R+ desde `Aplicaciones` (a la Papelera) y vuelve a instalar desde el `.dmg` descargado.
   - **Windows:** ejecuta el `.exe` del instalador; por defecto sobrescribe la instalación actual.
4. Abre R+ y confirma la versión en **Ajustes → Aplicación → Versión**.
5. Si la auto-actualización vuelve a proponerte la versión nueva y aún no quieres actualizar, en macOS puedes **esperar 24h** (la app respeta el snooze por versión), o cambiar a canal **Estable** si estabas en **Beta**.

**Datos locales y compatibilidad:**

- Tus datos (pacientes, notas, indicaciones, historial de labs, respaldos JSON, ajustes) están en el `userData` de Electron — abre la carpeta desde **Ajustes → Datos en esta computadora → Abrir carpeta…**. **No se borran** al reinstalar una versión anterior.
- Si una release documenta un **cambio de formato incompatible**, importa tu respaldo `.json` más reciente desde **Ajustes → Respaldo local → Importar copia de seguridad…** después de reinstalar la versión anterior.
- En macOS, `electron-updater` requiere misma firma y `appId` (`com.hospitaluniversitario.rplusclinical`) entre versiones. Si cambias manualmente entre una build firmada y otra ad-hoc, es normal que la auto-actualización falle: reinstala desde el `.dmg` para resolverlo.

---

**Autor:** Mauricio Salas
