# R+

Herramienta clínica de escritorio para generación de **notas de evolución**, **indicaciones médicas** y visualización de **laboratorios** con diagramas automáticos.

---

## Funcionalidades

- **Laboratoriazo** — Interpreta resultados de laboratorio y genera diagramas visuales: Biometría Hemática, Coagulación, Diagrama de Gamble, Química Sanguínea, Gasometría y más.
- **Nota de Evolución** — Formulario estructurado que genera un archivo `.docx` listo para imprimir, con membrete y formato clínico.
- **Indicaciones médicas** — Generación de hoja de indicaciones en `.docx` con secciones configurables.
- **Auto-actualización** — La app detecta nuevas versiones automáticamente y se actualiza con un clic.
- **Búsqueda de pacientes** — Campo de búsqueda en la barra lateral (nombre, registro, cuarto, etc.).
- **Atajos** — **Cmd+1** (Mac) o **Ctrl+1** (Windows) → Laboratorio; **Cmd+2** / **Ctrl+2** → Expediente.

---

## Instalación

### Mac

Descarga el `.dmg` correspondiente a tu procesador desde [Releases](https://github.com/mausalas99/r-mas/releases/latest):

- `R+-x.x.x-arm64.dmg` — Apple Silicon (M1/M2/M3/M4)
- `R+-x.x.x-x64.dmg` — Intel

Abre el `.dmg`, arrastra R+ a Aplicaciones y ejecútalo.

> Si macOS muestra "no se puede abrir porque proviene de un desarrollador no identificado": clic derecho → Abrir → Abrir de todas formas.

### Windows

Descarga `R+ Setup x.x.x.exe` desde [Releases](https://github.com/mausalas99/r-mas/releases/latest) y ejecútalo. La instalación es automática.

> Si Windows SmartScreen advierte sobre el archivo: Más información → Ejecutar de todas formas.

---

## Requisitos

- **Instalación desde el instalador oficial** (`.dmg` / `.exe` en [Releases](https://github.com/mausalas99/r-mas/releases/latest)): no necesitas instalar Python; la app incluye un runtime empaquetado para generar los `.docx`.
- **Desarrollo desde el código fuente** (`npm start` / compilar tú mismo): hace falta **Python 3** en el PATH para la generación de documentos (o el runtime en `python-runtime/` tras ejecutar los scripts de build).
  - Mac: `brew install python3` o el Python del sistema.
  - Windows: [python.org](https://www.python.org/downloads/) — marcar "Add to PATH".

Los documentos generados se guardan en tu carpeta **Descargas** por defecto. Puedes cambiar la carpeta de salida desde **Mi Perfil → Carpeta de documentos → Cambiar**. Al agregar un paciente, la app te avisará si ya existe uno con el mismo nombre o registro. Puedes hacer una **copia de seguridad** de tus datos desde la app: **Mi Perfil → Exportar copia de seguridad** (archivo JSON).

---

## Desarrollo

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm start

# Compilar para Mac (arm64 + x64)
npm run build:mac

# Compilar para Windows (x64)
npm run build:win
```

**Stack:** Electron 41 · Express 5 · electron-builder 26 · electron-updater 6 · Python 3 (python-docx)

---

## Architecture

R+ is organized into modular components for maintainability and performance:

### Module Structure

```
public/
├── index.html (UI shell: layout, styles, markup)
├── js/
│   ├── app.js (main application: state, UI handlers, Chart.js tendencias, tours)
│   ├── storage.js (localStorage persistence)
│   └── labs.js (lab text parsing and line rendering helpers)
└── vendor/
    └── chart.umd.min.js (Chart.js library)
```

### Module Responsibilities

- **app.js**: Single ES module entry; loads data via `storage`, lab parsing from `labs`, and exposes handlers on `window` for `index.html` inline `onclick` / `oninput` attributes
- **storage.js**: Wraps localStorage with consistent interface for patients, notes, indicaciones, lab history, settings, and optional `batchFetch` / `flushBatch` helpers for future request batching
- **labs.js**: Lab report parsing (`procesarLabs`, section parsers, `renderEntry`, etc.); no application state

### Performance Notes

- Chart.js is loaded from `vendor/` in the document head; tendencias sparklines destroy/recreate charts when the tab refreshes
- `storage.saveAll` centralizes persisted writes from the main save path

---

## Actualizaciones

La app busca actualizaciones automáticamente al iniciar. También puedes verificar manualmente desde el menú **R+ → Buscar actualizaciones…** (Mac) o **Aplicación → Buscar actualizaciones…** (Windows).

---

**Autor:** Mauricio Salas
