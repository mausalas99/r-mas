# R+

Herramienta clínica de escritorio para generación de **notas de evolución**, **indicaciones médicas** y visualización de **laboratorios** con diagramas automáticos.

## Índice

- [Instalación](#instalación-mac-y-windows)
- [Historial de versiones](#historial-de-versiones)
- [Funcionalidades](#funcionalidades)
- [Requisitos](#requisitos)
- [Desarrollo](#desarrollo)
- [Architecture](#architecture)
- [Actualizaciones](#actualizaciones)

---

## Instalación (Mac y Windows)

Todo se descarga desde **[Releases — última versión](https://github.com/mausalas99/r-mas/releases/latest)**. No hace falta instalar Python ni Node: los instaladores ya incluyen todo lo necesario para generar los `.docx` (módulos nativos en `lib/doc-generators/`).

### Mac

1. Abre la página de *Releases* (enlace de arriba).
2. Descarga el `.dmg` según tu Mac:
   - **`R+-<versión>-arm64.dmg`** — Apple Silicon (M1, M2, M3, M4…).
   - **`R+-<versión>-x64.dmg`** — Mac con procesador Intel.
3. Abre el `.dmg`, arrastra **R+** a la carpeta **Aplicaciones** y abre la app desde allí.

> Si macOS dice que no se puede abrir porque el desarrollador no está identificado: clic derecho en **R+** → **Abrir** → confirmar **Abrir**.

### Windows

1. En la misma página de *Releases*, descarga **`R+-<versión>-x64.exe`**.
2. Ejecuta el instalador y sigue los pasos.

Instalación silenciosa (`/S`) y códigos de salida del instalador NSIS: [`docs/INSTALLER_EXIT_CODES.md`](docs/INSTALLER_EXIT_CODES.md).

> Si **SmartScreen** muestra una advertencia: **Más información** → **Ejecutar de todas formas**.

---

**Versión estable actual:** [7.3.8](https://github.com/mausalas99/r-mas/releases/tag/v7.3.8) — en *Releases* verás siempre el instalador más reciente con el número de versión en el nombre del archivo.

---

## R+ 7.3.8 (COAG separado, balance I/O NC y arranque DB)

- **Laboratorio** — Coagulación en sección **COAG** independiente de BH; encabezados con estilo de sección en pase y panel; diagramas leen BH o COAG.
- **Estado actual** — Balance **NC** cuando egresos no cuantificados; SOAP y snapshot muestran `BALANCE NC`.
- **Estado actual** — Selector fecha/hora del modal de registro alineado al design system.
- **Arranque** — Toast si la base clínica no abre (bloqueada o binario nativo incompatible).
- **DX** — Scripts SQLCipher Node/Electron más seguros para pruebas locales.

Notas: `docs/RELEASE_NOTES_7.3.8.txt`.

## R+ 7.3.7 (censo LAN estable y expediente Drive)

- **LAN** — Pacientes ya no desaparecen del censo por readmisión con el mismo registro; deletes LiveSync solo por id del expediente.
- **LAN** — Limpieza de tombstones obsoletos al registrar paciente nuevo; bundle merge conserva charts con id distinto.
- **Expediente** — **Importar desde Drive** en la barra del bloque Clínico (modo sala), con estilo pill unificado.

Notas: `docs/RELEASE_NOTES_7.3.7.txt`.
## R+ 7.3.6 (LAN identity, sync modular y calidad)

- **LAN** — identidad por cliente emitida en el intercambio; purga usa identidad de servidor, no query params.
- **Sync** — `orchestrator` dividido en módulos (`conflicts`, `patient-delete`, `historia-sync`, …).
- **Laboratorio** — detección superset de cultivos unificada; lipasa con prueba golden.
- **Calidad** — IPC clínico con 13 pruebas de integración; cinco suites reactivadas; `npm start` sin rebuild nativo forzado.

Notas: `docs/RELEASE_NOTES_7.3.6.txt`.

## R+ 7.3.5 (LAN hardening, host durability y pulido UI)

- **LAN** — purga con guard de propiedad en servidor; bloqueo 5 min tras 8 PIN fallidos.
- **Anfitrión** — persistencia más fiable al cerrar; errores de disco visibles en diagnóstico.
- **Rendimiento** — caché de blobs parseados; parser unificado de cultivos.
- **Clínico** — modal **Datos del paciente**; ATB por día según fecha de Manejo; presets de vencimiento editables.

Notas: `docs/RELEASE_NOTES_7.3.5.txt`.

## R+ 7.3.4 (perf, pendientes con vencimiento y censo virtual)

- **Rendimiento** — chunks perezosos (labs/gráficas), censo virtual >30 activos, reconcile LAN con refresco acotado de pendientes.
- **Pendientes** — vencimiento opcional, recordatorios, orden por vencidos, filtro **Entrega** con acuse.
- **Guardia v7** — barra de progreso del currículo y nudge en tablero.
- **iPad/PWA** — espejo limitado a pacientes de equipos unidos + guardia activa.
- **UI** — laboratorio premium, motion/skeleton refinados.

Notas: `docs/RELEASE_NOTES_7.3.4.txt`.

## R+ 7.3.3 (EA balance, evacuaciones y dieta)

- **Balance I/O** — cláusula SOAP calcula balance con egresos mixtos (diuresis NC + drenaje numérico).
- **Evacuaciones** — conteo sin sufijo CC en EA, historial y censo.
- **Dieta** — kcal total visible desde kcal/kg × peso sin pisar valor guardado.

Notas: `docs/RELEASE_NOTES_7.3.3.txt`.

## R+ 7.3.2 (Premium UI, gráficas EA y endurecimiento)

- **Diseño** — tokens, elevación, motion presets (Sobrio/Mixto/Expresivo) y overlays de vidrio en modales/menús.
- **Navegación** — fila agrupada en expediente, contexto de paciente, selector de modo y paleta **⌘K**.
- **Superficies** — escritorio, móvil e interno con Workbench Refinado; Learn Hub y onboarding alineados.
- **Estado actual** — modal de gráficas con pestañas, downsampling y curvas como Tendencias.
- **LAN + seguridad** — purga host con guard de propiedad; CSP, allowlist de ventanas y borrado PHI en web móvil.

Notas: `docs/RELEASE_NOTES_7.3.2.txt`.

## R+ 7.3.1 (Manejo modal SOME, AAS SOAP y perfil borrar)

- **Manejo** — modal **Importar SOME**; grilla «Medicamentos del turno» con etiquetas compactas y **+1 día**.
- **SOAP** — AAS ≤160 mg → Otros; >160 mg → Analgesia; texto dieta sin «PARA PESO DE X KG».
- **Perfil farmacoterapéutico** — menú **⋯** para eliminar mes visible o borrar perfil completo.
- **Estado actual** — barra de confirmación de dieta pendiente; rejilla clínica reorganizada.

Notas: `docs/RELEASE_NOTES_7.3.1.txt`.

## R+ 7.3.0 (Perfil histórico, directorio LAN y laboratorio)

- **Perfil histórico** — grilla cross-mes con filas continuas, solape dinámico y acotado por fecha de ingreso.
- **Directorio LAN** — actividad reciente (SQL v17), filtros y rangos colapsables.
- **Laboratorio** — historial por fecha (selector Estudio); FAB Copiar solo con contenido en la pestaña activa.
- **Censo PDF** — labs y pendientes con envoltura completa; anfitrión con dashboard modal del censo host.

Notas: `docs/RELEASE_NOTES_7.3.0.txt`.

## R+ 7.2.9 (Manejo, dietas SOME y EA)

- **Manejo** — parser SOME con medicamentos P2 y dietas; SOAP pre-marcado (ATB, insulina, D50, PRN glu).
- **Estado actual** — propuesta de dieta con confirmar/descartar; campo proteína g/día; FAB copiar.
- **Censo** — re-selección automática si el filtro oculta al paciente activo.

Notas: `docs/RELEASE_NOTES_7.2.9.txt`.

## R+ 7.2.8 (interno, glu rescate y LAN iPad)

- **Interno** — orden por frecuencia de signos (q1h arriba); glucometrías con fondo oscuro en iPad.
- **Estado actual** — rescate de insulina por glucometría (unidades + DXT post-rescate) en la nota SOME.
- **LAN** — Mac cliente del turno puede copiar enlace iPad sin ser anfitrión.

Notas: `docs/RELEASE_NOTES_7.2.8.txt`.

## R+ 7.2.7 (interno — frecuencia y UI signos)

- **Interno** — orden por frecuencia de signos (q1h arriba); vencidos antes en la misma frecuencia.
- **Interno** — glucometrías con fondo oscuro en el modal de captura (iPad).

Notas: `docs/RELEASE_NOTES_7.2.7.txt`.

## R+ 7.2.6 (entrega en censo, guardia e interno)

- **Entrega** — equipo del paciente según censo; Admin ve todos los equipos; opción **Sin signos**.
- **Guardia** — orden por cama; críticos e inestables arriba (grid, Entrega, interno).
- **Interno** — lista alineada al censo; signos del iPad sincronizan al host/desktop.
- **Expediente** — tabs Lab/Med/Nota más fluidos; tendencias con sparklines fuera de rango en rojo.

Notas: `docs/RELEASE_NOTES_7.2.6.txt`.

---

## Historial de versiones

Las release notes detalladas de cada versión están en:

- **[CHANGELOG.md](./CHANGELOG.md)** — Listado cronológico completo de todas las versiones (5.0.1 → 7.3.2)
- `docs/RELEASE_NOTES_X.Y.Z.txt` — Archivos individuales por versión

### Versiones recientes

| Versión | Destacado |
|---------|----------|
| **7.3.2** | Premium UI (nav + tokens), gráficas EA con pestañas, endurecimiento + LAN purge |
| **7.3.1** | Manejo modal SOME, AAS SOAP por dosis, borrar perfil farmacoterapéutico |
| **7.3.0** | Perfil histórico cross-mes, directorio LAN actividad, lab historial por fecha |
| **7.2.9** | Manejo parser dietas/P2, propuesta dieta EA, FAB copiar EA |
| **7.2.8** | Interno SV por frecuencia, glu rescate en EA, enlace iPad en cliente LAN |
| **7.2.7** | Interno: orden por frecuencia SV, UI glucometrías oscura |
| **7.2.6** | Entrega en censo, orden por cama, interno alineado, expediente fluido |
| **7.2.5** | Persistencia LAN anfitrión: commits coalescidos, shards por sala, labs en sidecar, SQL v15 |
| **7.2.4** | R4 como cliente primero, sin equipo obligatorio, barrido LAN para R4 |
| **7.2.3** | LAN anfitrión ward empaquetado, URL ward en shift-PIN, subred 10.0.57 |
| **7.2.2** | LAN cliente y reconexión: bearer de invitado, pegar dirección, PIN más rápido |
| **7.2.1** | LAN cross-VLAN: registro ward persistente, PIN + dirección, copiar dirección |
| **7.2.0** | Estabilización LAN: reconcilia código de equipo sin borrar datos, mDNS resiliente |
| **7.1.x** | Descubrimiento y reconexión LAN, LiveSync ligero, Aprender R+, guardia v7 |
| **7.0.x** | PIN del turno, Wi-Fi hospital, perfil Windows, delta sync |
| **6.x** | LiveSync LAN, iPad/móvil, guardia workbench, historia clínica, manejo clínico |
| **5.x** | Arquitectura modular, Pase, tendencias, LiveSync por sala |
| **3.x–2.x** | Laboratorio, expediente, sidebar, modo Sala/Interconsulta |

> 🔍 Para el detalle completo de cada versión, ver [CHANGELOG.md](./CHANGELOG.md).

---

## Funcionalidades

- **Laboratoriazo** — Interpreta resultados de laboratorio y genera diagramas visuales: Biometría Hemática, Coagulación, Diagrama de Gamble, Química Sanguínea, Gasometría y más. Historial por paciente y **tendencias** con mini-gráficas.
- **Expediente** — En vista Normal: **Paciente**, **Clínico**, **Resultados** y **Salida**. En **Sala**, **Clínico** incluye **Historia Clínica**, **Estado actual**, **Eventualidades** y **Manejo**; en **Interconsulta**, Nota, Indicaciones, VPO y Manejo. En **Modo Pase** el tablero de ronda sigue igual; al abrir un bloque entras al expediente con la misma organización de pestañas.
- **Historia Clínica (Sala)** — Ingreso institucional en 3 pasos, catálogos APP/AHF/IPAS, vista **Lectura** con texto compilado, ancla de laboratorios y sincronización en sala en vivo.
- **Eventualidades (Sala)** — Registro cronológico de hechos clínicos por día dentro de **Clínico**.
- **Estado Actual (Sala)** — Monitoreo estructurado en **Clínico → Estado actual**: medición, snapshot, balance hídrico, historial, tendencias y texto copiable; integración con medicamentos y LiveSync por sala.
- **Manejo clínico** — Expediente → Clínico → **Manejo**: **Electrolitos** (alteraciones con SOME), **Infusiones** (infusiones/sedación con calculadoras), **ATB** (catálogo con sugerencias según cultivos) y **CAD/EHH** (checklist ADA con lectura de laboratorio).
- **Medicamentos** — Receta hospitalaria (TSV), copia desde sistemas tipo SOME, volcado a nota / SOAP y copia al portapapeles.
- **Nota de Evolución** — Formulario estructurado que genera un archivo `.docx` listo para imprimir, con membrete y formato clínico. **Plantilla SOAP** integrada (Interconsulta). Formatos en blanco editables desde Mi Perfil (pestaña Nota).
- **Indicaciones médicas** — Generación de hoja de indicaciones en `.docx` con secciones configurables (Interconsulta). Formatos en blanco editables desde Mi Perfil (pestaña Indicaciones).
- **Valoración preoperatoria (VPO)** — Calculadora de riesgo, plantillas EKG/Rx, fármacos perioperatorios y texto copiable; **Interconsulta** en Clínico, **Sala** en Salida.
- **Receta médica HU** — PDF oficial 000-061-R-06-12 desde **Salida** (Interconsulta).
- **Listado de problemas** — Generación desde **Salida** (Sala).
- **Salida configurable** — Exportación clínica rápida del paciente actual en `.docx`, `.html` o `.txt` desde Nota/Indicaciones.
- **Auto-actualización** — La app detecta nuevas versiones automáticamente y se actualiza con un clic.
- **Búsqueda** — Pacientes en la barra lateral; **búsqueda unificada** (⌘/Ctrl+K) sobre notas e indicaciones.
- **Atajos** — **⌘/Ctrl+1** Laboratorio; **⌘/Ctrl+2** Expediente; **⌘/Ctrl+3** abre **Mi Perfil** en la barra lateral; **⌘/Ctrl+4** abre **Ajustes**.
- **Portabilidad** — Exporta / importa copia completa (JSON), **paciente único**, **rango de fechas** o **paquete sync** cifrado.

---

## Requisitos

- **Instalación desde el instalador oficial** (`.dmg` / `.exe`; instrucciones arriba en **Instalación**): no necesitas Python ni Node; los `.docx` se generan con módulos nativos en `lib/doc-generators/`.
- **Desarrollo desde el código fuente** (`npm start` / compilar tú mismo): **Node.js 22+** y `npm install`. La generación de **Nota**, **Indicaciones** y **Listado** usa el servidor Node (`lib/doc-generators/`). Python no forma parte del flujo de build ni de release.

Los documentos generados se guardan en tu carpeta **Descargas** por defecto. Puedes cambiar la carpeta de salida en **Ajustes** (icono ⚙ arriba a la derecha) → sección **Documentos y salida** → **Cambiar**. Allí también defines **Salida rápida** (`docx`, `html` o `txt`). **Respaldos**, **catálogo medicamentos (SOAP)**, **privacidad** y **actualizaciones** están en las demás secciones del mismo panel. En la barra lateral, **Mi Perfil** concentra médico tratante, plantillas por defecto y tutorial.

---

## Desarrollo

```bash
# Instalar dependencias
npm install

# Ensamblar index.html + bundle del renderer (requerido antes de start o release)
npm run build:ui

# Ejecutar en modo desarrollo (prestart regenera el bundle si hace falta)
npm start

# Publicar release: versión en package.json, docs/RELEASE_NOTES_X.Y.Z.txt, README, release-notes-curated.mjs; luego:
npm run build:ui
npm run bundle:renderer:prod   # incluido en prebuild:mac/win; corre explícito si solo publicas
npm run release:publish -- --yes   # tests, commit, build Mac+Win, tag, GitHub release

# Solo revisar/actualizar empaquetado electron-builder:
npm run release:sync-pack

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

**Stack:** Electron 41 · Express 5 · electron-builder 26 · electron-updater 6 · Node doc generators (`lib/doc-generators/`)

---

## Architecture

R+ is an Electron desktop app with a LAN HTTP/WS server, SQLCipher clinical store, and an esbuild-bundled renderer. New UI work belongs in `public/js/features/*.mjs` — run `npm run build:ui` after edits; never hand-edit `public/js/chunks/` or `app.bundle.mjs`.

### Entry points

| Layer | File | Role |
|-------|------|------|
| Electron main | `main.js` | Window, auto-updater, IPC, spawns LAN server |
| Preload bridge | `preload.js` | `window.electronAPI` IPC surface |
| LAN server | `server.js` | Express routes, doc export, interno mobile, WS hub (port **3738**) |
| Renderer boot | `public/js/app.js` → `app-runtimes.mjs` | Feature registration via `windowHandlers` |
| Node shared logic | `lib/` | SQLCipher store (`lib/db/`), doc generators, interno, entrega |
| LAN host | `lan-squad/` | Auth, host-store, persistence, conflict resolver |

Mapa completo: `.cursor/rules/project-context.mdc` y `docs/core/04-directory-structure.md`.

---

## Actualizaciones

La app busca actualizaciones automáticamente al iniciar. También puedes verificar manualmente desde el menú **R+ → Buscar actualizaciones…** (Mac) o **Aplicación → Buscar actualizaciones…** (Windows).

En **macOS**, el instalador automático (Squirrel) solo acepta actualizaciones firmadas de forma compatible con la app ya instalada; el **identificador de paquete** (`appId`) debe mantenerse entre versiones. El nombre visible sigue siendo «R+»; el id interno no afecta el título de la ventana.

### Canal de actualizaciones (estable / pre-releases)

En **Ajustes → Aplicación y actualizaciones → Canal de actualizaciones** puedes elegir entre:

- **Estable** (predeterminado): solo recibes releases publicados oficialmente.
- **Pre-releases (borradores)**: además recibes borradores de GitHub (pre-releases). El modal solo muestra el distintivo **Pre-release** cuando la versión disponible en GitHub está marcada como pre-release (no por tener activado el canal en Ajustes). Puedes volver a Estable en cualquier momento.

El canal se guarda localmente (`rpc-settings.updateChannel`, valores internos `estable` o `beta`) y se sincroniza con `electron-updater` al iniciar la app vía IPC (`autoUpdater.allowPrerelease`).

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

### Restaurar versión estable anterior (6.5.8+)

En **Ajustes → Aplicación y actualizaciones**, **Restaurar versión estable anterior** lista releases curadas en `stable-versions.json` (solo versiones **menores** que la instalada). R+ intenta descargar e instalar in-app; si falla (red, firma macOS), ofrece abrir el instalador correcto en GitHub. Tus datos en `userData` y la base clínica **no se borran**.

### Volver a una versión anterior (rollback manual)

Si prefieres instalar a mano o la versión no está en el catálogo curado, reinstala desde Releases siguiendo estos pasos.

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
5. Si la auto-actualización vuelve a proponerte la versión nueva y aún no quieres actualizar, en macOS puedes **esperar 24h** (la app respeta el snooze por versión), o cambiar a canal **Estable** si estabas en **Pre-releases**.

**Datos locales y compatibilidad:**

- Tus datos (pacientes, notas, indicaciones, historial de labs, respaldos JSON, ajustes) están en el `userData` de Electron — abre la carpeta desde **Ajustes → Datos en esta computadora → Abrir carpeta…**. **No se borran** al reinstalar una versión anterior.
- Si una release documenta un **cambio de formato incompatible**, importa tu respaldo `.json` más reciente desde **Ajustes → Respaldo local → Importar copia de seguridad…** después de reinstalar la versión anterior.
- En macOS, `electron-updater` requiere misma firma y `appId` (`com.hospitaluniversitario.rplusclinical`) entre versiones. Si cambias manualmente entre una build firmada y otra ad-hoc, es normal que la auto-actualización falle: reinstala desde el `.dmg` para resolverlo.

---

**Autor:** Mauricio Salas
