# R+

Herramienta clínica de escritorio para generación de **notas de evolución**, **indicaciones médicas** y visualización de **laboratorios** con diagramas automáticos.

## Instalación (Mac y Windows)

Todo se descarga desde **[Releases — última versión](https://github.com/mausalas99/r-mas/releases/latest)**. No hace falta instalar Python por separado: los instaladores ya traen el runtime para generar los `.docx`.

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

**Versión estable actual:** [6.4.2](https://github.com/mausalas99/r-mas/releases/tag/v6.4.2) — en *Releases* verás siempre el instalador más reciente con el número de versión en el nombre del archivo.

---


## R+ 6.4.1 (Mantenimiento · publicación y tests)

- **Publicación** — `release:publish` valida versión/tag/release antes de construir; commit opcional de notas pendientes; `--allow-existing-gh` para subir instaladores sin recrear el release.
- **Tests** — Corrección menor en censo PDF para que `npm test` pase en Node al publicar.
- **Producto** — Misma funcionalidad que **6.4.0** (VPO, formatos en expediente, censo, etc.).

Notas: `docs/RELEASE_NOTES_6.4.1.txt`.

## R+ 6.4.0 (Valoración preoperatoria · formatos en expediente)

- **VPO** — Pestaña **Valoración preoperatoria** en Clínico (Interconsulta) o Salida (Sala): calculadora ASA / RCRI / Gupta / ARISCAT / Caprini, procedimiento Gupta con búsqueda, EKG y Rx editables, fármacos perioperatorios desde la receta SOME y copiar bloques para nota externa.
- **Formatos clínicos** — Plantillas en blanco editables en las pestañas **Nota** e **Indicaciones** (desde Mi Perfil); botón **Guardar** al final; solo rellenan secciones vacías en pacientes nuevos.
- **Mi Perfil** — Bloques más claros; restablecer formatos sin tocar notas ya escritas.

Notas: `docs/RELEASE_NOTES_6.4.0.txt`.

## R+ 6.3.6 (Cultivos multipaciente SOME · sala en vivo resiliente)

- **Cultivos** — Varios `MICROORGANISMO` en un informe: **una fila por aislamiento**, cuenta y antibiograma (chips R/I/S) por germen; **Preliminar** sin ATB; marcas BLEE, Carb-R y BLAC por aislamiento.
- **Manejo → ATB** — Alertas **Carb-R** cuando el cultivo lo indica.
- **Sala en vivo (⇄)** — Si el anfitrión cierra R+ o deja de responder en la red, **otra Mac o Windows con R+ de escritorio** (unida con el enlace de invitación) asume el servidor temporalmente hasta que el anfitrión original vuelva; el resto del equipo intenta reconectar solo. En Windows puede hacer falta permitir R+ en el firewall la primera vez (puerto 3738).

Notas: `docs/RELEASE_NOTES_6.3.6.txt`.

## R+ 6.3.5 (Bomba con switch, Unirse a sala y ajustes de monitoreo)

- **Estado Actual** — Interruptor **Bomba de insulina** (estilo laboratorio): activado sustituye las glucometrías normales por filas Glu + Unidades + Hora; layout del botón × corregido.
- **Sala en vivo (⇄)** — Corregido **Unirse** en la lista de salas (el panel ya no se destruye antes del clic).

Notas: `docs/RELEASE_NOTES_6.3.5.txt`.

## R+ 6.3.4 (Estado Actual multilectura, bomba de insulina y Sala en vivo)

- **Estado Actual** — Hasta **4 lecturas** del mismo signo vital en el turno (**+1** en T°, TA, FC, FR, SatO₂); bloque opcional **bomba de insulina** (glu, unidades, hora) en el texto SOAP; glucometrías en gráficas acotadas a la ventana del registro.
- **Expediente** — Al cambiar de paciente se conserva la pestaña activa (**Estado actual**, **Tendencias**, **Cultivos**, etc.).
- **Sala en vivo (⇄)** — Corregido **Copiar invitación**, **Copiar enlace móvil** y **Activar y copiar invitación** (el enlace vuelve al portapapeles).

Notas: `docs/RELEASE_NOTES_6.3.4.txt`.

## R+ 6.3.3 (Guía clínica desbloqueable, modales y gasometría explicada)

- **Guía clínica (Manejo)** — Oculta hasta desbloquear con frase de confirmación; **Ocultar Manejo en Clínico** en Ajustes vuelve a pedir activación si aplica.
- **Modales** — **Esc** y clic fuera restaurados (capas anidadas y arranque al inicio del boot).
- **Tendencias** — Gasometría extendida con razonamiento y tooltips; sparks en canvas; filtro **Solo fuera de rango** coherente con referencias del laboratorio.
- **Estado Actual** — Gráficas de monitoreo con actualización incremental (menos parpadeo).

Notas: `docs/RELEASE_NOTES_6.3.3.txt`.

## R+ 6.3.2 (Pegar monitoreo en Estado Actual — I/O, EVAC y correcciones)

- **Estado Actual** — Modal **Pegar monitoreo** (T°, FC, TA, DXT, I, E, EVAC); egresos desglosados (diuresis, drenajes, nefrostomías) en el texto SOAP; balance solo con diuresis numérica; salida en mayúsculas.
- **Medicamentos** — La receta hospitalaria (pegado y listado procesado) se conserva por paciente al cambiar en la barra lateral.
- **Pendientes** — Los «Repo …» de reposición electrolítica que elimines o marques hechos no reaparecen tras reiniciar ni al sincronizar en sala.

Notas: `docs/RELEASE_NOTES_6.3.2.txt`.

## R+ 6.3.1 (Correcciones menores — cultivos, gasometría y Estado Actual)

- **Cultivos** — Cabeceras con paréntesis (p. ej. secreción de herida) vuelven a listarse en la pestaña **Cultivos** del expediente.
- **Micobacterias** — Reportes SOME de sección **MYCOBACTERIAS**: baciloscopia y cultivo micobacteriano por separado, con muestra tomada de **OBSERVACIONES** (p. ej. tejido de lengua); ya no se etiqueta erróneamente como «1 MUESTRA».
- **Gasometría** — Extracción de pH / PCO2 / HCO3 cuando los flags A y B van en líneas aparte; interpretación de trastornos mixtos (p. ej. alcalosis respiratoria con acidosis metabólica concomitante).
- **Estado Actual** — Cuadritos de signos vitales sin artefactos en las esquinas al unir etiqueta y valor.

Notas: `docs/RELEASE_NOTES_6.3.1.txt`.

## R+ 6.3.0 (Sala en vivo — LAN estable y flujo simplificado)

- **Sala en vivo (⇄)** — En escritorio (Mac o Windows), la app asume servidor del turno (IP automática); panel sin pestañas Anfitrión/Cliente; **Activar sala en vivo**, **Salas en vivo** y enlace de invitación.
- **Otra computadora** — Sección para unirse con enlace de invitación; **Usar esta Mac como servidor del turno** (o equivalente en Windows) para volver al modo local.
- **LiveSync** — Corregida reconexión permanente («reconectando…»); sesiones guardadas muestran **En sala** cuando ya estás en esa sala.

Notas: `docs/RELEASE_NOTES_6.3.0.txt`.
## R+ 6.2.1 (Expediente más fluido — Manejo opcional en Interconsulta)

- **Rendimiento** — Bundle único del frontend al compilar; menos lag al cambiar paciente y al alternar **Estado actual** ↔ **Resultados** (caché de pestañas, precalentado en Sala, tendencias con parseo cacheado e render incremental).
- **Ajustes → Expediente** — **Ocultar Manejo en Clínico**: en Interconsulta conserva **Nota** e **Indicaciones**; solo oculta Manejo (antes la opción quitaba toda la pestaña Clínico).
- **Sala** — Corregido: el formulario de Nota ya no se superpone en **Resultados**.

Notas: `docs/RELEASE_NOTES_6.2.1.txt`.

## R+ 6.2.0 (Estado Actual estructurado — monitoreo en Sala)

- **Estado Actual (Sala)** — Nueva pestaña en el expediente: registro de SV, glucometrías e I/O; snapshot, historial, gráficas de tendencia y texto clínico copiable; estado clínico colapsable y propuestas de medicación desde SOAP.
- **Laboratorio** — **Salida rápida** en Vista de laboratorio: procesa y formatea SOME sin necesidad de tener al paciente en la lista (no guarda historial).
- **Expediente más fluido** — Caché al volver a pestañas, carga diferida de paneles pesados y precarga al pasar el mouse.
- **Correcciones** — Layout de Clínico/Manejo; SV alterados sin falsos positivos en campos vacíos.

Notas: `docs/RELEASE_NOTES_6.2.0.txt`.

## R+ 6.1.0 (Manejo clínico completo — Infusiones, ATB y CAD/EHH)

- **Manejo — cuatro sub-pestañas:** **Electrolitos**, **Infusiones**, **ATB** y **CAD/EHH** en Expediente → Clínico → Manejo (Sala e Interconsulta).
- **Infusiones:** catálogo de infusiones/sedación (32 entradas), lista + detalle, favoritos, infusiones personalizadas, calculadoras y SOME copiable.
- **ATB:** ~30 fármacos en 12 familias; sugerencias según cultivos positivos; eTFG desde laboratorio; filtros por familia/indicación; SOME sin +Pendiente.
- **CAD/EHH:** lectura de BH/QS/gasometría, checklist ADA y bloque SOME.
- **Expediente:** pestañas Clínico y sub-pestañas de Manejo con barra subrayada unificada y mejor accesibilidad.

Notas: `docs/RELEASE_NOTES_6.1.0.txt`.

## R+ 6.0.1 (entrada masiva de laboratorios y fixes rápidos)

- **Laboratorio:** un solo cuadro procesa varios reportes SOME — varios días del mismo paciente seguidos, o varios pacientes con **Separador de paciente** (`--- PACIENTE ---`). Consolidación automática por día calendario.
- **Receta HU:** exportación PDF oficial 000-061-R-06-12 vía servidor local.
- **Tutorial:** dos días de DEMO PÉREZ precargados + paso explicativo multi-paciente con DEMO GARCÍA.

Notas: `docs/RELEASE_NOTES_6.0.1.txt`.

## R+ 6.0.0 (expediente reorganizado, Manejo y Receta HU)

- **Expediente (vista Normal):** cuatro pestañas — **Paciente** (datos colapsables + pendientes), **Clínico**, **Resultados**, **Salida** — en Sala e Interconsulta (Sala: Manejo + Listado; Interconsulta: Nota/Indicaciones/Manejo + Receta HU PDF).
- **Manejo electrolítico:** dosis, dilución, vía y bloque SOME desde laboratorios procesados; peso/talla/vía en Datos del paciente.
- **Receta HU:** formulario unificado, exportación PDF oficial 000-061-R-06-12.
- **Modo Pase:** el resumen de ronda en pantalla principal **no cambia**; la reorganización del expediente se ve al abrir el detalle en pestañas.

Notas: `docs/RELEASE_NOTES_6.0.0.txt`.

## R+ 5.2.1 (cáscara Arc y correcciones UX)

- **Interfaz Arc:** cáscara flotante, esquinas radiales y paneles unificados en Lab, Medicamentos, Agenda, Expediente y Pase.
- **Sidebar:** rail al auto-ocultar; esquinas corregidas al mostrar la barra de pacientes.
- **Pendientes:** prioridad con chip clickeable (Alta / Media / Baja) y animación al cambiar.
- **Correcciones:** Agenda sin doble marco; pestaña Datos ya no pierde el foco al escribir.

Notas: `docs/RELEASE_NOTES_5.2.1.txt`.

## R+ 5.2.0 (integración Neo)

- **Neo:** botones **Enviar a Neo** en tablas SOME, laboratorio y tendencias (mismo protocolo `sesion-ingreso://`).
- **Tutorial Sala:** pasos que muestran el envío sin abrir Neo durante el tour.

Notas: `docs/RELEASE_NOTES_5.2.0.txt`.
## R+ 5.1.0 (estable — tablas SOME del reporte)

- **Laboratorio:** botón **Tablas del reporte** tras procesar un SOME; modal con tablas por departamento (BH, QS, orina, bacteriología, citoquímico, etc.).
- **Copiar por sección:** TSV o PNG por departamento desde el modal; flags de alerta visibles en la tabla.
- **Parser:** menos ruido (comentarios/observaciones), EGO y líquidos corporales agrupados correctamente; historial de labs más robusto al importar respaldos.

Notas: `docs/RELEASE_NOTES_5.1.0.txt`.

## R+ 5.0.2 (estable — arquitectura modular, Pase y arranque)

- **Arquitectura:** `app.js` como bootstrap; lógica en `features/*`, estilos en `public/styles/`, HTML desde `index.src.html` + partials.
- **Build:** `npm run build:ui` / `build:ui:check` para ensamblar `index.html`.
- **Correcciones:** guardado y lista de pacientes; Modo Pase visible al seleccionar paciente.

Notas: `docs/RELEASE_NOTES_5.0.2.txt`.
## R+ 5.0.1 (estable — labs manuales, tendencias BH, fullscreen y LiveSync)

- **Laboratorios:** diferencial manual SOME (Segmentados, bandas, metamielocitos) + coagulación y frotis; salida `Dif.` / `Coag.` legible; plaquetas en citrato; EGO no contamina BH.
- **Tendencias BH:** panel **Diferencial manual** con títulos del reporte; tablas y gráficas desde el bloque multilínea.
- **UX:** modal Gráfica/Tabla del estudio a **pantalla completa**.
- **LiveSync:** borrar pendiente o paciente en la sala se refleja en todos los equipos conectados.

Notas: `docs/RELEASE_NOTES_5.0.1.txt`.

## R+ 3.5.0 (estable — gráfica y tabla por estudio en Tendencias)

- **Tendencias:** botón «Gráfica» por estudio → modal con gráficas agrupadas y tabla copiable (PNG / TSV).
- **Gráficas:** leyenda, colores, escalas dinámicas, paneles reordenables/ocultables.
- **Tabla:** ocultar filas/columnas en copia; barra de ocultos colapsable.
- **UX:** **Esc** o clic fuera cierran modales; gráfica de detalle al pulsar tarjetas de tendencias.

Notas: `docs/RELEASE_NOTES_3.5.0.txt`.

## R+ 3.4.1 (estable — sugerencias lab + DIA#)

- **Laboratorio:** pendientes sugeridos al procesar o **reprocesar** (TRANSFUSION, REPO DE …).
- **Medicamentos:** botón **+1 día (DIA#)** sin volver a pegar del hospital.

Notas: `docs/RELEASE_NOTES_3.4.1.txt`.

## R+ 3.4.0 (estable — R+ Móvil + tutorial LiveSync)

- **R+ Móvil:** `http://<IP-Mac>:3738/mobile/` en Safari (misma Wi‑Fi): **misma interfaz** que escritorio; oculta solo Word / salida rápida. LiveSync por sala ⇄.
- **⇄ → Copiar enlace móvil** para compartir solo la URL.
- **Tutorial:** al terminar Sala o Interconsulta explica LiveSync y la versión móvil.

Notas: `docs/RELEASE_NOTES_3.4.0.txt`.

## R+ 3.3.2 (estable — LAN 1234 + expediente en sala)

- **LAN** — Código de equipo por defecto **1234**; primera configuración del host con aviso explícito.
- **LiveSync** — En sala (⇄) se fusionan **pacientes, notas, labs, agenda y pendientes** sin borrar pacientes solo locales.

Notas: `docs/RELEASE_NOTES_3.3.2.txt`.

---


## R+ 5.0.3 (estable — copiar labs en Windows y tendencias)

- **Laboratorio (Windows)** — **Copiar** en Resultados y FAB flotante visibles; copia al portapapeles con fallback.
- **Tendencias** — Orden BH/QS alineado al reporte SOME; más series de diferencial en el catálogo.
- **Interfaz** — Chip Modo Pase clicable para volver a vista Normal.

Notas: `docs/RELEASE_NOTES_5.0.3.txt`.
## R+ 3.3.1 (estable — corrección Copiar labs)

- **Laboratorio** — **Copiar** vuelve a exportar el texto compacto procesado (no el informe crudo de SOME).

Notas: `docs/RELEASE_NOTES_3.3.1.txt`.

---


## R+ 5.0.4 (estable — historial de labs corrupto)

- **Historial de labs** — Repara respaldos con historial mal formado que impedían abrir Laboratorio (sets corruptos en `forEach`).

Notas: `docs/RELEASE_NOTES_5.0.4.txt`.
## R+ 3.3.0 (estable — LiveSync por sala: agenda y pendientes)

- **LiveSync** — En la misma sala LAN, agenda de procedimientos y pendientes se sincronizan en vivo entre equipos.
- **Listado** — Botón **Copiar prompt IA** para plantilla de listado de problemas.

Notas: `docs/RELEASE_NOTES_3.3.0.txt`.

---


## R+ 3.2.2 (estable — laboratorio + canal Estable en actualizaciones)

- **Actualizaciones** — Canal **Estable** detecta releases oficiales al arrancar y al cambiar de canal; salto directo recomendado desde 3.0.x / 3.2.0.
- **Laboratorio** — Incluye arreglos de 3.2.1: **Copiar** visible, BH compacta, asteriscos en alterados.

Notas: `docs/RELEASE_NOTES_3.2.2.txt`.

---


## R+ 3.2.1 (parche — laboratorio: BH compacta, copiar, asteriscos)

- **Laboratorio** — **Copiar** en Resultados visible de nuevo en vista normal; **BH** sin línea extendida: solo núcleo compacto en la primera fila; **RBC, CHCM, RDW, MPV, Ret** en la segunda solo con **BH extendida** activada.
- **Copia** — Los valores alterados conservan **\*** al copiar o enviar a nota; en pantalla se muestra **\*** en rojo y se evita mezclar “, alterado” al seleccionar texto.

Notas: `docs/RELEASE_NOTES_3.2.1.txt`.

---


## R+ 6.4.2 (Corrección arranque · censo PDF en instalador)

- **TODO:** completar bullets en README.

Notas: `docs/RELEASE_NOTES_6.4.2.txt`.
## R+ 3.2.0 (laboratorio, pacientes Sortable, pase, estable)

- **Laboratorio** — Limpiar entrada tras procesar con resultados; gasometría extendida con etiqueta e interruptor alineados al comportamiento esperado.
- **Pacientes** — Orden por arrastre por sección (SortableJS); tarjetas y modo ronda más compactos.
- **Pase** — Agenda + Pendientes en fila; medicación con dosis **solo antes de `//`**, chips compactos y UI grandes abreviadas (p. ej. 2,4M UI).
- **Receta** — `dosisBeforeSlash` en el núcleo compartido entre exportes y vista Pase.
- **Actualizaciones** — Canal por defecto Estable; pre-releases como opción explícita en Ajustes (sin presentar la app como “beta”).

Notas: `docs/RELEASE_NOTES_3.2.0.txt`.

---

## R+ 3.0.2 (laboratorio, listado docx, tutorial, Python Mac)

- **Gasometría** — Delta-delta e interpretación; reproceso desde historial y dedupe al consolidar.
- **Laboratorio** — Al cambiar de paciente: limpiar resultados, expandir historial y scroll a la tarjeta.
- **Listado .docx** — Una tabla por problema; texto largo troceado para paginación más limpia.
- **Tutorial Sala** — Dock del tour por encima del listado al resaltar esa zona.
- **Mac** — Fallback de Python: prioridad a `/opt/homebrew` en Apple Silicon.
- **README** — Instalación al inicio del documento.

Notas: `docs/RELEASE_NOTES_3.0.2.txt`.

---

## R+ 3.0.1 (parche — procalcitonina y listado de problemas en 8 pt)

- **Procalcitonina (PCT)** — El bloque de Estudios Especiales se procesa y la procalcitonina aparece en QS junto a PCR (`QS  PCT 0.09*`). El extractor ignora los rangos pediátricos por horas y usa el límite de adulto (`ADULTO <0.05 ng/mL`) para marcar valores fuera de rango. También disponible como serie en Tendencias.
- **Listado de Problemas** — El texto generado en el `.docx` (fecha, número y descripciones de activos/inactivos) ahora sale en 8 pt para que entren más problemas por hoja.

Notas: `docs/RELEASE_NOTES_3.0.1.txt`.

---

## R+ 3.0.0 (modos Sala/Interconsulta, Estado Actual, Listado de Problemas, anion gap)

- **Modos** — Sala oculta Nota/Indicaciones y expone **Estado Actual** y **Listado de Problemas**; Interconsulta mantiene el comportamiento original. Default: Sala. En Sala, el alta de paciente usa **Servicio** (con default configurable en Mi Perfil) en lugar de Área.
- **Estado Actual** — Botón rápido en la **barra del encabezado** (junto al modo de trabajo) que reusa la Plantilla de Evolución sin **Subjetivo**: guarda el snapshot por paciente con timestamp y lo copia al portapapeles.
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
- **Ocultos** — Ojo en cada tarjeta; botón **Ocultos (n)** abre una ventana con chips y «Mostrar todos»; preferencias persistidas.
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
- **Expediente** — En vista Normal: **Paciente**, **Clínico**, **Resultados** y **Salida** (en **Sala** también **Estado actual** entre Clínico y Resultados). En **Modo Pase** el tablero de ronda sigue igual; al abrir un bloque entras al expediente con la misma organización de pestañas.
- **Estado Actual (Sala)** — Monitoreo estructurado: medición, snapshot, balance hídrico, historial, tendencias y texto copiable; integración con medicamentos y LiveSync por sala.
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

- **Instalación desde el instalador oficial** (`.dmg` / `.exe`; instrucciones arriba en **Instalación**): no necesitas instalar Python; la app incluye un runtime empaquetado para generar los `.docx`.
- **Desarrollo desde el código fuente** (`npm start` / compilar tú mismo): hace falta **Python 3** en el PATH para la generación de documentos (o el runtime en `python-runtime/` tras `npm run prebuild:mac` / build).
  - Mac: `brew install python3` (en Apple Silicon, Homebrew nativo vive en `/opt/homebrew`). Ejecuta **Terminal** y la app **sin** “Abrir con Rosetta”. Si macOS avisa de *Support Ending for Intel-based Apps* al usar Python, casi siempre es un `python3` x86_64 (p. ej. antiguo `/usr/local` bajo Rosetta): instala o prioriza el Python de `/opt/homebrew/bin/python3`, o deja que el build use el runtime empaquetado en `python-runtime/mac-arm64`.
  - Windows: [python.org](https://www.python.org/downloads/) — marcar "Add to PATH".

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

# Publicar release: bump (si falta), completar docs/RELEASE_NOTES_X.Y.Z.txt + README + highlights en settings-help.mjs, luego:
npm run build:ui
npm run release:publish

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
5. Si la auto-actualización vuelve a proponerte la versión nueva y aún no quieres actualizar, en macOS puedes **esperar 24h** (la app respeta el snooze por versión), o cambiar a canal **Estable** si estabas en **Pre-releases**.

**Datos locales y compatibilidad:**

- Tus datos (pacientes, notas, indicaciones, historial de labs, respaldos JSON, ajustes) están en el `userData` de Electron — abre la carpeta desde **Ajustes → Datos en esta computadora → Abrir carpeta…**. **No se borran** al reinstalar una versión anterior.
- Si una release documenta un **cambio de formato incompatible**, importa tu respaldo `.json` más reciente desde **Ajustes → Respaldo local → Importar copia de seguridad…** después de reinstalar la versión anterior.
- En macOS, `electron-updater` requiere misma firma y `appId` (`com.hospitaluniversitario.rplusclinical`) entre versiones. Si cambias manualmente entre una build firmada y otra ad-hoc, es normal que la auto-actualización falle: reinstala desde el `.dmg` para resolverlo.

---

**Autor:** Mauricio Salas
