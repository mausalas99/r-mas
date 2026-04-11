# R+

Herramienta clínica de escritorio para generación de **notas de evolución**, **indicaciones médicas** y visualización de **laboratorios** con diagramas automáticos.

---

## Funcionalidades

- **Laboratoriazo** — Interpreta resultados de laboratorio y genera diagramas visuales: Biometría Hemática, Coagulación, Diagrama de Gamble, Química Sanguínea, Gasometría y más.
- **Nota de Evolución** — Formulario estructurado que genera un archivo `.docx` listo para imprimir, con membrete y formato clínico.
- **Indicaciones médicas** — Generación de hoja de indicaciones en `.docx` con secciones configurables.
- **Auto-actualización** — La app detecta nuevas versiones automáticamente y se actualiza con un clic.

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

- **Python 3** instalado en el sistema (para generación de documentos `.docx`)
  - Mac: viene preinstalado o instala con `brew install python3`
  - Windows: descarga desde [python.org](https://www.python.org/downloads/) — marcar "Add to PATH"

Los documentos generados se guardan automáticamente en tu carpeta **Descargas**.

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

## Actualizaciones

La app busca actualizaciones automáticamente al iniciar. También puedes verificar manualmente desde el menú **R+ → Buscar actualizaciones…** (Mac) o **Aplicación → Buscar actualizaciones…** (Windows).

---

**Autor:** Mauricio Salas
