# Changelog

Todas las versiones relevantes de R+.

Formato basado en [Keep a Changelog](https://keepachangelog.com/).

## [5.0.4](docs/RELEASE_NOTES_5.0.4.txt)

R+ 5.0.4 (estable — historial de labs corrupto)
===================================================

Fecha: 2026-05-21

## Resumen

Corrige respaldos con historial de laboratorio mal formado que impedían abrir la pestaña Laboratorio (error al iterar sets corruptos).

## Correcciones

- **Historial de labs** — Normalización al cargar respaldos: evita historiales corruptos que rompían la vista o lanzaban errores en `forEach` sobre estructuras inválidas.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v5.0.4

- Mac: `R+-5.0.4-arm64.dmg`, `R+-5.0.4-x64.dmg` (y zip para auto-update).
- Windows: `R+-5.0.4-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [5.1.0](docs/RELEASE_NOTES_5.1.0.txt)

R+ 5.1.0 (estable — tablas SOME del reporte)
==============================================

Fecha: 2026-05-22

## Resumen

Tras pegar un reporte SOME, abre **Tablas del reporte** para ver cada departamento en tablas legibles (BH, química, orina, bacteriología, citoquímico de líquidos, etc.) y copiar por sección en TSV o PNG.

## Nuevo / mejorado

- **Laboratorio — tablas SOME:** parser tabular por departamento y subgrupo; columnas Estudio / Resultado / Unidades / Referencia; resalta valores fuera de rango (flags * / A / B / CB / CA).
- **Modal Tablas del reporte:** botón en la barra de Resultados (junto a Copiar); secciones plegables por departamento; export **Copiar tabla** (TSV) y **Copiar imagen** (PNG) por bloque.
- **Parser SOME:** química clínica, biometría y EGO en tablas planas; citoquímico de líquidos corporales por fuente; omite comentarios de muestra y observaciones; menos filas duplicadas o vacías.
- **Historial de labs:** normalización más segura al cargar respaldos (evita historiales corruptos que rompían la vista).

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v5.1.0

- Mac: `R+-5.1.0-arm64.dmg`, `R+-5.1.0-x64.dmg` (y zip para auto-update).
- Windows: `R+-5.1.0-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [5.2.0](docs/RELEASE_NOTES_5.2.0.txt)

R+ 5.2.0 (integración Neo)
===================================

Fecha: 2026-05-23

## Resumen

Integración visible con **Neo**: envío de laboratorio y tendencias desde R+ hacia la app externa, con pasos informativos en el tutorial modo Sala.

## Nuevo / mejorado

- Botones y modales: **Enviar a Neo** (laboratorio y tendencias).
- Tutorial **Sala**: resalta Tablas SOME y el envío de gráficas sin abrir Neo durante el tour.
- Protocolo técnico sin cambios: `sesion-ingreso://import`.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/latest

- Mac: `R+-5.2.0-arm64.dmg`, `R+-5.2.0-x64.dmg`
- Windows: `R+-5.2.0-x64.exe`


## [5.2](docs/RELEASE_NOTES_5.2.txt)

R+ 5.2.0 (estable — integración Neo)
==========================================

Fecha: 2026-05-23

## Resumen

Integración visible con **Neo** (antes Sesión de Ingreso / Casiopea): copy actualizado y dos pasos nuevos en el tutorial modo Sala que señalan cómo enviar laboratorio y tendencias sin abrir la app durante el tour.

## Nuevo / mejorado

- Botones y modales muestran **Neo** en lugar de Sesión de Ingreso.
- Tutorial **Sala**: pasos tras revisar laboratorio y gráficas de tendencias explican **Enviar a Neo**.
- Protocolo técnico sin cambios: `sesion-ingreso://import` y payloads `r-plus` / `lab-tables` / `lab-trends`.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/latest

- Mac: `R+-5.2.0-arm64.dmg`, `R+-5.2.0-x64.dmg`
- Windows: `R+-5.2.0-x64.exe`


## [5.2.1](docs/RELEASE_NOTES_5.2.1.txt)

R+ 5.2.1 (cáscara Arc y correcciones UX)
==========================================

Fecha: 2026-05-24

## Resumen

Refinamiento visual tipo **Arc** (cáscara flotante, esquinas radiales, paneles unificados) y correcciones de usabilidad en Agenda, sidebar auto-oculto y edición de datos del paciente.

## Nuevo / mejorado

- **Interfaz:** cáscara con `--shell-gap`, header y `.app` con radios consistentes; paneles flotantes en Lab, Medicamentos, Agenda, Expediente y Pase.
- **Sidebar:** rail discreto al auto-ocultar; esquinas redondeadas al mostrar/ocultar la barra de pacientes.
- **Tabs:** fila principal con esquinas superiores suaves; indicador animado en pestañas.
- **Pendientes:** chip de prioridad con clic para rotar (Alta / Media / Baja) y pulso visual.
- **Motion:** `motion.css`, transiciones de paneles y utilidades en `ui-motion.mjs`.

## Correcciones

- **Agenda:** panel único bajo las tabs (sin doble marco ni header desconectado).
- **Datos del paciente:** ya no pierde el foco al escribir en la pestaña Datos (modo Sala).
- **Sidebar oculto:** esquina superior izquierda del contenido alineada con la cáscara cuando reaparece la barra.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v5.2.1

- Mac: `R+-5.2.1-arm64.dmg`, `R+-5.2.1-x64.dmg` (y zip para auto-update).
- Windows: `R+-5.2.1-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [5.6.3](docs/RELEASE_NOTES_5.6.3.txt)

R+ 5.6.3 (estable — release 5.6.3)
======================================

Fecha: 2026-06-01

## Resumen

Versión estable de mantenimiento: laboratorio al cambiar paciente, lista ordenable, vista Pase compacta y canal de actualizaciones Estable por defecto.

## Nuevo / mejorado

- **Laboratorio** — Limpieza de resultados al cambiar paciente; historial expandido y scroll a la tarjeta activa.
- **Pacientes** — Reordenar tarjetas por arrastre (SortableJS); UI de ronda más compacta.
- **Pase** — Agenda y pendientes en fila; dosis de medicación solo antes de `//`.
- **Actualizaciones** — Canal Estable predeterminado; pre-releases solo si se activan en Ajustes.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v5.6.3

- Mac: `R+-5.6.3-arm64.dmg`, `R+-5.6.3-x64.dmg` (y zip para auto-update).
- Windows: `R+-5.6.3-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [6.0.0](docs/RELEASE_NOTES_6.0.0.txt)

R+ 6.0.0 (expediente reorganizado, Manejo y Receta HU)
======================================================

Fecha: 2026-05-25

## Resumen

Versión mayor centrada en el **Expediente**: cuatro pestañas consolidadas en Sala e Interconsulta, **Manejo electrolítico/gasométrico**, **Receta médica HU** (PDF oficial) y datos del paciente en bloque colapsable. El **Modo Pase** mantiene el mismo resumen de ronda en pantalla principal; la nueva organización aparece al abrir el detalle en pestañas (vista Normal).

## Nuevo / mejorado

### Expediente (vista Normal — pestañas completas)

- **Cuatro pestañas** en Sala e Interconsulta:
  - **Paciente** — *Datos del paciente* (colapsable, cerrado por defecto) + **Pendientes**.
  - **Clínico** — Sala: **Manejo** electrolítico. Interconsulta: **Nota**, **Indicaciones** y **Manejo** (barra de segmentos).
  - **Resultados** — **Tendencias** y **Cultivos**.
  - **Salida** — Sala: **Listado de problemas**. Interconsulta: **Receta médica HU** (PDF 000-061-R-06-12).
- **Datos del paciente** — Peso, talla y vía para Manejo; edición en el bloque colapsable de **Paciente** (Interconsulta ya no duplica el formulario en Nota).
- **Manejo** — Interpretación de alteraciones electrolíticas y gasométricas: dosis adultas, dilución, vía, bloque SOME copiable y envío a Pendientes.
- **Receta HU** — Formulario unificado (una sola hoja visual), medicamentos y estudios con **Agregar** / **Enter**, exportación PDF vía servidor local.
- **Deep links** — Atajos y enlaces internos (`switchInnerTab('notas')`, etc.) resuelven a la pestaña compuesta correcta.

### Modo Pase (sin cambios en el resumen)

- El **tablero de ronda** (pendientes, laboratorio, cultivos, medicamentos en columnas) **no cambia** en 6.0.
- Al pulsar un bloque o usar **Ctrl/⌘+1…4** para abrir el detalle, entras a **Expediente** en vista Normal y ahí ves las **cuatro pestañas** nuevas.

### Tutorial y ayuda

- Onboarding inicial y tour guiado actualizados para Sala e Interconsulta (paso de pestañas del expediente, Manejo, Receta / Listado).
- Notas de versión in-app al actualizar.

## Correcciones

- **Receta HU:** scroll en pestaña Salida; botón **Exportar PDF** ya no arrastra la ventana en macOS (región de arrastre acotada al header principal).
- **Datos del paciente:** el formulario se renderiza al abrir el bloque colapsable y al estar en **Paciente**, no solo en la pestaña Datos antigua.
- **Exportar PDF:** ya no queda deshabilitado por estado offline del servidor RPC.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.0.0

- Mac: `R+-6.0.0-arm64.dmg`, `R+-6.0.0-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.0.0-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [6.0.1](docs/RELEASE_NOTES_6.0.1.txt)

R+ 6.0.1 (entrada masiva de laboratorios y fixes rápidos)
============================================================

Fecha: 2026-05-25

## Resumen

Parche sobre 6.0.0: el cuadro principal de **Laboratorio** procesa **varios reportes SOME** a la vez (varios días del mismo paciente o varios pacientes con separador). Incluye **Receta HU PDF** desde servidor local y ajustes menores del tour y la cáscara.

## Nuevo / mejorado

### Laboratorio — entrada masiva integrada

- **Un solo cuadro de pegado** — pega uno o muchos reportes SOME completos (desde «Expediente:») y pulsa **Procesar**.
- **Vista previa antes de guardar** — si hay varios días, varios pacientes o avisos (expediente no encontrado, error de parseo), se abre una tabla de revisión; confirmas con **Procesar todo** o cancelas.
- **Varios días, mismo paciente** — reportes seguidos se distinguen por `Fecha Registro`; el mismo día se consolida en un conjunto (la hora es opcional).
- **Varios pacientes** — botón **Separador de paciente** inserta `--- PACIENTE ---` entre bloques; cada expediente debe existir en la lista.
- **Historial y nota** — cada conjunto guardado alimenta historial, tendencias y reconstrucción de `estudios` en la nota.

### Receta HU

- **Exportar PDF** — endpoint `/generate-receta-hu` con plantilla oficial HU 000-061-R-06-12.
- **Tokens de cáscara** — ajustes de radius/shell en la UI (Arc).

### Tutorial

- Onboarding de laboratorio con **dos días de DEMO PÉREZ** precargados.
- Paso nuevo **separador multi-paciente** con ventana explicativa y ejemplo **DEMO GARCÍA** insertable.
- Registro demo alineado con el expediente SOME del tour.

## Correcciones

- Mensaje de puerto ocupado más claro al iniciar el servidor local (`lsof` + PID).
- Duplicados exactos omitidos al procesar pegados masivos (misma fecha + mismas líneas).

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.0.1

- Mac: `R+-6.0.1-arm64.dmg`, `R+-6.0.1-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.0.1-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [6.1.0](docs/RELEASE_NOTES_6.1.0.txt)

R+ 6.1.0 (Manejo clínico completo — Infusiones, ATB y CAD/EHH)
================================================================

Fecha: 2026-05-25

## Resumen

R+ 6.1.0 completa **Expediente → Clínico → Manejo** con cuatro sub-pestañas: **Electrolitos** (ya existente), **Infusiones**, **ATB** y **CAD/EHH**. Cada módulo lee laboratorio y datos del paciente activo, genera texto SOME copiable campo por campo y unifica la navegación del expediente clínico con el mismo lenguaje visual de pestañas subrayadas.

## Nuevo / mejorado

### Manejo — sub-pestañas

- **Electrolitos** — alteraciones de electrolitos y gasometría con dosis adultas, dilución, vía y bloque SOME (sin cambio de ruta).
- **Infusiones** — catálogo hospitalario de vasopresores, sedación y otras infusiones con panel dividido lista + detalle.
- **ATB** — catálogo curado (~30 fármacos, 12 familias) con sugerencias según cultivos positivos.
- **CAD/EHH** — checklist ADA con lectura automática de BH, QS y gasometría.

### Infusiones

- **32 entradas** en 10 categorías (vasopresores, sedación, anticonvulsivantes, fluidos, analgesia, respiratorio, etc.).
- **Lista + panel de detalle** — busca, filtra por categoría, favoritos y recientes; selecciona una infusión para ver indicación, notas y SOME.
- **Calculadoras integradas** — sedación mg/kg/h, carga de levetiracetam, bicarbonato balanceado HU y otras según la entrada.
- **Infusiones personalizadas** — crea y guarda entradas propias con plantilla SOME editable.
- **Copia SOME** — texto listo para pegar en el hospital, campo por campo (sin marcas +Pendiente).

### ATB (antibióticos)

- **Catálogo local** — dosis adultas, vía, indicaciones, notas renales y abreviaturas SOME por fármaco.
- **Sugerencias por cultivo** — si hay cultivos positivos en Resultados, resalta organismos y antibióticos relacionados (puente RIS → Manejo).
- **Ajuste renal automático** — eTFG estimada desde laboratorios recientes; notas de dosis en SOME cuando aplica.
- **Filtros** — chips por familia (carbapenémicos, cefalosporinas, glicopéptidos, etc.) e indicación clínica.
- **Panel SOME** — copia la indicación sugerida sin +Pendiente.

### CAD/EHH

- **Clasificación sugerida** — lee glucosa, gasometría, anión gap, osmolalidad y datos del paciente para orientar CAD vs EHH.
- **Checklist ADA** — pasos de manejo con casillas; modo manual si prefieres forzar CAD o EHH.
- **Bloque SOME** — resumen copiable alineado al protocolo activo.

### Expediente — navegación clínica

- **Pestañas unificadas** — segmentos de Clínico (Nota de evolución, Indicaciones, Manejo) y sub-pestañas de Manejo comparten barra subrayada e indicador deslizante.
- **Accesibilidad** — roles ARIA y foco visible en barras de segmento.
- **Etiquetas alineadas** — «Nota de evolución» y nombres consistentes en Sala e Interconsulta.

## Correcciones

- Mejoras visuales en tarjetas ATB (bordes redondeados, acento único del sistema de diseño).
- Indicador de pestaña sincronizado al cambiar sub-módulos sin perder la sub-pestaña activa en sesión.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.1.0

- Mac: `R+-6.1.0-arm64.dmg`, `R+-6.1.0-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.1.0-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [6.2.0](docs/RELEASE_NOTES_6.2.0.txt)

R+ 6.2.0 (Estado Actual estructurado — monitoreo en Sala)
=======================================================

Fecha: 2026-05-26

## Resumen

R+ 6.2.0 añade **monitoreo estructurado en Sala** con la pestaña **Estado actual** en el expediente: signos vitales, glucometrías, balance hídrico, historial, gráficas de tendencia y texto clínico copiable. Incluye mejoras de **laboratorio** (salida rápida sin paciente en lista) y **rendimiento** al cambiar pestañas del expediente.

## Nuevo / mejorado

### Estado Actual (Sala)

- **Pestaña de primer nivel** — Expediente → **Estado actual** (entre Clínico y Resultados), con botón verde en el encabezado que abre el panel.
- **Registro de medición** — SV con rangos normales; hora editable solo si un valor está alterado; glucometrías dinámicas; ingresos/egresos y balance de turno.
- **Snapshot y balance** — Resumen del último valor por parámetro; balance de turno y balance global histórico derivados del historial.
- **Estado clínico general** — Bloque colapsable (FOUR, esferas, soporte, dieta con kcal/kg calculadas por peso del paciente, medicamentos con propuestas desde SOAP).
- **Historial y gráficas** — Mediciones recientes; tendencias de SV, glucometrías e I/O con Chart.js (a partir de 2 registros).
- **Texto Estado Actual** — Generación automática tipo SOAP (sin S:); copiar o guardar con timestamp; campos vacíos como `___`.
- **Medicamentos** — En Sala, «Enviar a Estado Actual» propone líneas de medicación para confirmar en el panel (no sobrescribe campos confirmados).
- **Sincronización LAN** — `patient.monitoreo` se fusiona entre equipos de la sala; migración automática desde `patient.estadoActual` legacy.

### Laboratorio

- **Salida rápida** — Nuevo interruptor en **Vista de laboratorio** (engranaje): formatea reportes SOME aunque el expediente no esté en tu lista; no guarda historial.
- **Icono de Resultados** — Matraz distinto al pulso de Estado actual en las pestañas del expediente.

### Rendimiento del expediente

- **Caché por pestaña** — Al volver a una pestaña ya visitada (mismo paciente), no se reconstruye todo el DOM.
- **Carga diferida** — Formulario y snapshot al instante; gráficas, Manejo y Tendencias en frames siguientes (menos lag al entrar por primera vez).
- **Precarga al pasar el mouse** — Las pestañas del expediente empiezan a prepararse al posar el cursor (~70 ms antes del clic).

## Correcciones

- **Clínico / Manejo** — Panel clínico ya no queda cortado a mitad de pantalla (conflicto CSS con la pestaña Estado actual oculta).
- **Signos vitales alterados** — Campos vacíos ya no se interpretan como 0 ni muestran fila «alterado» por error.
- **Layout SV** — Etiqueta y hora de alterado sin recorte en tarjetas estrechas.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.2.0

- Mac: `R+-6.2.0-arm64.dmg`, `R+-6.2.0-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.2.0-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [6.2.1](docs/RELEASE_NOTES_6.2.1.txt)

R+ 6.2.1 (Expediente más fluido — Manejo opcional en Interconsulta)
======================================================================

Fecha: 2026-05-27

## Resumen

R+ 6.2.1 prioriza **fluidez al navegar el expediente** (cambio de paciente y de pestañas), corrige la visibilidad de **Nota / Indicaciones en Sala**, y ajusta la opción de perfil para **ocultar solo Manejo** en Interconsulta (sin quitar la pestaña Clínico completa). Incluye **bundle único del frontend** (recomendación Electron) y mejoras de **tendencias / historial de laboratorio** en pacientes con muchos sets.

## Nuevo / mejorado

### Rendimiento

- **Bundle del renderer** — El código de la interfaz se empaqueta en un solo módulo (`app.bundle.mjs`) al compilar la UI; menos coste de carga al abrir la app (`npm run build:ui` / builds de release).
- **Cambio de paciente** — La lista lateral actualiza solo la tarjeta activa cuando basta; lab y medicamentos solo se repintan si estás en esas pestañas principales.
- **Pestañas del expediente** — Caché por paciente y pestaña: volver a **Estado actual** o **Resultados** no repinta si los datos no cambiaron; sin animación ni doble frame cuando el panel ya está listo.
- **Precalentado** — Tras elegir paciente (Sala), se preparan en segundo plano Estado actual y Tendencias para que el primer cambio sea más rápido.
- **Tendencias / laboratorio** — Parseo con caché por set, ventana compacta de sparks, render incremental cuando la estructura no cambia, y debounce al refrescar tras mutar labs.

### Expediente y ajustes

- **Ocultar Manejo (Interconsulta)** — En **Mi Perfil → Expediente**, la opción ahora dice **Ocultar Manejo en Clínico**: mantiene **Nota de evolución** e **Indicaciones**; solo quita el segmento Manejo. La configuración anterior (`hideClinicoTab`) sigue aplicando como ocultar Manejo.
- **Sala** — En **Resultados** ya no aparece el formulario de Nota encima de Tendencias (los paneles de Nota/Indicaciones se desactivan al salir de Clínico).

## Correcciones

- **Sala + Resultados** — El panel de notas dejaba la clase `active` y se superponía a Tendencias; corregido al sincronizar visibilidad de todos los segmentos de Clínico.
- **Modo Sala** — Al cambiar de modo ya no se reconstruye el formulario de Nota si no aplica en Sala.

## Desarrollo

```bash
npm run build:ui          # index.html + app.bundle.mjs
npm run bundle:renderer   # solo el bundle
npm run bundle:renderer:watch   # desarrollo con recarga del bundle
```

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.2.1

- Mac: `R+-6.2.1-arm64.dmg`, `R+-6.2.1-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.2.1-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye `build:ui` y bundle minificado en prebuild).


## [6.3.0](docs/RELEASE_NOTES_6.3.0.txt)

R+ 6.3.0 (Sala en vivo — LAN estable y flujo simplificado)
============================================================

Fecha: 2026-05-27

## Resumen

Esta versión mejora **Sala en vivo** (conexión LAN del equipo): reconexión WebSocket más fiable, panel ⇄ sin pestañas Anfitrión/Cliente en Mac, y flujo directo para **crear o unirse a salas** y compartir el enlace de invitación.

## Nuevo / mejorado

### Sala en vivo (⇄)

- **Flujo en Mac** — Al abrir la conexión del equipo, esta computadora actúa por defecto como **servidor del turno** (detecta IP y URL en la red); ya no hace falta elegir primero «Anfitrión» vs «Cliente».
- **Crear / unirse** — Panel centrado en **Activar sala en vivo** y **Salas en vivo** (crear sala, unirse, copiar invitación).
- **Unirse a otra Mac** — Sección colapsable para pegar el enlace de invitación si esta R+ debe conectarse al servidor de **otra** computadora; botón **Usar esta Mac como servidor del turno** para volver atrás.
- **Sesiones guardadas** — Si ya estás en una sala, el botón muestra **En sala** (deshabilitado) en lugar de **Unirse**.
- **Textos** — Encabezado del menú ⇄ y ayuda del botón de conexión alineados al flujo «crear o unirse a sala».

### Estabilidad de conexión

- **Reconexión LiveSync** — Corregido el estado «reconectando…» permanente: el cierre del socket antiguo ya no desconecta una sesión que acaba de abrirse; el bucle de reconexión no interrumpe un canal que sigue conectando o abierto.
- **Rol por defecto en escritorio** — En Electron, el rol LAN por defecto es **host** (antes podía quedar en cliente tras actualizar desde una UI con pestañas).

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.3.0

- Mac: `R+-6.3.0-arm64.dmg`, `R+-6.3.0-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.3.0-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye `build:ui` y bundle del renderer).


## [6.3.1](docs/RELEASE_NOTES_6.3.1.txt)

R+ 6.3.1 (Correcciones menores — cultivos, gasometría y Estado Actual)
============================================================

Fecha: 2026-05-27

## Resumen

Parche centrado en el parseo SOME de **cultivos** y **gasometría**, más un ajuste visual en los cuadritos de signos vitales de **Estado Actual**. Recomendado para quien procesa cultivos de herida, micobacterias o gasometrías venosas con flags A/B en líneas separadas.

## Correcciones

### Cultivos (expediente y laboratorio)

- **Cabeceras con paréntesis** — Muestras como «SECRECION DE HERIDA (TRAQUEOSTOMIA)» ya se reconocen como bloque de cultivo y aparecen en la pestaña **Cultivos** (antes se descartaban por el regex de cabecera).
- **Micobacterias (MYCOBACTERIAS)** — Baciloscopia y cultivo micobacteriano se generan como dos entradas con fecha y resultado correctos; la muestra se toma de **OBSERVACIONES** (p. ej. TEJIDO DE LENGUA).
- **Campo PRODUCTO** — Solo coincide con la etiqueta de tabla `PRODUCTO`, no con la palabra «productos» en «baciloscopia de productos diversos» (evitaba confundir **1 MUESTRA** con el sitio anatómico).

### Gasometría

- **Flags A/B en líneas aparte** — Al copiar desde SOME, pH, PCO2 y HCO3 se extraen aunque el reporte no los traiga en una sola línea.
- **Interpretación mixta** — Si coexisten componente respiratorio y metabólico (p. ej. alcalosis respiratoria con HCO3 bajo), la línea **INTERPRETACIÓN GASOMETRÍA** menciona el trastorno concomitante.

### Estado Actual

- **Signos vitales** — Los cuadritos del formulario de registro ya no muestran «picos» en las esquinas (recorte correcto del `border-radius`).

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.3.1

- Mac: `R+-6.3.1-arm64.dmg`, `R+-6.3.1-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.3.1-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye `build:ui` y bundle del renderer).


## [6.3.2](docs/RELEASE_NOTES_6.3.2.txt)

R+ 6.3.2 (Pegar monitoreo en Estado Actual — I/O, EVAC y correcciones)
======================================================================

Fecha: 2026-05-27

## Resumen

Parche centrado en **Estado Actual (Sala)**: pegar el bloque de monitoreo del turno (T°, FC, TA, DXT, I, E, EVAC) con un solo clic, egresos desglosados en el texto SOAP, balance calculado solo con diuresis numérica, y correcciones de **Medicamentos** y **Pendientes** que ya venían en esta versión.

## Nuevo / mejorado

### Estado Actual — pegar monitoreo

- **Modal «Pegar monitoreo»** — Pega el texto del turno en cualquier orden; vista previa en mayúsculas y **Aplicar al formulario** rellena signos, glucometrías e I/O antes de registrar.
- **Formato reconocido** — `T°`, `FC`, `FR`, `TA`, `DXT` (varios valores; hora opcional `198@08:30`), `I`, `E`, `EVAC` y `B` (este último se ignora).
- **Egresos detallados** — En `E:` se interpretan **DIURESIS** (NC, NO CUANTIFICADA o cc), **DRENAJE**, **GASTROSTOMÍA** y **NEFROSTOMÍA** (IZQUIERDA / DERECHA). Solo la diuresis numérica entra al balance; drenajes y nefrostomías se listan aparte en el texto generado.
- **Evacuaciones** — Campo `EVAC` (NC, cc o texto libre, p. ej. sin evacuaciones reportadas en el turno).
- **Balance** — Ingresos menos la **suma de todas las salidas con cc** (diuresis, drenaje, gastrostomía, nefrostomías); NC y NO CUANTIFICADA no suman. No se usa el `B:` pegado.
- **Salida en mayúsculas** — Vista previa, balance en vivo y línea NM del SOAP usan `CC`, `MG/DL`, `LPM`, etc.
- **Glucometrías** — Enter en la última fila agrega otra lectura con hora.
- **Dieta** — Kcal/kg y Kcal total se calculan en ambos sentidos según el peso del paciente.

## Correcciones

### Medicamentos (receta hospitalaria)

- **Cambio de paciente** — El texto pegado y la receta procesada se guardan por paciente; al volver a un paciente recuperas su borrador y su listado.
- **Guardado al cambiar** — Se fuerza la persistencia al seleccionar otro paciente para no perder una receta recién procesada.

### Estado Actual (Sala)

- **Estado clínico general** — Al pulsar Tab entre campos el acordeón ya no se colapsa (antes se re-renderizaba todo el panel).
- **Peso** — Ya no aparece como signo vital en Estado Actual; el peso para kcal/dieta se toma solo de **Datos del paciente**.

### Pendientes (reposiciones electrolíticas)

- **Bloqueo persistente** — Si eliminas o marcas como hecho un pendiente «Repo …», no vuelve a salir al reiniciar la app ni al sincronizar en sala LiveSync.
- **+ Pendiente** — Si la alteración ya fue bloqueada, verás un aviso en lugar de duplicar el pendiente.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.3.2

- Mac: `R+-6.3.2-arm64.dmg`, `R+-6.3.2-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.3.2-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye `build:ui` y bundle del renderer).


## [6.3.3](docs/RELEASE_NOTES_6.3.3.txt)

R+ 6.3.3 (Guía clínica desbloqueable, modales y gasometría explicada)
====================================================================

Fecha: 2026-05-27

## Resumen

Parche de uso diario: **Manejo / Guía clínica** queda oculta hasta un desbloqueo explícito con frase de confirmación; vuelven a funcionar **Esc** y **clic fuera** en modales; en **Tendencias** la gasometría extendida muestra el razonamiento del trastorno y las mini-gráficas son más ligeras; **Estado Actual** actualiza las gráficas sin rearmar el panel completo en cada cambio.

## Nuevo / mejorado

### Guía clínica (Manejo)

- **Activación consciente** — Modal «Guía clínica de orientación»: para mostrar Manejo debes escribir la frase de confirmación (insensible a mayúsculas y acentos).
- **Por defecto oculta** — Hasta desbloquear, la sección Manejo no aparece en Expediente → Clínico; **Nota** e **Indicaciones** siguen disponibles en interconsulta.
- **Ajustes → Expediente** — Al desmarcar **Ocultar Manejo en Clínico**, si aún no desbloqueaste la guía, se abre el mismo modal antes de volver a mostrar Manejo.

### Gasometría (Tendencias)

- **Razonamiento visible** — La interpretación extendida incluye un texto breve que explica el etiquetado (pH, Winter, compensación, cuadros mixtos).
- **Tooltips en badges** — En la vista extendida de gasometría, los distintivos del trastorno primario, anion gap y delta-delta muestran el detalle al pasar el cursor.

### Tendencias

- **Sparks en canvas** — Mini-gráficas por tarjeta con canvas 2D (menos peso que instanciar Chart.js en cada analito).
- **Filtro «Solo fuera de rango»** — Las tarjetas marcan alteración según la referencia del laboratorio; el filtro oculta las que no están fuera de rango y el botón alterna con **Ver todas**.

### Estado Actual (Sala)

- **Gráficas más estables** — Signos, glucometrías e I/O se actualizan de forma incremental cuando cambia el historial, sin destruir y recrear cada gráfica en cada pulsación.

## Correcciones

### Modales (toda la app)

- **Esc y clic en el fondo** — Restaurado en ayuda, laboratorio, perfil, novedades, Estado Actual (registrar medición y pegar monitoreo), desbloqueo de guía clínica y demás capas registradas.
- **Orden de capas** — La capa abierta más reciente cierra primero; modales anidados (p. ej. pegar monitoreo dentro de registro) respetan el panel correcto.
- **Arranque** — El registro de cierre se inicializa al inicio del boot para que los listeners existan aunque falle o retrase otro paso del arranque.

### Novedades (actualización)

- **Modal de release notes** — Botón **Cerrar** más visible y capa por encima del resto de overlays al mostrar novedades de versión.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.3.3

- Mac: `R+-6.3.3-arm64.dmg`, `R+-6.3.3-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.3.3-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye `build:ui` y bundle del renderer).


## [6.3.4](docs/RELEASE_NOTES_6.3.4.txt)

R+ 6.3.4 (Estado Actual multilectura, bomba de insulina y Sala en vivo)
========================================================================

Fecha: 2026-05-28

## Resumen

Parche de monitoreo en **Sala**: en **Estado Actual** puedes registrar hasta cuatro lecturas del mismo signo vital en el turno (T°, TA, FC, etc.), llevar **bomba de insulina** en el SOAP, y las gráficas de glucometría respetan la ventana del registro. Al cambiar de paciente se conserva la pestaña del expediente (p. ej. Estado Actual o Tendencias). Además, en **Sala en vivo (⇄)** vuelve a funcionar copiar la invitación al portapapeles.

## Nuevo / mejorado

### Estado Actual (Sala)

- **Multilectura por signo** — Botón **+1** en cada chip de signo vital (no solo temperatura): hasta 4 lecturas por signo en el modal y hasta 4 en el mismo día de turno; hora opcional por lectura.
- **Bomba de insulina** — Bloque opcional con glucometría, unidades y hora; varias filas; el texto SOAP incluye `BOMBA DE INSULINA (…)`.
- **Historial y snapshot** — Las lecturas extra se guardan en `vitalSeries` con compatibilidad hacia atrás (`tempPeak`, `*Extra` en registros antiguos).
- **Gráficas** — Glucometrías fuera de la ventana del turno no se mezclan en la tendencia del registro actual.

### Expediente (Sala)

- **Pestaña al cambiar paciente** — Si estabas en **Estado actual**, **Tendencias** o **Cultivos**, al seleccionar otro paciente permaneces en esa vista (ya no vuelves siempre a Pendientes).

## Correcciones

### Sala en vivo (⇄)

- **Copiar invitación para enviar** — Vuelve a copiar el enlace `…/join?code=…` (con sala activa, incluye `room=…`).
- **Copiar enlace móvil** — Vuelve a copiar la URL para iPad/Safari en la misma Wi‑Fi.
- **Activar y copiar invitación** — Tras activar el anfitrión, la invitación se copia de nuevo al portapapeles cuando el servidor responde.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.3.4

- Mac: `R+-6.3.4-arm64.dmg`, `R+-6.3.4-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.3.4-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [6.3.5](docs/RELEASE_NOTES_6.3.5.txt)

R+ 6.3.5 (Bomba con switch, Unirse a sala y ajustes de monitoreo)
====================================================================

Fecha: 2026-05-28

## Resumen

Parche de pulido: en **Estado Actual**, la **bomba de insulina** usa el mismo interruptor que las preferencias de laboratorio y sustituye las glucometrías normales al activarse; en **Sala en vivo (⇄)** el botón **Unirse** vuelve a responder al primer clic.

## Nuevo / mejorado

### Estado Actual (Sala)

- **Switch Bomba de insulina** — Mismo estilo que *Vista de laboratorio* (BH extendida, etc.). Encendido: solo filas **Glu · Unidades · Hora**; apagado: solo glucometrías normales.
- **Snapshot e historial** — Si el último registro es bomba, el snapshot y las gráficas muestran bomba y no mezclan glucometrías del mismo turno.

## Correcciones

### Estado Actual (Sala)

- **Fila bomba** — El botón × queda alineado en la misma línea que los campos (ya no cae debajo del input).
- **Modo bomba** — Ya no se muestran a la vez la fila simple (Glu + Hora) y la fila con unidades.

### Sala en vivo (⇄)

- **Unirse** — El panel ya no se reconstruye en cada mensaje del WebSocket de sincronización; los clics en **Unirse** (lista de salas y sesiones guardadas) vuelven a unirte a la sala con el toast correspondiente.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.3.5

- Mac: `R+-6.3.5-arm64.dmg`, `R+-6.3.5-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.3.5-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [6.3.6](docs/RELEASE_NOTES_6.3.6.txt)

R+ 6.3.6 (Cultivos multipaciente SOME · sala en vivo resiliente)
======================================

Fecha: 2026-05-29

## Resumen

Mejora el parseo de informes **BACTERIOLOGIA** pegados desde SOME cuando hay **varios microorganismos** en el mismo estudio (aspirado, urocultivo, líquidos, etc.): cada aislamiento aparece en la pestaña **Cultivos**, con su cuenta, antibiograma y marcas de resistencia propias. Incluye reportes **preliminares** sin antibiograma y detección de comentarios como carbapenemasa o BLEE por germen.

Además, en **Sala en vivo (LAN)**, si el anfitrión deja de responder (R+ cerrado o sin conexión al servidor), otra computadora con **R+ de escritorio** (Mac o Windows) unida como cliente puede actuar como **anfitrión suplente** hasta que vuelva el equipo original.

## Nuevo / mejorado

### Cultivos (expediente y laboratorio)

- **Una fila por microorganismo** — Todos los aislamientos con nombre reciben cabecera `SITIO dd/mm: GERMEN` (antes solo el primero entraba en la tabla **Cultivos**).
- **Antibiograma por germen** — Chips R / I / S (y ESBL, etc.) se resuelven desde el `sourceText` del informe para cada organismo, sin mezclar el ATB del vecino.
- **Marcas por aislamiento** — BLEE, ESBL, Carb-R y similares se toman del comentario y antibiograma **de ese slice**, no del informe entero.
- **Reporte preliminar** — Si el informe trae `REPORTE PRELIMINAR`, la cabecera incluye **Preliminar**; se listan identificación y **Cuenta** (p. ej. UFC/mL) aunque aún no haya antibiograma.
- **Cuenta UFC** — Formato legible conservado (`+100,000 UFC/mL`).
- **Comentarios SOME** — «SE DETECTO CARBAPENEMASA» y variantes marcan **Carb-R** en cabecera.
- **BLAC** — Interpretación en penicilina (p. ej. Staphylococcus aureus) incluida en el detalle del antibiograma.

### Manejo (ATB)

- **Alertas Carb-R / CRE** — Si la cabecera del cultivo trae esas marcas, **Manejo** puede mostrar la advertencia correspondiente al elegir antibióticos.

### Sala en vivo (LAN) — anfitrión suplente

- **Failover automático** — Si el servidor del anfitrión deja de responder (`/api/lan/v1/ping`), no basta con que alguien salga de la sala en vivo: la sesión sigue mientras el servidor LAN esté arriba.
- **Mac o Windows (Electron)** — Cualquier R+ de escritorio unida con el **enlace de invitación** puede asumir el servidor local de forma temporal, subir el bundle de la sala y avisar al equipo con `host-handoff`.
- **Reconexión entre pares** — Los demás clientes intentan primero el anfitrión original, luego URLs de pares conocidos en la sala, y cambian solos si reciben el handoff.
- **Vuelta del anfitrión** — Cuando el equipo original responde otra vez, la Mac/Windows suplente devuelve el rol, sincroniza el bundle y restaura la URL guardada.
- **Límites** — R+ solo en navegador (móvil o web) no puede ser suplente; en **Windows** puede pedirse permitir R+ en redes privadas (puerto **3738**) la primera vez que esa PC actúe como servidor.

## Regresión

- Tests golden G1–G5 en `public/js/labs-cultivo.test.mjs` (multipaciente con ATB, urocultivo carbapenemasa, preliminar sin ATB).
- Tests de elección de anfitrión suplente en `public/js/lan-surrogate-host.test.mjs`.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.3.6

- Mac: `R+-6.3.6-arm64.dmg`, `R+-6.3.6-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.3.6-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye `build:ui` y bundle del renderer).


## [6.4.0](docs/RELEASE_NOTES_6.4.0.txt)

R+ 6.4.0 (Valoración preoperatoria · formatos en expediente)
============================================================

Fecha: 2026-05-29

## Resumen

Nueva pestaña **VPO** (valoración preoperatoria) en el expediente: calculadora de riesgo alineada al Excel institucional (ASA, RCRI/Lee, Gupta MICA, ARISCAT, Caprini), plantillas editables de EKG y Rx, fármacos perioperatorios desde la receta SOME y bloques copiables para la nota externa. Persistencia por paciente; incluida en respaldos, exportación e importación.

**Mi Perfil** reorganizado: los **formatos clínicos en blanco** se editan en las pestañas **Nota** e **Indicaciones** del expediente (misma vista que al atender), con botón **Guardar** visible al final del formulario.

## Nuevo / mejorado

### Valoración preoperatoria (VPO)

- **Ubicación** — **Interconsulta:** segmento **VPO** en **Clínico** (junto Nota e Indicaciones). **Sala:** segmento **VPO** en **Salida** (junto Listado y Receta HU).
- **Calculadora** — ASA, RCRI (Lee), Gupta MICA, ARISCAT y Caprini; duración del procedimiento; AHA quirúrgico y clínico editables.
- **Procedimiento Gupta** — Catálogo con **búsqueda**; al elegir procedimiento se rellenan coeficiente Gupta, sitio ARISCAT y banderas de alto riesgo (override manual permitido).
- **Diagnósticos** — Lista editable; importar desde la nota, pegar texto o inferir factores de riesgo (RCRI, Caprini, ARISCAT, ASA) desde el listado.
- **Laboratorio y monitoreo** — Botones **Tomar del laboratorio** (creatinina, hemoglobina, eTFG) y **Tomar del monitoreo** (FC, TA, etc.) sin sobrescribir lo ya escrito.
- **EKG y Rx** — Textareas con plantilla institucional; FC sugerida desde la nota.
- **Fármacos perioperatorios** — Lista desde **Medicamentos** (SOME); sugerencias por nombre/clase; **Actualizar desde receta** solo agrega ítems nuevos (no pisa ediciones).
- **Copiar** — Bloques para valoración completa, riesgos, fármacos y diagnósticos (portapapeles; no volcado automático a Nota/Indicaciones ni Casiopea).

### Formatos clínicos (plantillas en blanco)

- **Edición en expediente** — Desde Mi Perfil, **Editar formatos de nota →** o **Editar formatos de indicaciones →** abre la pestaña correspondiente en modo plantilla.
- **Guardar** — Botón **Guardar** fijo al final del formulario; **Volver al expediente** restaura la vista del paciente activo.
- **Plantillas por defecto** — Esquemas N/V/HD/HI/NM y bloques de estudios sin datos identificables; se aplican solo en secciones vacías de pacientes nuevos.
- **Restablecer** — **Restablecer formatos en blanco** en Mi Perfil limpia las plantillas guardadas.

### Mi Perfil

- Modal reorganizado por bloques (identificación, modo de trabajo, listado de problemas, formatos).
- Migración suave de plantillas antiguas con contenido demasiado específico (demo).

## Regresión

- Tests en `public/js/vpo-calculator.test.mjs`, `vpo-data.test.mjs`, `vpo-lookups.test.mjs`, `vpo-dx-inference.test.mjs`, `vpo-periop-meds.test.mjs`, `vpo-text.test.mjs`.
- Tests en `public/js/profile-templates.test.mjs`.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.4.0

- Mac: `R+-6.4.0-arm64.dmg`, `R+-6.4.0-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.4.0-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye `build:ui` y bundle del renderer).

Publicar: `npm run release:publish` (o `--yes` / `--mac-only` según necesites).


## [6.4.1](docs/RELEASE_NOTES_6.4.1.txt)

R+ 6.4.1 (Mantenimiento · publicación y tests)
==================================================

Fecha: 2026-05-30

## Resumen

Versión de **mantenimiento** sobre **6.4.0**: mismas funciones de producto (VPO, formatos en expediente, censo PDF, etc.). Corrige la ejecución de tests en Node cuando no hay DOM y endurece el flujo `npm run release:publish` para no repetir por error un tag o release de **6.4.0**.

## Mejorado

- **Publicación** — `release:publish` comprueba antes que el tag `v6.4.1` y el release en GitHub no existan; puede commitear cambios pendientes de notas/README antes de los tests; sube assets a un release ya creado con `--allow-existing-gh`.
- **Tests** — El modal de censo PDF no se registra en entorno Node (`document` ausente), evitando fallos en la batería de tests al publicar.

## Sin cambios respecto a 6.4.0

- **VPO**, formatos en Nota/Indicaciones, censo, sala en vivo y el resto de la **6.4.0** se mantienen.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.4.1

- Mac: `R+-6.4.1-arm64.dmg`, `R+-6.4.1-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.4.1-x64.exe`.

Antes de publicar localmente: `npm run bundle:renderer` (si cambió el renderer) y luego `npm run release:publish -- --yes`.


## [6.4.2](docs/RELEASE_NOTES_6.4.2.txt)

R+ 6.4.2 (Corrección arranque · censo PDF en instalador)
============================================================

Fecha: 2026-05-30

## Resumen

Corrección de empaquetado del módulo de **censo PDF** en el instalador de escritorio y un arreglo menor de **arranque** en builds recientes. Sin pantallas nuevas respecto a **6.4.1** / **6.4.0**.

## Nuevo / mejorado

- **Censo PDF** — El export de censo vuelve a incluirse correctamente en el build de Mac/Windows.
- **Arranque** — Corrección que impedía abrir la app en algunos instaladores.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.4.2

- Mac: `R+-6.4.2-arm64.dmg`, `R+-6.4.2-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.4.2-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [6.5.0](docs/RELEASE_NOTES_6.5.0.txt)

R+ 6.5.0 (Historia Clínica · expediente Sala · documentos nativos)
================================================================

Fecha: 2026-05-31

## Resumen

Versión centrada en **ingreso en Sala**: formulario institucional de **Historia Clínica** con lectura narrativa compilada, registro de **Eventualidades**, y expediente **Clínico** reorganizado (Historia → Estado actual → Eventualidades → Manejo). Los **.docx** de Nota, Indicaciones y Listado se generan en **Node** (sin subprocess Python). La **sala en vivo** usa versiones y fusión por entidad.

## Nuevo / mejorado

### Historia Clínica (modo Sala)

- **Ubicación** — **Expediente → Clínico → Historia Clínica** (solo en **Sala**; no aparece en Interconsulta).
- **Formulario en 3 pasos** — Identificación y motivo; antecedentes (APP con catálogo, AHF por familiar, APNP con tabaquismo/alcohol/toxicomanías, bloque de género y reproducción); padecimiento actual, datos negados e **IPAS** por sistemas con opción **Negado / Ninguno**.
- **Vista Lectura** — Compila una historia coherente por secciones; **Copiar texto** al portapapeles con formato clínico.
- **Laboratorio de ingreso** — Ancla creatinina/eTFG y estudios recientes desde el historial del paciente (ventana configurable en ajustes de HC).
- **Sala en vivo** — La historia se sincroniza por paciente con el anfitrión LAN (misma sala ⇄).

### Eventualidades (modo Sala)

- **Ubicación** — **Expediente → Clínico → Eventualidades**, entre **Estado actual** y **Manejo**.
- **Registro diario** — Entradas con fecha y texto libre; orden cronológico; persistencia por paciente y en respaldos.

### Expediente Sala reorganizado

- **Cuatro pestañas** sin cambio de nombre: Paciente, Clínico, Resultados, Salida.
- **Clínico** agrupa: **Historia Clínica**, **Estado actual**, **Eventualidades** y **Manejo** (sub-barra de segmentos).
- **Estado actual** ya no es pestaña superior; vive dentro de **Clínico** (mismo panel de monitoreo que en 6.4).

### Documentos Word nativos

- **Nota**, **Indicaciones** y **Listado de problemas** se generan con motor **JavaScript** (plantillas `.docx` + JSZip).
- **Escritorio** — Guardado directo en la carpeta aprobada vía Electron; sin archivos temporales de PHI en el servidor.
- **Navegador / móvil** — Descarga del binario como antes.
- El instalador oficial **no requiere Python** para estos tres documentos.

### Sala en vivo (LAN) — concurrencia

- **Revisiones por entidad** — El anfitrión lleva `revision` y versiones por clave; desaparece el “último timestamp gana” ciego.
- **Cola de escritura** — Persistencia serializada en el anfitrión con caché en memoria.
- **Conflictos** — HTTP 409 con panel de diferencias clínicas y borrador local hasta resolver.
- **Historia Clínica en host** — PUT en cola con validación de esquema anidado.

### Onboarding (Aprender R+)

- **Tutorial reorganizado** — Recorrido lab-first con hub **Aprender R+**, pausa/reanudación por capítulos y módulo Neo opcional. Clínico en orden **Historia → Estado actual → Eventualidades**; pasos **VPO**, **Receta HU** y **Agenda** (22 pasos). Demo **Estado actual** con monitoreo de hoy (turnos enfermería) y gráficas.

## Regresión

- Tests en `lib/historia-clinica/`, `lan-squad/`, `lib/doc-generators/`, `public/js/clinical-safety*.mjs`, `public/js/expediente-tabs.test.mjs`, `public/js/tour-targets.test.mjs`.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.5.0

- Mac: `R+-6.5.0-arm64.dmg`, `R+-6.5.0-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.5.0-x64.exe`.

Tras el build local: `npm run build:ui` y `npm run build:mac` / `npm run build:win`.

Publicar: `npm run release:publish` (completa highlights en `settings-help.mjs` antes de publicar).


## [6.5.1](docs/RELEASE_NOTES_6.5.1.txt)

R+ 6.5.1 (Perfil farmacoterapéutico · almacén cifrado · sala en vivo)
=======================================================================

Fecha: 2026-05-31

## Resumen

Versión que añade el **perfil farmacoterapéutico mensual** (calendario SOME) en Medicamentos, mueve los datos clínicos de escritorio a un **almacén local cifrado (SQLCipher)** con contraseña maestra y **cadena de auditoría forense**, y refuerza la **sala en vivo** (sync del perfil, borradores de conflicto y resolución de paquetes de sala).

## Nuevo / mejorado

### Perfil farmacoterapéutico (Medicamentos)

- **Ubicación** — **Medicamentos → Perfil histórico** (junto a **Receta actual**).
- **Calendario mensual SOME** — Pega el bloque mensual del hospital; tabla unificada por medicamento y días 01–31; doble indicación (`×2`) cuando aplica.
- **Adherencia** — Días indicados vs **no administrados** (clic en celda); resumen por fila (efectivos / no pasados) y filas con fallos resaltadas.
- **Vistas** — Lista colapsada con botón **Días**; modal de mes completo en pantalla completa.
- **Receta** — Tras **Receta** con éxito, merge automático al mes de la fecha de actualización (sin pisar marcas manuales).
- **Filtros SOME** — Categorías (antibiótico, sedante, etc.) con catálogo personalizable en Ajustes (`somePharm.tokens`).
- **Persistencia** — Por paciente; incluido en respaldos ZIP, sync LAN y almacén cifrado en escritorio.

### Almacén clínico cifrado (escritorio)

- **SQLCipher** — Pacientes, notas, labs, medicamentos, Historia Clínica, estado LAN del anfitrión y demás blobs clínicos viven en `rplus-clinical.db` cifrada (no en `localStorage` plano).
- **Contraseña maestra** — Pantalla al arrancar: crear o desbloquear; opción **Recordar en este equipo** (clave envuelta con `safeStorage` del SO).
- **Migración única** — Al primer desbloqueo, importa automáticamente desde `localStorage` y el JSON del host LAN si existían.
- **Bloquear** — Menú / Ajustes: bloquea la base hasta volver a introducir la contraseña.
- **Respaldos** — Export/import JSON del almacén cifrado desde **Ajustes → Respaldos, sync y recuperación** (aviso de PHI en texto plano al exportar).

### Auditoría forense

- **Cadena SHA-256** — Eventos append-only (desbloqueo, bloqueo, migración, export/import de respaldo, etc.).
- **Verificar integridad** — En Ajustes: comprueba la cadena y avisa si un registro no encadena.

### Sala en vivo (LAN)

- **Perfil farmacoterapéutico** — Se sincroniza por paciente con el anfitrión como el resto del expediente.
- **Conflictos** — Borradores conservados al cerrar el visor; tarjeta **Borradores de conflicto** en el panel LAN; resolución más fiable de conflictos de **paquete de sala** (usar versión del servidor).

## Regresión

- Tests en `lib/db/`, `public/js/med-pharm-profile-core.test.mjs`, `public/js/med-pharm-some-catalog.test.mjs`, `public/js/features/db-unlock.test.mjs`, `public/js/lan-conflict-draft-resolution.test.mjs`.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.5.1

- Mac: `R+-6.5.1-arm64.dmg`, `R+-6.5.1-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.5.1-x64.exe`.

Tras el build local: `npm run build:ui` y `npm run build:mac` / `npm run build:win`.

**Nota desarrollo:** si al abrir en modo dev aparece error de módulo SQLCipher, ejecuta `npm run rebuild:db-native` y reinicia R+.

Publicar: `npm run release:publish` (completa highlights en `settings-help.mjs` antes de publicar).


## [6.5.3](docs/RELEASE_NOTES_6.5.3.txt)

R+ 6.5.3 (Guardia LAN Hub · Recuperación de contraseña (r+123))
=========================================================

Fecha: 2026-06-01

## Resumen

Parche que añade un **mecanismo de recuperación de contraseña maestra** mediante código de respaldo (`r+123`). En cada desbloqueo exitoso se configura automáticamente un respaldo cifrado de la llave, permitiendo recuperar el acceso si se olvida la contraseña.

## ⚠️ Aviso: Modo Guardia (prototipo)

El **Modo Guardia** incluido en esta versión es un **prototipo funcional en desarrollo** y **aún no está listo para uso clínico**. Las funcionalidades de registro de guardia, asignación de equipos y firma criptográfica están en fase experimental. No uses el Modo Guardia para decisiones clínicas reales hasta que se anuncie su disponibilidad oficial.

## Nuevo / mejorado

### Recuperación de contraseña

- **Recuperación de acceso** — Link "¿Olvidaste tu contraseña?" en la pantalla de desbloqueo. Ingresa el código `r+123` para recuperar el acceso a la base clínica.
- **Auto-configuración** — El mecanismo se configura automáticamente en el primer desbloqueo exitoso; no requiere intervención del usuario.
- **Seguridad** — La llave de recuperación se envuelve con AES-256-GCM usando una clave derivada de `r+123` con Argon2id. Se guarda en el archivo meta y en la base de datos.
- **Auditoría** — El desbloqueo por recuperación registra el evento `auth.recovery.unlock` en la cadena forense.
- **Límite de intentos** — La recuperación comparte el mismo límite de 5 intentos por 15 minutos que el desbloqueo normal.

### Guardia LAN Hub

- **Conexión guardia** — Panel rediseñado en la barra superior con estado de red (conectado/buscando), salas de guardia (Sala 1, 2, E) y secciones contextuales según el rango clínico (R1, R2, R4/Admin).
- **Auto-descubrimiento LAN** — Detección automática de hosts en la red local con prioridad por rango (Admin > R4 > R3 > R2 > R1). Si un host de mayor rango está activo, la Mac se conecta como cliente sin configuración manual.
- **Equipos clínicos** — R4/Admin puede crear equipos del mes, R1/R2 pueden unirse a equipos disponibles en su Sala. R2 obtiene auto-promoción a líder al unirse.
- **Modo Guardia (toggle)** — Activa/desactiva el tablero de guardia con un checkbox en el panel. Los pacientes se asignan automáticamente al equipo del usuario al crearlos.
- **Vista censo (R4/Admin)** — Resumen de equipos y guardias activas por Sala.
- **Finalizar rotación** — R4/Admin puede archivar todos los equipos activos y comenzar una nueva rotación mensual.
- **Enlace móvil** — Botón para copiar un enlace que, al abrirse en un iPad, pre-llena el registro clínico y conecta automáticamente a la red del hospital.
- **Entrega de pacientes (R2)** — Lista de pacientes entregados por R1s del equipo para revisión.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.5.3

- Mac: `R+-6.5.3-arm64.dmg`, `R+-6.5.3-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.5.3-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [6.5.4](docs/RELEASE_NOTES_6.5.4.txt)

R+ 6.5.4 (Identidad LAN · equipos persistentes · arranque sin contraseña)
=======================================================================

Fecha: 2026-06-02

## Resumen

Parche centrado en **identidad clínica en la red (usuario LAN)**, **equipos desacoplados de la guardia del día** y **alcance clínico V3** para R4/Admin. Además, se **elimina por ahora la contraseña maestra** al abrir la base: R+ abre el almacén clínico automáticamente en este equipo (cifrado con contraseña queda diferido hasta un release posterior).

## ⚠️ Aviso: Modo Guardia (prototipo)

El **Modo Guardia** sigue siendo un **prototipo en desarrollo** y **no está listo para uso clínico**. No lo uses para decisiones reales hasta el anuncio oficial.

## Nuevo / mejorado

### Arranque y base de datos

- **Sin contraseña maestra al iniciar** — Ya no se pide crear ni ingresar contraseña para desbloquear la base clínica. La app abre el almacén al arrancar (SQLCipher diferido en instalaciones nuevas).
- **Recuperación de instalaciones atascadas** — Si quedó un archivo de base a medias de un intento anterior con contraseña, R+ intenta abrir en modo simple o reinicia el archivo local para permitir entrar.
- **Quien ya tenía “recordar en este dispositivo”** — Sigue funcionando el desbloqueo por llavero del sistema cuando existía.

### Identidad clínica (usuario LAN)

- **Onboarding en pantalla principal** — Tras abrir la base, el asistente (usuario LAN → equipos en tu sala → unirte o crear) aparece en el **área central**, sin depender del Modo Guardia.
- **Mi rotación visible** — Acceso destacado en la **barra lateral** (debajo de Mi Perfil) y bloque prioritario en **Mi Perfil**; abre el panel de equipos o retoma la configuración pendiente.
- **Reclamar usuario** — IPC `dbClinicalUsernameClaim` y actualización de perfil sin duplicar filas en la base.
- **Validación de usuario** — Formato `3–32` caracteres en minúsculas (letras, números, `_`).
- **Enlace móvil** — Parámetros `?user=&name=&rank=&sala=` prellenan el paso 1 del onboarding.
- **R1 vs administrador de programa** — El rango clínico **R1** queda separado del rol **Admin** de programa (`is_program_admin`).

### Equipos LAN (desacoplados de “Guardia hoy”)

- **Equipos persistentes** — Crear y unirse a equipos por sala/ciclo sin declarar “Guardia hoy” en el equipo.
- **Pacientes por coincidencia estructural** — El acceso al censo del equipo usa `patientMatchesTeam`, no el calendario de guardia del día.
- **Mi rotación** — Gestión de equipos en modal; el onboarding inicial ya no vive solo dentro de Guardia.
- **Privilegios elevados** — **R4** y **Admin** ven censo global y directorio de equipos en todas las salas; R4/Admin pueden finalizar rotación y gestionar equipos del mes.

### Censo y barra lateral

- **Filtros por alcance** — La lista de pacientes respeta el alcance clínico V3 (sala, equipo, handoffs R2, macros R3).
- **Filtros censo (solo R4/Admin)** — Sala, Equipo y Servicio en la barra lateral **solo** para R4, Admin y admin de programa; **colapsables** para ganar espacio (R1–R3 no ven ese bloque).
- **Censo global en el hub LAN** — Panel de conexión guardia con vista de censo ampliada para rangos elevados.

### Administración clínica

- **Admin: todas las salas** — Navegación y equipos en todas las salas del programa.
- **Limpiar “Guardia hoy”** — Acción para resetear declaraciones de guardia del día cuando haga falta operativamente.

## Correcciones

- Ajustes de sincronización del **Modo Guardia** con el panel LAN.
- Estabilidad en formularios de equipos y entrega clínica tras el rediseño de alcance.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.5.4

- Mac: `R+-6.5.4-arm64.dmg`, `R+-6.5.4-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.5.4-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [6.5.5](docs/RELEASE_NOTES_6.5.5.txt)

R+ 6.5.5 (reparación instalación · módulos nativos)
=======================================================

Fecha: 2026-06-03

## Resumen

**Actualización de reparación** para quienes ya instalaron **6.5.4** con un empaquetado incompleto (módulos nativos argon2 / SQLCipher). Misma funcionalidad que 6.5.4; corrige el instalador y el auto-update. **No borra** pacientes ni ajustes locales.

## Para usuarios en 6.5.4 con errores

1. En R+: **Ajustes → Aplicación** → **Reinstalar actualización de reparación (6.5.5)…** (canal **Estable**).
2. O **Buscar actualizaciones…** con canal Estable.
3. Si el servidor aún no tiene 6.5.5: **Abrir instalador en GitHub…** o descarga manual del `.dmg` / `.exe` de esta release.
4. Alternativa: **Restaurar versión estable** → **6.5.0** (última 6.5.x que sigue en GitHub; las 6.5.1–6.5.4 se retiraron del servidor).

Síntomas que corrige esta build: «failed to load native binding», argon2, base clínica que no abre tras una actualización defectuosa.

## Cambios técnicos (empaquetado)

- Inclusión de binarios **argon2** (arm64 + x64 en Mac) en el instalador (`asarUnpack`, fetch pre-build).
- Verificación **verify-release-natives** antes de publicar releases.
- Catálogo **Restaurar versión estable** y mensajes de recuperación en Ajustes.

## Nuevo / mejorado (app)

- Botón **Reinstalar actualización de reparación** en Ajustes → Aplicación.
- Sección **Restaurar versión estable** y enlace a instalador en GitHub.
- Modal de ayuda si fallan módulos nativos al arrancar.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.5.5

- Mac: `R+-6.5.5-arm64.dmg`, `R+-6.5.5-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.5.5-x64.exe`.

Tras publicar: los clientes en **6.5.4** reciben **6.5.5** como actualización normal en el canal Estable.


## [6.5.6](docs/RELEASE_NOTES_6.5.6.txt)

R+ 6.5.6 (estable — Mi rotación, conflictos LAN y modal HC)
============================================================

Fecha: 2026-06-02

## Resumen

Mejora **Mi rotación** (equipos por sala, ciclos por integrante, invitación por código), la **sincronización LAN** de historia clínica (menos modales repetidos al refrescar, alineación automática cuando el texto visible coincide) y el **comparador de conflictos** (más ancho y mensajes más claros).

## Nuevo / mejorado

### Mi rotación

- **Equipos en tu sala** — El directorio «Explorar sala» usa la sala efectiva del equipo; los equipos de la misma sala deberían aparecer para unirte (sincronización LAN de equipos y membresías).
- **Ciclo por integrante** — Cada R1/R2 guarda su subciclo (R2: A–F; R1: A1–D1 o A2–D2). Bloque **Mi ciclo en este equipo** con guardado desde la tarjeta del equipo.
- **Agregar integrante** — Acepta usuario LAN con o sin `@`; el usuario debe existir en Mi rotación.
- **Invitar por código** — Código de 8 caracteres + instrucciones para la app R+ del Mac (sin enlace `localhost` ni Safari). Sección **Unirte con código de equipo** en el panel.
- **Layout del panel** — «Unirte con código» a ancho completo bajo Mis equipos | Explorar sala; formulario alineado (código, ciclo, Unirme).
- **Safari / web** — Aviso si abres un enlace de invitación en el navegador: la unión solo funciona en la app de escritorio.

### Conflictos de sincronización (historia clínica y sala)

- **Ya no reaparece el modal en cada refresco** — Tras reconectar a la sala, los conflictos en segundo plano se guardan como borrador; un aviso indica **Ajustes → LAN** para resolverlos.
- **Mismo contenido visible** — Si el resumen legible coincide en tu borrador y en la sala, R+ alinea con el host sin pedirte elegir (versión/metadatos internos).
- **Modal más usable** — Comparador más ancho; botones en dos columnas; lista de secciones en dos columnas; texto aclaratorio cuando «se ve igual» pero el registro del host no es idéntico.
- **Elegir versión del servidor** — Al aceptar la sala en historia clínica, se actualiza la copia local y se limpia el pendiente de sync.

### Otros

- **min-version.json** local — Menos 404 al comprobar versión mínima sin red.
- **WebSocket LAN** — Cierre más limpio al reconectar (menos ruido en consola).

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.5.6

- Mac: `R+-6.5.6-arm64.dmg`, `R+-6.5.6-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.5.6-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [6.5.7](docs/RELEASE_NOTES_6.5.7.txt)

R+ 6.5.7 (estable — sync LAN de equipos, usuarios y eventualidades)
====================================================================

Fecha: 2026-06-02

## Resumen

Corrige la **sincronización LAN (⇄)** de **equipos**, **directorio de usuarios LAN** y **eventualidades** entre Macs en la misma sala. Compatible con peers en **6.5.6** (importa equipos aunque el peer no exporte usuarios).

## Nuevo / mejorado

### Sync LAN clínica (equipos y usuarios)

- **Export fiable de `clinicalOps`** — Al conectar, unirse a sala o crear/editar equipos, el bundle incluye equipos, membresías y usuarios LAN registrados.
- **Orden de importación** — Usuarios → equipos → membresías (evita fallos silenciosos por claves foráneas).
- **Directorio LAN** — Los `@usuario` de otras Macs aparecen tras sincronizar; el modal se refresca al recibir datos.
- **Compatibilidad 6.5.6** — Si un peer antiguo manda equipos sin usuarios, se crean stubs temporales (`peer_…`) hasta que llegue su perfil.
- **Subciclo al asignar** — El selector respeta el ciclo guardado (p. ej. D2) en lugar de resetear a A1.

### Eventualidades

- **Fusión en bundle LAN** — Las eventualidades de ambas Macs se unen por paciente (no se pierden al mezclar salas).
- **Push LiveSync** — Guardar una eventualidad dispara sincronización ⇄ además del host REST.

### Otros

- Toast si falla la importación clínica (sesión bloqueada).
- Estado ⇄ menciona equipos en el mensaje de sincronización.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.5.7

- Mac: `R+-6.5.7-arm64.dmg`, `R+-6.5.7-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.5.7-x64.exe`.

**Recomendado:** todas las Macs del equipo en **6.5.7** con sesión clínica desbloqueada y usuario LAN en Mi rotación.

Tras el build local: `npm run build:mac` / `npm run build:win`.


## [6.5.8](docs/RELEASE_NOTES_6.5.8.txt)

R+ 6.5.8 (interno móvil QR, entrega pendientes v2 y rollback a estable)
====================================================================

Fecha: 2026-06-03

## Resumen

Añade el **board móvil de internos (MIP)** por QR de sala, **pendientes estructurados en Modo Entrega** (plantillas y estudios/procedimientos), y **restaurar una versión estable anterior** desde Ajustes sin perder datos locales. Incluye mejoras de empaquetado de nativos (Argon2/SQLCipher) para releases.

## Nuevo / mejorado

### Interno móvil (guardia por QR)

- **Micro-app** en `/interno/sala-{slug}` — Censo de pacientes entregados al R1 de guardia; registro de **signos vitales** y **glucometrías** sin cuenta clínica.
- **QR por sala** — Admin/R4 activan, regeneran e imprimen el código desde el hub de guardia; token secreto por sala.
- **Descubrimiento LAN** — El móvil localiza el host activo (no IP fija en el QR).
- **Sync en vivo** — Polling + WebSocket; mediciones en **Estado actual** y alertas en **Modo Guardia** del residente.

### Modo Entrega — pendientes v2

- **Plantillas** de procedimiento/estudio (por usuario y por equipo/sala) en base clínica (schema v8).
- **Pendientes estructurados** en entrega: hora, requisitos, badges; signos críticos/frecuencia siguen en `active_guardias` (banner en interno).
- **R1 guardia** — Bloquea borrado del diurno; puede actualizar flags y agregar procedimientos.
- **Interno** — Lista de estudios con detalle; marcar **realizado**; chips de pendientes en el board.

### Restaurar versión estable

- **Ajustes → Aplicación y actualizaciones** — Selector de versión estable anterior (`stable-versions.json` curado).
- **In-app** con fallback a GitHub si falla la descarga (arm64/x64/Windows).
- **`min-version.json`** — Sigue forzando mínimo hacia arriba; el downgrade no borra `userData` ni la base clínica.

### Publicación y nativos

- Scripts **`ensure-argon2-pack-natives`** y **`verify-release-natives`** antes del empaquetado.
- Catálogo **`stable-versions.json`** actualizado para downgrade y releases.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.5.8

- Mac: `R+-6.5.8-arm64.dmg`, `R+-6.5.8-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.5.8-x64.exe`.

**Recomendado:** Mac anfitrión de guardia en **6.5.8** con LAN activa; internos escanean el QR de su sala en la misma red Wi‑Fi.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye `build:ui` y bundle de producción).


## [6.5.9](docs/RELEASE_NOTES_6.5.9.txt)

R+ 6.5.9 (LAN, entrega y directorio — paridad Mac/Windows)
============================================================

Fecha: 2026-06-03

## Resumen

Correcciones de **sala en vivo (⇄)**, **directorio LAN**, **Modo Entrega (pendientes/plantillas)** y **gestión de equipos**, con la misma lógica en **Mac y Windows**. La fusión de perfiles `@usuario` ya no pierde usuarios al sincronizar con otra versión o tras «rotación nueva» en un peer.

## Nuevo / mejorado

### Sync LAN y directorio (Mac + Windows)

- **Directorio LAN** — Lista usuarios de **todas las salas** (no solo la sala activa); deja de quedarse en «Cargando directorio…» si el sync-bundle tarda o falla (timeout 5 s, carga desde base local primero).
- **Permiso de directorio** — Corregido error `canViewLanUserDirectory is not defined` al abrir el directorio.
- **Fusión de usuarios** — Al mezclar snapshots LAN, se **unen** `clinical_users` local + remoto; una Mac/Windows en 6.5.6–6.5.8 ya no borra handles al recibir rotación nueva sin lista de usuarios.
- **@usuario obliga sync** — Si ya tienes LAN configurada, no puedes registrar @usuario sin sala ⇄ activa o membresía por invitación; al guardar, R+ **publica de inmediato** tu perfil al host (no solo en esta Mac). Enlaces `?host=&code=&room=` se aplican antes del registro.

### Modo Entrega

- **Plantillas** — IPC `db:entrega-template-list` devuelve el formato que espera la UI; se pueden **añadir procedimientos** y refrescar catálogo.
- **Modal** — Delegación de clics en el panel de pendientes (botones + / Añadir).

### Mi rotación

- **Eliminar / editar equipo** — Los botones del modal vuelven a responder (delegación en el cuerpo del modal, no bloqueada por `stopPropagation` del backdrop).

### Windows (instalador y sala)

- Misma build de renderer y merge LAN que en Mac; **recomendado** que todas las estaciones de guardia (Mac anfitrión y PCs Windows unidas por invitación) estén en **6.5.9**.
- Primera vez en sala: permitir R+ en el **firewall** (puerto **3738**) si Windows pregunta.
- Empaquetado: `prebuild:win` incluye Argon2 win32; `verify-release-natives` en el pipeline de publish.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.5.9

- Mac: `R+-6.5.9-arm64.dmg`, `R+-6.5.9-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.5.9-x64.exe`.

**Recomendado:** Actualizar **todas** las Macs y PCs Windows del turno a **6.5.9**, activar sala ⇄ **antes** de registrar @usuario, y confirmar el mensaje «publicado en la sala ⇄» al guardar perfil.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye `build:ui` y bundle de producción).


## [6.6.0](docs/RELEASE_NOTES_6.6.0.txt)

R+ 6.6.0 (LAN sin bloqueo @usuario, iPad y labs)
====================================================

Fecha: 2026-06-03

## Resumen

Consolida **6.5.9** y correcciones LAN/cloud: **@usuario se registra sin sala ⇄** (útil sin internet); directorio y sync de perfiles mejorados; enlace iPad con ticket nuevo; copiar varios días en historial de labs; admin puede eliminar usuarios del directorio LAN.

## Nuevo / mejorado

### @usuario y sala ⇄

- **Registro sin ⇄ obligatorio** — Puedes guardar @usuario y perfil aunque no haya red o sala en vivo; R+ intenta publicar al turno cuando ⇄ esté disponible (sin error bloqueante por `NO_ROOM`).
- **Panel ⇄ antes del registro** — Durante «Configura tu rotación» puedes unirte a la sala opcionalmente; la sala del formulario se mapea a `sala-1` / `sala-2` / `sala-e` cuando hay LAN.
- **Activar red / crear sala** — Tras activar anfitrión o crear sala, conexión automática cuando hay sala en perfil; al crear sala queda **conectada**.

### Sync LAN y directorio (heredado y reforzado de 6.5.9 + cloud)

- **Directorio LAN** — Todas las salas; carga local; push de perfiles con snapshot clínico fresco; refresco al abrir directorio.
- **Fusión `clinical_users`** — Unión local + remoto; no se pierden handles con rotación nueva ni peers viejos.
- **Eliminar usuario (admin)** — Tombstones ⇄ para que el merge LAN no reviva usuarios borrados del directorio.

### iPad y labs

- **Enlace iPad** — Ticket nuevo al copiar invitación (`forceNew`); menos enlaces de un solo uso agotados.
- **Historial de labs** — Copiar varios días desde el menú del historial (selección explícita de fechas).

### Modo Entrega y equipos (6.5.9)

- Plantillas entrega, modal pendientes, eliminar/editar equipo en Mi rotación.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.6.0

- Mac: `R+-6.6.0-arm64.dmg`, `R+-6.6.0-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.6.0-x64.exe`.

**Recomendado:** Actualizar **todas** las estaciones del turno a **6.6.0**. Con red, abre ⇄ y únete a tu sala para que el directorio LAN muestre a todos; sin red puedes registrar @usuario y sincronizar después.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye `build:ui` y bundle de producción).


## [6.6.1](docs/RELEASE_NOTES_6.6.1.txt)

R+ 6.6.1 (LiveSync LAN — fiabilidad y mantenimiento)
=====================================================

Fecha: 2026-06-03

## Resumen

Integra el programa **LAN sync improvements (Phases 0–3)**: menos reconexiones WS al publicar @usuario, push HTTP como vía principal del censo, cola offline en SQLCipher, endpoint `clinical-ops`, panel de diagnóstico ⇄, anfitrión fijado, y código LAN modularizado. **Requiere turno homogéneo en 6.6.1** (no mezclar con 6.6.0 en la misma guardia).

Análisis de riesgos LiveSync: `docs/LAN_SYNC_6.6.1_RISK_ANALYSIS.md`.

## Nuevo / mejorado

### Fiabilidad LiveSync (Phases 0–1)

- **Push de perfil** — No reabre el WebSocket en vivo si ya estás en la sala; resultado con canales `http` / `live` / `outbox`.
- **Censo y bundles** — El debounce (~900 ms) publica por **HTTP**; los peers reciben aviso `livesync:revision` y reconcilian (menos bundles duplicados por WS).
- **Cola offline** — Tabla `lan_sync_outbox` (schema DB v9) cuando la base clínica está desbloqueada.
- **`PUT /clinical-ops`** — Directorio y @usuario sin subir el bundle completo del turno.

### Operación en guardia (Phase 2)

- **Anfitrión fijado** — Evita cambio silencioso de Mac anfitriona; failover con confirmación.
- **Estado de sincronización** — Panel en ⇄ con host, fase, outbox, últimos errores e informe para soporte.
- **Auto-unión a sala** — Si solo se infiere la sala desde Ajustes, pide confirmación antes de unirte.

### Mantenimiento (Phase 3)

- **Módulos LAN** — `lan-sync-push`, `room`, `transport`, `panel` + fachada `features/lan-sync.mjs`.
- **Registro de merges** — `lan-merge-registry.mjs` centraliza fusiones por dominio.
- **Host y SQLCipher** — `clinicalOps` autoritativo en DB del anfitrión cuando está desbloqueada.

### Heredado de 6.6.0

@usuario sin ⇄ obligatorio, ticket iPad nuevo, copiar varios días en labs, directorio LAN y tombstones admin.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.6.1

- Mac: `R+-6.6.1-arm64.dmg`, `R+-6.6.1-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.6.1-x64.exe`.

**Recomendado:** Actualizar **todas** las estaciones del turno a **6.6.1 el mismo día**. No mezclar 6.6.0 y 6.6.1 en guardia (el censo puede no verse en Macs viejas). Firewall **3738** en Windows la primera vez.

Tras el build local: `npm run build:mac` / `npm run build:win`.


## [6.6.2](docs/RELEASE_NOTES_6.6.2.txt)

R+ 6.6.2 (LAN ward-ready — correcciones ⇄ y host)
=====================================================

Fecha: 2026-06-03

## Resumen

Parche sobre **6.6.1** para guardia: desacopla **clinical-ops** del bundle del turno, endurece la cola offline, corrige imports rotos tras modularizar ⇄, y el **anfitrión** devuelve historia clínica desde el censo del bundle cuando aún no hay entidad `hc:` dedicada. **Actualiza todas las estaciones del turno a 6.6.2** (no mezclar con 6.6.0/6.6.1 en la misma guardia).

## Nuevo / mejorado

### Ward-ready LAN (sobre 6.6.1)

- **Clinical-ops** — `pushClinicalOpsLanNow` ya no cae al bundle completo; cola `clinical_ops` con drenado secuencial y **abort** al primer fallo; toasts **QUEUED** cuando queda en outbox.
- **Reconciliación** — Pull de ops del host en try/catch; broadcast `livesync:revision` en cada PUT de bundle al anfitrión.
- **Conflictos** — Panel «Borradores de conflicto» en ⇄; pausa de bundle mientras hay borradores.
- **Equipos** — Publicación LAN al guardar Mi rotación / dejar equipo; tests de cableado (`lan-sync-wiring.test.mjs`).

### Correcciones de runtime (⇄ / merge)

- Imports restaurados: `refreshClinicalSessionTeams`, `syncLiveSyncStatusChrome`, `resolveLanHostUrlAuto`, versionado de eventualidades (`liveSyncEntityStoreKey`).
- **Host** — `GET …/historia-clinica` lee HC embebida en `bundle.entries` si no existe entidad `hc:` (evita 404 en consola al abrir expediente).

### Heredado de 6.6.1

LiveSync HTTP-primary, outbox SQL v9, `clinical-ops`, diagnóstico ⇄, anfitrión fijado, modularización LAN.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.6.2

- Mac: `R+-6.6.2-arm64.dmg`, `R+-6.6.2-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.6.2-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [6.6.3](docs/RELEASE_NOTES_6.6.3.txt)

R+ 6.6.3 (cold-start — arranque, chunks, Chart y Windows)
============================================================

Fecha: 2026-06-03

## Resumen

Parche de **arranque en frío** (chunks esbuild, carga diferida de Ajustes/plataforma), **gráficas Chart** estables vía UMD, y corrección en **Windows** del flujo «Configura tu rotación» cuando la base ya estaba abierta. Incluye la línea LAN **ward-ready** de **6.6.2**.

## Nuevo / mejorado

### Arranque y renderer

- **Cold-start** — Menos JavaScript en el bundle inicial; módulos pesados en chunks con `import()` (Ajustes, plataforma, LAN, equipos, etc.).
- **Chart.js** — Tendencias y gráficas del expediente usan **Chart UMD** en `index.html` (sin depender de chunks ESM frágiles).

### Windows

- **Configura tu rotación** — Ya no queda atascado en «Desbloquea la base de datos…» si SQLCipher abrió pero la sesión clínica no había arrancado (carrera al boot).
- **Mensajes claros** — Distingue base bloqueada, instalación sin SQLCipher y «base abierta pero sesión falló».
- **Nativos** — `db:status` expone `sqlcipherReady` / `argon2Ready`; el unlock no se bloquea solo por fallo de argon2.

### LAN (hereda 6.6.2)

- **Clinical-ops** — Push y cola separados del bundle del turno.
- **Host** — Historia clínica desde censo del bundle cuando no hay `hc:` dedicado.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.6.3

- Mac: `R+-6.6.3-arm64.dmg`, `R+-6.6.3-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.6.3-x64.exe`.

**Recomendado:** Todas las estaciones del turno en **6.6.3** el mismo día. Firewall **3738** en Windows la primera vez en sala ⇄.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [6.6.4](docs/RELEASE_NOTES_6.6.4.txt)

R+ 6.6.4 (LAN — iPad links y sync en chunks)
================================================

Fecha: 2026-06-04

## Resumen

Parche sobre **6.6.3**: enlaces móviles `/join/req_…` para iPad e invitación de sala, con parámetros opcionales de perfil en la URL; continúa la línea cold-start con chunks de esbuild.

## Nuevo / mejorado

- **⇄** — Enlace `/join/req_…` para iPad y invitación; parámetros opcionales de perfil en la URL.
- **Renderer** — Chunks de esbuild; carga diferida de módulos pesados (continúa línea 6.6.3 cold-start).

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.6.4

- Mac: `R+-6.6.4-arm64.dmg`, `R+-6.6.4-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.6.4-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [6.6.5](docs/RELEASE_NOTES_6.6.5.txt)

R+ 6.6.5 (LAN — un solo anfitrión por turno)
================================================

Fecha: 2026-06-04

## Resumen

Una guardia en la misma Wi‑Fi converge en **un solo servidor R+** por turno: elección por rango clínico (R4/admin), desempate con marca de tiempo y, si hace falta, **combinación** de datos y clientes hacia el anfitrión ganador. El plug and play sigue: R1–R3 se unen solos al R4; el **enlace de invitación** queda para iPad, Windows o cuando el barrido no detecta al anfitrión.

## Nuevo / mejorado

- **Elección de anfitrión** — Meta clínica en disco (`startedAt`); `GET /host-rank` expone rango y antigüedad; desempate determinista (sin dos servidores eligiendo distinto ganador).
- **Consolidación** — Si un R4/admin debe ceder: primero sube el bundle al ganador (LWW), luego `livesync:host-handoff` redirige clientes; si el push falla, esta Mac **sigue** como servidor (sin pérdida de datos).
- **Descubrimiento** — Barrido de subred cada 25 s además de peers WS cada 5 s; detecta split-brain formado después de unirse a la sala equivocada.
- **Plug and play** — R1–R3: auto-cliente al anfitrión de mayor rango sin pegar enlace; R4: confirmación antes de combinar con otro servidor activo.
- **⇄ invitación (UX)** — Bloque **Invitación al turno** con **Copiar enlace de invitación** y **Generar enlace / PIN**; en escritorio, sección **Unirme con enlace** para pegar `http://…/join/req_…` (misma URL sirve para otra Mac o iPad).
- **Anfitrión fijado** — Sigue respetando «Fijar anfitrión del turno»; no cede automáticamente si está fijado.

## Operación en guardia

1. Instala **6.6.5 en todas** las Macs y PCs del turno el **mismo día**.
2. **Una** Mac R4/admin: ⇄ → **Unirse** en su sala → **Copiar enlace de invitación** solo para quien no se detecte solo o para iPad.
3. Resto del equipo: dejar que R+ se conecte sola; si no, pegar enlace en ⇄ o abrirlo en el navegador.
4. Windows: permitir R+ en el firewall (puerto **3738**) la primera vez en sala ⇄.

No mezclar **6.6.4** o anterior en la misma guardia si ya hay sala en vivo activa.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.6.5

- Mac: `R+-6.6.5-arm64.dmg`, `R+-6.6.5-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.6.5-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [6.6.6](docs/RELEASE_NOTES_6.6.6.txt)

R+ 6.6.6 (LAN — perfil @usuario y escalada de anfitrión)
============================================================

Fecha: 2026-06-04

## Resumen

Tras actualizar, **cada Mac/PC debe volver a registrar el perfil** distinguiendo **@usuario LAN** y **nombre en guardia**. En ⇄, solo **R4/admin** (o rangos menores tras escalada) pueden ser anfitrión; sin R4 en la red, R3 → R2 → R1 pueden asumir el servidor en ventanas de **10 minutos** cada una. Incluye la línea **6.6.5** (un anfitrión por turno, consolidación y plug and play).

## Nuevo / mejorado

- **Puerta de perfil 6.6.6** — Al abrir R+, si no completaste la puerta, se limpian prefills viejos y debes confirmar **@usuario** (identificador único, p. ej. `drmendoza`) y **nombre en guardia** (p. ej. `Dr. Mendoza` o `R1 García`) por separado.
- **Rango antes de ⇄** — Sin rango clínico configurado (y puerta cumplida), esta Mac **no** entra en elección ni descubrimiento de anfitrión; evita servidores «fantasma» con perfil incompleto.
- **Solo R4/admin de inicio** — Con rango configurado, **R1–R3 no abren servidor** mientras haya R4 o admin de programa en la red; se unen como clientes (hereda y endurece **6.6.5**).
- **Escalada sin R4** — Si nadie R4/admin responde en la LAN: tras **10 min** puede anfitrionar **R3**, otros **10 min** → **R2**, otros **10 min** → **R1**; al detectar R4/admin el temporizador **se reinicia**.
- **Panel ⇄** — Cuenta regresiva de escalada; diagnóstico ⇄ se actualiza sin cerrar `<details>`; «Fijar anfitrión» solo si esta Mac puede ser servidor.

## Operación en guardia

1. Instala **6.6.6 en todas** las Macs y PCs del turno el **mismo día**.
2. En cada equipo: completa **Configura tu rotación** / registro con **@usuario** y **nombre en guardia** (no intercambiar campos).
3. **R4/admin**: ⇄ → unirse a la sala; el resto suele conectarse solo. Si no hay R4 en la red, revisa el mensaje de escalada en ⇄ antes de que un R3/R2/R1 asuma anfitrión.
4. Windows: firewall puerto **3738** la primera vez en sala ⇄.

No mezclar **6.6.5** o anterior en la misma guardia con sala en vivo activa.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.6.6

- Mac: `R+-6.6.6-arm64.dmg`, `R+-6.6.6-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.6.6-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [6.6.7](docs/RELEASE_NOTES_6.6.7.txt)

R+ 6.6.7 (LAN — iPad/móvil, onboarding local y censo)
====================================================

Fecha: 2026-06-04

## Resumen

Mejora la **guardia con iPad/Safari**: enlaces móviles permanentes, invitación separada (móvil vs otra Mac/sala), auto-unión a la sala y sincronización silenciosa del compartidor. El **arranque clínico** elige antes **sala LAN o solo equipo** y desbloquea la base sin depender de ⇄. El **censo PDF/HTML** alinea columnas (incluye signos e I/O) y formatea labs/cultivos de forma más legible. Incluye la línea **6.6.6** (perfil @usuario, escalada de anfitrión y un servidor por turno).

## Nuevo / mejorado

- **⇄ — iPad / R+ Móvil** — Enlace **permanente** `/mobile/?token=…` para favoritos en Safari (Añadir a pantalla de inicio); distinto del ticket de sala `/join/req_…` para otra Mac. El anfitrión debe **Unirse** a la sala antes de copiar invitación móvil.
- **⇄ — Dos invitaciones** — **Copiar enlace móvil** (tu turno en iPad) vs **Copiar enlace de sala** (otra estación con su @usuario). Parámetros del compartidor para que el iPad refleje identidad sin bloquear taps.
- **Móvil en LAN** — Intercambio de auth usa el **Host** de la petición; el iPad puede **auto-unirse** y reanudar sync; aviso si el bundle tarda (>20 s) o el anfitrión no tiene pacientes.
- **Onboarding local** — Tras instalar, eliges **sala LAN** o **solo mi equipo** antes de desbloquear SQLCipher; reintentos y mensajes claros en Windows si la sesión falla (sin exigir ⇄).
- **PWA móvil** — Vista `/mobile/` reducida para guardia en Safari (sin censo PDF, Mi Perfil, Ajustes ni pestaña Salida).
- **⇄ más fluido en sala** — API LAN exenta de rate-limit; ping 500 ms; descubrimiento con concurrencia **6**; **Mi rotación** no bloquea el barrido ⇄ (fail-open ≤3,5 s).
- **Censo** — Mismas columnas en PDF y vista previa (**Signos**, **I / E / B**, labs con paneles en líneas separadas); encabezado sala/torre unificado.

## Operación en guardia

1. Instala **6.6.7 en todas** las Macs, PCs e iPads del turno el **mismo día**.
2. **R4/admin**: ⇄ → **Unirse** → luego **Copiar enlace móvil** o **Copiar enlace de sala** según el dispositivo.
3. **iPad**: abre el enlace en **Safari**, carga la app, luego **Añadir a pantalla de inicio** (no uses solo un acceso directo viejo sin token).
4. Windows: firewall puerto **3738** la primera vez en sala ⇄.

No mezclar **6.6.6** o anterior en la misma guardia con sala en vivo activa.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.6.7

- Mac: `R+-6.6.7-arm64.dmg`, `R+-6.6.7-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.6.7-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [6.6.8](docs/RELEASE_NOTES_6.6.8.txt)

R+ 6.6.8 (LiveSync — icono Wi‑Fi y estados de conexión)
===========================================================

Fecha: 2026-06-05

## Resumen

Reemplaza el botón **⇄** del header por un **icono Wi‑Fi** del mismo tamaño que Perfil y Ajustes. Las barras y el color del botón reflejan el **estado LiveSync** (en vivo, sincronizando, reconectando, solo local). Incluye la línea **6.6.7** (iPad/móvil, onboarding local y censo).

## Nuevo / mejorado

- **LiveSync en el header** — Botón cuadrado con icono **Wi‑Fi** (sin texto); abre el mismo panel de conexión LAN. El detalle del estado va en el tooltip y en lectores de pantalla.
- **Estados visuales** — **Verde** = sync en vivo (3 barras); **ámbar** = conectando/sincronizando (cascada); **naranja** = reconectando (2 barras); **acento** = en sala sin sync en vivo; **gris** = sin sala.
- **Directorio LAN (admin)** — Tras registrar @usuario y **Unirse** en la misma sala ⇄, los residentes aparecen en **Directorio LAN** para asignar equipo (no al revés). El host acumula perfiles; el directorio hace pull al abrir y se actualiza en vivo.
- **Tokens de diseño** — Colores semánticos `--color-livesync-*` en `tokens.css` (claro, oscuro y alto contraste).
- **Accesibilidad** — Respeta `prefers-reduced-motion` (sin animación de barras si el sistema lo pide).

## Operación en guardia

1. Instala **6.6.8 en todas** las Macs, PCs e iPads del turno el **mismo día**.
2. El icono Wi‑Fi **verde** confirma sync en vivo; si queda **ámbar/naranja**, abre el panel (mismo botón) para revisar sala o red.
3. **R4/Admin**: cada residente — tu LAN, **⇄ Unirse** en la sala, **Guardar perfil** con @usuario; luego asignas desde **Directorio LAN** (Mi rotación).
4. Sigue valiendo **6.6.7**: enlaces móviles, onboarding local y censo alineado.

No mezclar **6.6.6** o anterior en la misma guardia con sala en vivo activa.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.6.8

- Mac: `R+-6.6.8-arm64.dmg`, `R+-6.6.8-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.6.8-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [6.6.9](docs/RELEASE_NOTES_6.6.9.txt)

R+ 6.6.9 (Windows — arranque SQLCipher)
===========================================================

Fecha: 2026-06-05

## Resumen

Corrige el error **«R+ no pudo iniciar»** / *not a valid Win32 application* en **better_sqlite3.node** en instaladores Windows **6.6.7** y **6.6.8** empaquetados desde macOS. Incluye la línea **6.6.8** (LiveSync Wi‑Fi, directorio LAN).

## Nuevo / mejorado

- **Windows SQLCipher** — `prebuild:win` descarga el prebuild **win32-x64** de SQLCipher para la ABI de Electron actual (`scripts/fetch-sqlite-win.mjs`). El `.exe` ya no incluye el binario Mach-O de macOS.
- **Verificación** — Test de empaquetado confirma cabecera PE (`MZ`) antes de publicar el instalador Windows.

## Operación en guardia

1. **PC Windows con error al abrir:** desinstala R+ 6.6.7/6.6.8 e instala **6.6.9** desde Releases.
2. Mac e iPad pueden seguir en **6.6.8** o actualizar a **6.6.9** (misma guardia LAN).
3. No mezclar **6.6.6** o anterior en la misma guardia con sala en vivo activa.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.6.9

- Mac: `R+-6.6.9-arm64.dmg`, `R+-6.6.9-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.6.9-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [6.7.0](docs/RELEASE_NOTES_6.7.0.txt)

R+ 6.7.0 (LAN — directorio visible y PIN del turno)
=======================================================

Fecha: 2026-06-05

## Resumen

Corrige el directorio LAN que en **6.6.8–6.6.9** solo mostraba al anfitrión: el host ya no borra el roster al recibir un sync-bundle vacío, los clientes ven un aviso honesto si aún no están conectados, y el **PIN del turno** (6 dígitos, ~12 h) permite unirse a la guardia sin pegar el enlace de invitación.

## Nuevo / mejorado

- **Directorio LAN** — El anfitrión conserva el roster acumulado aunque llegue `clinicalOps: null` en un push de bundle (base bloqueada o host solo-LAN). Fusión por unión de snapshots en `bundle-merge` y `host-store`.
- **Diagnóstico ⇄** — Cada intento de push clinical-ops deja traza con `code` (`NO_LAN`, `NO_ROOM`, `NO_SNAPSHOT`, etc.) en el JSON de diagnósticos.
- **Conexión honesta** — Si eliges guardia en red pero aún no hay host/sala, ya no aparece «Perfil guardado» como éxito falso: CTA para abrir LiveSync y conectar.
- **PIN del turno** — El anfitrión muestra un PIN de 6 dígitos reutilizable (~12 h); los residentes lo ingresan al registrarse y R+ escanea la subred (beacon) para unirse sin copiar enlace.
- **Directorio en guardia** — Los desplegables de asignación de equipo ya no se cierran al refrescar el roster LAN.

## Operación en guardia

1. **Anfitrión (R4+):** abre LiveSync, **Unirse** a la sala, comparte el **PIN del turno** o el enlace de invitación.
2. **Residentes:** registran **@usuario**; si usan PIN, lo pegan en el campo de registro LAN o conectan desde el panel ⇄.
3. **Actualiza todas las estaciones** a **6.7.0** el mismo día. Mezclar **6.6.6** o anterior con sala en vivo activa no es recomendable.
4. Windows: permite R+ en el firewall (puerto **3738**) la primera vez en sala LiveSync.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v6.7.0

- Mac: `R+-6.7.0-arm64.dmg`, `R+-6.7.0-x64.dmg` (y zip para auto-update).
- Windows: `R+-6.7.0-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [7.0.1](docs/RELEASE_NOTES_7.0.1.txt)

R+ 7.0.1 (PIN del turno y Wi‑Fi hospital)
=============================================

Fecha: 2026-06-05

## Resumen

Conectarse al turno en guardia es más simple: el **PIN de 6 dígitos** es la llave principal (sin copiar enlaces ni recordar IPs). R+ busca el anfitrión en **todas las redes Wi‑Fi** de la Mac, reconecta solo al cambiar de red y muestra **Conectar al turno** cuando la sala no está en vivo.

## Nuevo / mejorado

- **PIN primero** — En ⇄: un campo y **Conectar**; el anfitrión comparte 6 dígitos en voz alta. Mismo PIN al registrar @usuario.
- **Wi‑Fi hospital** — Barrido en cada subred local (varias VLAN/NIC); al volver el Wi‑Fi o quedar en «reconectando…», R+ reintenta con el PIN guardado.
- **Conectar al turno** — Botón en la barra clínica: intenta el PIN automático; si falla, abre ⇄ con el cursor en el PIN.
- **Menos fricción** — Enlaces de invitación quedan en opción avanzada; mensajes en lenguaje claro («Buscando anfitrión del turno…»).
- **Incluye 6.7.0** — Directorio LAN, roster sin borrado en bundle vacío, diagnóstico ⇄ y Windows SQLCipher empaquetado.

## Operación en guardia

1. **Anfitrión (R4+):** ⇄ → copia o dice el **PIN del turno**; **Unirse** a la sala.
2. **Residentes:** **Conectar al turno** o PIN en registro / ⇄ (6 dígitos).
3. **Misma red clínica** que el anfitrión (Wi‑Fi invitado o VLAN aislada no alcanza al host).
4. Instala **7.0.1 en todas** las estaciones el mismo día. Puerto **3738** en firewall Windows la primera vez.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v7.0.1

- Mac: `R+-7.0.1-arm64.dmg`, `R+-7.0.1-x64.dmg` (y zip para auto-update).
- Windows: `R+-7.0.1-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [7.0.2](docs/RELEASE_NOTES_7.0.2.txt)

R+ 7.0.2 (perfil Windows y recuperar @usuario)
================================================

Fecha: 2026-06-05

## Resumen

Corrige un fallo que impedía **guardar el perfil clínico** en Windows (y al **recuperar @usuario**): errores de JavaScript en consola (`Cannot access before initialization`) al pulsar Continuar en el registro.

## Nuevo / mejorado

- **Guardar perfil** — El wizard de onboarding ya no falla al guardar nombre, rango y sala (incluye el paso opcional del PIN del turno).
- **Recuperar @usuario** — «Recuperar mi usuario» y el flujo automático al reclamar un handle ocupado vuelven a funcionar.
- **Incluye 7.0.1** — PIN del turno, reconexión Wi‑Fi hospital, directorio LAN y empaquetado Windows SQLCipher.

## Operación en guardia

Actualiza desde **7.0.1** (o anterior) en todas las estaciones. No cambia el PIN ni la sala; solo corrige el guardado de perfil.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v7.0.2

- Mac: `R+-7.0.2-arm64.dmg`, `R+-7.0.2-x64.dmg` (y zip para auto-update).
- Windows: `R+-7.0.2-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [7.0.3](docs/RELEASE_NOTES_7.0.3.txt)

R+ 7.0.3 (estable — LAN antes de delta sync)
================================================

Fecha: 2026-06-05

## Resumen

Release de estabilización antes del overhaul de delta sync: reduce el ruido visual del censo al sincronizar por LAN, limita el intercambio de pacientes al alcance clínico del equipo y deja herramientas de prueba para validar directorio/roster sin tocar una guardia real.

## Nuevo / mejorado

- **Censo sin parpadeo** — La lista lateral de pacientes se actualiza de forma incremental cuando llegan cambios por LAN; evita redibujar la lista completa si solo cambió una tarjeta, un conteo o un paciente nuevo.
- **Pacientes por equipo** — El sync LAN y la lista lateral respetan alcance clínico: R4/Admin ven el censo completo (con filtro Equipo opcional); R2/R3 se acotan a sus equipos; **R1 en equipo** solo ve pacientes de su equipo (la sala completa vuelve en fase entrega o modo guardia).
- **Asignar equipo desde el paciente** — En Datos del paciente aparece selector de equipo para usuarios con permisos/equipos disponibles; al cambiarlo se refresca contexto clínico y se empuja clinical-ops por LAN.
- **PIN del turno más estable** — El PIN se conserva durante el mes calendario, sobrevive reinicios del host y el PIN anterior queda en gracia cuando se regenera manualmente.
- **Validación LAN local** — Nuevo harness de peer virtual para probar directorio, push y churn de roster contra un host efímero antes de publicar cambios más grandes de sync.

## Correcciones (republish 7.0.3)

- **Alcance R1** — Quita el censo compartido de sala para R1 con equipo: la barra lateral y el sync LAN ya no muestran pacientes de otros equipos en la misma sala (solo en fase entrega o modo guardia).
- **Arranque / ⇄** — Corrige import circular que dejaba la app sin pacientes ni botones (`clinicalSessionContext` indefinido al iniciar LAN).
- **Filtro Equipo (R4/Admin)** — Por defecto tu equipo activo; «Todos los equipos» limpia el filtro y se recuerda.

## Operación en guardia

Actualiza desde **7.0.2** en todas las estaciones antes de empezar turno. El PIN y la sala siguen siendo compatibles, pero conviene homogeneizar en **7.0.3** para que el filtro por equipo y la lista incremental se comporten igual en todas las Macs/PCs.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v7.0.3

- Mac: `R+-7.0.3-arm64.dmg`, `R+-7.0.3-x64.dmg` (y zip para auto-update).
- Windows: `R+-7.0.3-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [7.1.0](docs/RELEASE_NOTES_7.1.0.txt)

R+ 7.1.0 (guardia workbench + LAN delta sync)
=================================================

Fecha: 2026-06-06

## Resumen

Reorganiza la vista Guardia para dejar más espacio al censo y signos vitales, mejora el flujo entrega → turno activo, y añade sincronización LAN por deltas (historia clínica y outbox) además del bundle completo.

## Nuevo / mejorado

- **Guardia más compacta** — Resumen del turno en una sola barra (`7 censo · 4 críticos…`) en lugar de cuatro tarjetas grandes; se eliminan botones duplicados (Mi rotación, Configuración rotación, Entrega) de la vista Guardia.
- **Flujo entrega / turno** — La barra de fases concentra **Iniciar entrega** e **Iniciar turno sin entrega** (antes «Saltar a turno activo»); panel lateral de entrega a pantalla completa y modal de entrega más ancho (soporte + signos lado a lado).
- **Turno activo** — Feed de signos vitales del turno, reloj de turno, cuenta regresiva de signos en las tarjetas del censo y estado crítico basado en toggle explícito + signos + vaso/vent.
- **Configuración rotación (R4/Admin)** — Calendario del ciclo vive en **Mi rotación → Zona avanzada** (ya no en la barra de Guardia).
- **LAN delta sync** — Emisión y aplicación de deltas de historia clínica por WebSocket; outbox SQL/local con ítems `delta`; menos tráfico que reenviar el bundle entero en cada cambio.

## Correcciones

- **Entrega** — El botón de entrega abre el roster de handoff (no solo cambia fase en memoria); vasopresor respeta `active: false` explícito en pendientes.
- **Críticos** — Deja de marcar crítico por heurísticas sueltas; alinea con toggle clínico y alarmas reales.

## Operación en guardia

Actualiza desde **7.0.3** en todas las estaciones del turno. El PIN, la sala y Mi rotación en la barra lateral no cambian; la entrada a entrega pasa por la barra de fases bajo el censo.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v7.1.0

- Mac: `R+-7.1.0-arm64.dmg`, `R+-7.1.0-x64.dmg` (y zip para auto-update).
- Windows: `R+-7.1.0-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [7.1.1](docs/RELEASE_NOTES_7.1.1.txt)

R+ 7.1.1 (LAN command sync + guardia entrega)
================================================

Fecha: 2026-06-06

## Resumen

Parche sobre 7.1.0: sincronización LAN por comandos tipados (estado actual, eventualidades, pendientes) con outbox persistente, y correcciones al flujo entrega → turno en Guardia.

## Nuevo / mejorado

- **LAN command sync** — Comandos tipados con outbox SQL/local, ACK ordenado por `deltaSeq` y materialización diferida del bundle. Dominios iniciales: **estado actual** (LWW), **eventualidades** (solo alta), **pendientes** (alta/actualizar/completar). El bundle completo sigue como fallback y recuperación.
- **Diagnóstico ⇄** — Trazas de command sync en el JSON de diagnósticos LAN (cola, ACK, gaps).

## Correcciones

- **Entrega en Guardia** — Tap en el chip de un paciente abre el modal de entrega antes de iniciar turno activo (no queda bloqueado detrás del menú de acciones).
- **Críticos en censo** — Borde rojo solo por toggle clínico + vasoactivo/VMI en handoff; deja de marcar por heurística de signos alterados ni badge «Alterado» en la tarjeta.
- **Menú de paciente** — La hoja de acciones rápidas solo aparece durante turno activo.

## Operación en guardia

Parche sobre **7.1.0**: instala en todas las estaciones del turno el mismo día. PIN, sala y barra de fases no cambian.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v7.1.1

- Mac: `R+-7.1.1-arm64.dmg`, `R+-7.1.1-x64.dmg` (y zip para auto-update).
- Windows: `R+-7.1.1-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [7.1.2](docs/RELEASE_NOTES_7.1.2.txt)

R+ 7.1.2 (Aprender R+ + guardia v7)
=======================================

Fecha: 2026-06-06

## Resumen

Parche sobre 7.1.1: educación post-registro para quienes actualizan a Guardia 7.x (Learn Hub + track guardia-v7) y retiro del módulo Manejo con sugerencias automáticas — VPO queda documentación manual.

## Nuevo / mejorado

- **Aprender R+** — Botón en el header (libro) y entrada en Ajustes → Ayuda. Abre el **Learn Hub**: módulos con progreso, artículos y tutoriales guiados.
- **Track guardia-v7** — Cinco capítulos (modo guardia, censo, entrega, LAN, móvil) con 19 pasos anclados al tablero real. Se ofrece tras el registro a quienes vienen de versiones anteriores a 7.0 o no completaron Fundamentos.
- **Tarjeta de actualización** — Aviso no bloqueante en el área principal para usuarios 7.x que aún no vieron la guía; se puede descartar.
- **Curriculum v9** — Nuevos capítulos guardia-v7 y quick-route; progreso por track en localStorage.
- **Centro de ayuda** — Tres artículos nuevos: Modo Guardia (7.x), Modo Entrega y pendientes, LAN/PIN del turno y móvil.

## Cambio de alcance clínico

- **Sin Manejo automático** — Se elimina el módulo Manejo (electrolitos, ATB, infusiones, protocolos, calculadoras) y su sync LAN.
- **Sin sugerencias inferidas** — Fuera reglas de seguridad HC/labs, sugerencias de laboratorio, inferencia de diagnósticos VPO y calculadoras peroperatorias.
- **VPO** — Sigue como documentación manual: escalas, EKG, recetas y texto libre; sin autocompletar clínico.

## Operación en guardia

Parche sobre **7.1.1**: instala en todas las estaciones del turno el mismo día. PIN, sala, command sync y barra de fases no cambian.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v7.1.2

- Mac: `R+-7.1.2-arm64.dmg`, `R+-7.1.2-x64.dmg` (y zip para auto-update).
- Windows: `R+-7.1.2-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [7.1.3](docs/RELEASE_NOTES_7.1.3.txt)

R+ 7.1.3 (signos vitales + Aprender)
====================================

Fecha: 2026-06-06

## Resumen

Parche sobre 7.1.2: corrige alertas de signos vitales que sonaban sin plan activo o se repetían cada minuto, y simplifica la educación post-actualización hacia el Learn Hub (sin modal Sala/Interconsulta).

## Nuevo / mejorado

- **Alertas de signos** — Las notificaciones usan el mismo criterio que el tablero de guardia: solo pacientes con plan de signos en intervalo o por turno (no rutina). Sin repetir el mismo aviso en cada barrido de fondo.
- **Aprender R+** — Tras actualizar, se abre el Learn Hub en lugar del modal «Sala o Interconsulta».
- **Fundamentos · Interconsulta** — Cuatro módulos visibles bajo Fundamentos → Interconsulta (lab, expediente, ajustes, equipo).

## Operación en guardia

Parche sobre **7.1.2**: instala en todas las estaciones del turno el mismo día. Learn Hub, guardia-v7, LAN command sync y PIN del turno no cambian.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v7.1.3

- Mac: `R+-7.1.3-arm64.dmg`, `R+-7.1.3-x64.dmg` (y zip para auto-update).
- Windows: `R+-7.1.3-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [7.1.4](docs/RELEASE_NOTES_7.1.4.txt)

R+ 7.1.4 (guardia censo + directorio LAN)
=============================================

Fecha: 2026-06-06

## Resumen

Parche sobre 7.1.3: corrige el censo de guardia para Admin/R4 (filtros, sectores y pacientes del host), y hace usable el directorio LAN (menos lag, secciones colapsables, perfiles pendientes en ⇄).

## Nuevo / mejorado

- **Censo guardia (Admin/R4)** — Los filtros «Sala / Equipo / Alcance» aplican al tablero; sectores R4 usan `servicio`+`area` reales; Admin ve el censo completo y puede traer pacientes asignados que faltaban en esta Mac.
- **Filtro por equipo** — «Dra. Melissa» (y otros equipos) ya no devuelve 0 pacientes por error de ciclo del viewer.
- **Directorio LAN** — Deja de re-pintar toda la lista en cada sync (solo si cambian datos); las secciones por rango (R1, R2…) **permanecen colapsadas**; menos tirones al asignar integrantes.
- **⇄ Directorio** — Exporta perfiles con nombre+sala aunque falte @usuario; en red local intenta fusionar roster de otra Mac en la misma sala (throttle 30 s). **No sustituye** un solo anfitrión: si cada Mac tiene distinto `hostUrl`, una debe ser servidor y las demás **Unirse** con el enlace ⇄.
- **⇄ Restablecer conexión al turno** — Botón en ⇄ para salir de split-brain: abandona la sala, quita anfitrión fijado y deja de usar esta Mac como servidor; luego PIN del R4 o enlace de invitación. La base clínica no se borra.
- **⇄ PIN del turno** — Campo visible tras registro y cuando esta Mac actúa como servidor local sin ser el anfitrión del turno.
- **Rendimiento LAN** — Menos peticiones en bucle a sync-bundle/clinical-ops (reconcile con cooldown y sin pull redundante).
- **Guardia UI** — Barra de fase vacía oculta; Mi rotación no reaparece en modo Guardia.

## Operación en guardia

Parche sobre **7.1.3**: instala en **todas** las estaciones del turno el mismo día. Si el directorio no lista a alguien en la misma sala, en ⇄ usa **Restablecer conexión al turno** y conecta con el PIN del R4; el anfitrión debe ser una sola Mac (mismo `hostUrl` en el informe de ⇄).

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v7.1.4

- Mac: `R+-7.1.4-arm64.dmg`, `R+-7.1.4-x64.dmg` (y zip para auto-update).
- Windows: `R+-7.1.4-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [7.1.5](docs/RELEASE_NOTES_7.1.5.txt)

R+ 7.1.5 (LAN reconexión + entregas huérfanas guardia)
==========================================================

Fecha: 2026-06-07

## Resumen

Parche sobre 7.1.4: deja de reintentar en bucle la búsqueda del anfitrión LAN cuando no hay respuesta, y en guardia muestra entregas activas cuyo expediente ya no está en el censo local.

## Nuevo / mejorado

- **⇄ Reconexión menos ruidosa** — Tras **5 intentos** fallidos de detectar anfitrión (PIN / escaneo), la búsqueda automática se **pausa**; el header muestra «desconectado» en lugar de «reconectando…». Reanuda al abrir ⇄, ingresar PIN, **Restablecer conexión al turno** o restablecer estado del host.
- **Entregas huérfanas (guardia)** — Franja en el tablero para entregas activas sin fila en el censo local (borrado o solo en otra Mac): abrir expediente, eliminar en host o descartar localmente.
- **Guardias resueltas en LAN** — Meta `lan_guardias_resolved` en clinical_ops para alinear entregas cerradas entre estaciones sin resurrectar pacientes.
- **Host bundle** — Mejor preservación de roster clinical_ops al exportar desde SQLCipher.

## Operación en guardia

Parche sobre **7.1.4**: instala en **todas** las estaciones del turno. Si ⇄ queda en pausa, abre el panel o usa PIN del R4; no hace falta reiniciar R+.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v7.1.5

- Mac: `R+-7.1.5-arm64.dmg`, `R+-7.1.5-x64.dmg` (y zip para auto-update).
- Windows: `R+-7.1.5-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [7.1.6](docs/RELEASE_NOTES_7.1.6.txt)

R+ 7.1.6 (LiveSync ligero en red local)
===========================================

Fecha: 2026-06-07

## Resumen

LiveSync en red local deja de empujar el bundle completo de la sala en cada guardado. Las mutaciones tipadas (nota, indicaciones, laboratorios, campos) van por HTTP/WS liviano; el bundle completo queda para unirse, reconectar o un respaldo de seguridad a 30 s para dominios sin tipar.

## Nuevo / mejorado

- **⇄ Menos tráfico al unirse** — Al entrar un colega, cada Mac envía una pista de revisión (~60 B) en lugar de un bundle WS de ~100 KB.
- **Compresión HTTP** — Respuestas grandes de `/api/lan/v1` (sync-bundle, clinical-ops) viajan comprimidas en gzip.
- **Mutaciones tipadas** — Endpoints dedicados en el anfitrión para nota, indicaciones, laboratorios y campos; outbox SQLCipher v14 para reintentos.
- **Bundle de seguridad (30 s)** — Dominios sin tipar (entrega, eventualidades, VPO, etc.) agrupan un bundle parcial (`entriesPartial`) sin pisar nota/labs ya sincronizados por la vía tipada.
- **Pistas de revisión → delta primero** — Antes de `GET /sync-bundle`, intenta `GET /deltas?afterSeq=N` cuando el log alcanza.
- **Perfil de red FAST / SLOW / OFFLINE** — Ajusta debounce y escaneo según RTT; en OFFLINE se detiene el escaneo y aparece **Reconectar** (flush outbox → bundle → WS).

## Operación en guardia

Parche sobre **7.1.5**: instala en **todas** las estaciones del turno. La base clínica migra a esquema **v14** (nuevos tipos en outbox LAN). Compatibilidad con Macs en 7.1.5: siguen funcionando; las estaciones en 7.1.6 aprovechan la vía liviana.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v7.1.6

- Mac: `R+-7.1.6-arm64.dmg`, `R+-7.1.6-x64.dmg` (y zip para auto-update).
- Windows: `R+-7.1.6-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [7.1.7](docs/RELEASE_NOTES_7.1.7.txt)

R+ 7.1.7 (LAN roam entre redes)
===========================================

Fecha: 2026-06-07

## Resumen

Mejora la conexión ⇄ al cambiar de red Wi‑Fi o VLAN en el hospital: detecta el cambio de subred, limpia anfitriones obsoletos y vuelve a buscar el turno en todas las /24 locales sin esperar al siguiente escaneo lento.

## Nuevo / mejorado

- **Detección de cambio de red** — Electron vigila subredes IPv4 y URL LAN candidata cada ~3 s; al cambiar Wi‑Fi o VLAN avisa al renderer de inmediato.
- **Limpieza al roam** — Si el anfitrión fijado o guardado quedó en otra subred, se descarta; si esta Mac es anfitrión, actualiza su IP anunciada.
- **Reconexión inmediata** — Tras el cambio: reanuda escaneo (sin pausa por 5 fallos), reinicia discovery, intenta PIN del turno (cliente) o auto-unión (anfitrión).
- **Escaneo multi-subred** — El descubrimiento automático ⇄ ahora recorre **todas** las /24 locales del Mac (antes solo una), alineado con la ruta del PIN del turno.

## Operación en guardia

Parche sobre **7.1.6**: instala en **todas** las estaciones del turno. Sin cambio de esquema SQLCipher (sigue v14). Si el hospital bloquea tráfico entre dispositivos en la misma Wi‑Fi (aislamiento de cliente), ninguna versión puede descubrir pares — en ese caso usa PIN + anfitrión manual.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v7.1.7

- Mac: `R+-7.1.7-arm64.dmg`, `R+-7.1.7-x64.dmg` (y zip para auto-update).
- Windows: `R+-7.1.7-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [7.1.8](docs/RELEASE_NOTES_7.1.8.txt)

R+ 7.1.8 (LAN conectar anfitrión)
=====================================

Fecha: 2026-06-07

## Resumen

Corrige el fallo en que «Conectar al anfitrión» / «Combinar servidores» no hacía nada tras confirmar: el módulo LAN transport quedaba sin cablear cuando esbuild duplicaba el chunk.

## Nuevo / mejorado

- **Cableado LAN transport** — `registerLanSyncTransportDeps` comparte estado vía `globalThis` (mismo patrón que push/room); `initLanClientFromStorage` espera el cableado antes de auto-unirse.
- **Combinar sin sala** — Si confirmas unirte al anfitrión de mayor rango sin estar en una sala ⇄, R+ avisa en lugar de fallar en silencio.

## Operación en guardia

Parche sobre **7.1.7**: instala en **todas** las estaciones del turno. Sin cambio de esquema SQLCipher (sigue v14).

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v7.1.8

- Mac: `R+-7.1.8-arm64.dmg`, `R+-7.1.8-x64.dmg` (y zip para auto-update).
- Windows: `R+-7.1.8-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [7.1.9](docs/RELEASE_NOTES_7.1.9.txt)

R+ 7.1.9 (LAN descubrimiento y reconexión)
==============================================

Fecha: 2026-06-08

## Resumen

Re-arquitectura de la capa LAN: el anfitrión se identifica por huella digital (no solo por IP), hay descubrimiento mDNS y beacon UDP, reconexión WS→SSE→HTTP y diagnóstico visible en el panel ⇄.

## Nuevo / mejorado

- **Registro de anfitriones** — `lan-host-registry.mjs` unifica escaneo, mDNS, UDP, `/health` y heartbeats; la huella `clientId:startedAt` sobrevive cambios de IP.
- **mDNS Bonjour** — Anuncia y busca `_rplus._tcp` en el puerto 3738; IPC `lan:mdns-peers` y reinicio al cambiar de NIC.
- **Beacon UDP** — Multicast `239.255.42.1:3739` como pista adicional en subred.
- **Roam por huella** — Al cambiar Wi‑Fi, si el anfitrión fijado sigue vivo con la misma huella, salta el barrido completo y reconecta a la URL nueva.
- **PIN del turno** — Escaneo con backoff exponencial (12→30→60→120 s) para no saturar la red.
- **SSE + fallback** — `GET /api/lan/v1/sse` con heartbeat; `LanConnectionManager` cae de WS a SSE a polling HTTP si el proxy bloquea upgrades.
- **`/health`** — Endpoint agregado + `livesync:hello` cada 30 s para estado del host y del turno.
- **Panel ⇄** — Fila de pre-vuelo (huella, transporte, outbox), badges de outbox y transporte sin abrir diagnóstico.
- **QR con huella de guardia** — El código incluye `sha256[:8]` del turno; aviso si intentas unirte a otra guardia.

## Operación en guardia

Parche sobre **7.1.8**: instala en **todas** las estaciones del turno. Sin cambio de esquema SQLCipher (sigue v14). En redes restrictivas: puerto **3738** TCP, mDNS (5353) y multicast UDP **3739**.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v7.1.9

- Mac: `R+-7.1.9-arm64.dmg`, `R+-7.1.9-x64.dmg` (y zip para auto-update).
- Windows: `R+-7.1.9-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [7.1.10](docs/RELEASE_NOTES_7.1.10.txt)

R+ 7.1.10 (LAN mDNS y diagnóstico ⇄)
========================================

Fecha: 2026-06-08

## Resumen

Parche sobre 7.1.9: mDNS deja de fallar en silencio cuando el Wi‑Fi cae o cambia de interfaz, y el panel ⇄ expone más contexto en diagnóstico sin duplicar el indicador verde de conexión.

## Nuevo / mejorado

- **mDNS resiliente** — Errores recuperables (`EADDRNOTAVAIL`, `ENETDOWN`, etc.) detienen Bonjour sin crashear; no anuncia si no hay interfaz LAN; al perder red se detiene hasta que vuelva una IP privada.
- **Reinicio de NIC** — `main.js` solo reinicia mDNS cuando hay `candidateBaseUrl`; si no hay red, para el servicio.
- **Panel ⇄** — En fase `live`, la fila de pre-vuelo se oculta (el punto verde ya está en la línea de estado).
- **Diagnóstico ⇄** — Informe incluye perfil de red (FAST/SLOW/OFFLINE), transporte activo (WS/SSE/poll), RTT, hosts en registro y rol (host/client).

## Operación en guardia

Parche sobre **7.1.9**: instala en **todas** las estaciones del turno. Sin cambio de esquema SQLCipher (sigue v14).

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v7.1.10

- Mac: `R+-7.1.10-arm64.dmg`, `R+-7.1.10-x64.dmg` (y zip para auto-update).
- Windows: `R+-7.1.10-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [7.2.0](docs/RELEASE_NOTES_7.2.0.txt)

R+ 7.2.0 (Estabilización LAN en guardia)
==========================================

Fecha: 2026-06-08

## Resumen

Consolidación LAN para turno homogéneo: descubrimiento por huella (7.1.9), mDNS resiliente (7.1.10) y corrección al rotar el código del equipo sin perder el estado del anfitrión. Sin cambio de esquema SQLCipher (sigue v14).

## Nuevo / mejorado

- **Código del equipo sin borrar el host** — Si `lan-team-code.txt` cambia, R+ alinea `teamCodeHash` en disco y SQLCipher en lugar de fallar con `LAN_HOST_STATE_HASH_MISMATCH` o dejar datos huérfanos. Aplica al guardar código en ⇄ y al escribir bearer de invitado.
- **mDNS resiliente** — Bonjour se detiene limpio cuando cae el Wi‑Fi o no hay interfaz LAN; reinicia al volver la red.
- **Huella de anfitrión** — Registro unificado; roam por `clientId:startedAt` al cambiar de IP.
- **Descubrimiento** — mDNS `_rplus._tcp`, beacon UDP y escaneo de subred.
- **Transporte** — WS → SSE → polling HTTP en redes restrictivas.
- **Diagnóstico ⇄** — Perfil de red, transporte, RTT, hosts en registro y rol en el informe.
- **Heartbeats estables** — `livesync:hello` y `/health` no tiran el servidor si el store LAN está momentáneamente inconsistente.

## Operación en guardia

Parche sobre **7.1.10**: instala en **todas** las estaciones del turno el mismo día. Sin migración SQLCipher (esquema **v14**). Firewall: TCP **3738**, mDNS **5353**, UDP multicast **3739**. No mezclar versiones en el mismo turno.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v7.2.0

- Mac: `R+-7.2.0-arm64.dmg`, `R+-7.2.0-x64.dmg` (y zip para auto-update).
- Windows: `R+-7.2.0-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [7.2.1](docs/RELEASE_NOTES_7.2.1.txt)

R+ 7.2.1 (LAN cross-VLAN y estabilidad)
===========================================

Fecha: 2026-06-08

## Resumen

Parche sobre 7.2.0: registro persistente de anfitriones y subredes del hospital (cross-VLAN), conexión por PIN con dirección opcional, menos ruido en escaneo ⇄ y correcciones de estabilidad en menú y arranque. Sin cambio de esquema SQLCipher (sigue v14).

## Nuevo / mejorado

- **Registro ward (cross-VLAN)** — R+ recuerda URLs de anfitrión y prefijos /24 vistos en el turno (`localStorage` + `userData/lan-ward-host-registry.json`). Se comparten en `auth/exchange` como `wardHostHints` y vía `GET /auth/ward-host-hints`.
- **PIN con dirección opcional** — Tarjeta **PIN del turno** en ⇄ (visible tras **Restablecer conexión**); acepta IP del anfitrión (p. ej. `http://10.0.57.52:3738`) antes del barrido; prueba URLs ward guardadas y hasta 3 subredes extra.
- **Copiar dirección del anfitrión** — Botón en ⇄ para compartir la URL del host con colegas en otra VLAN.
- **⇄ más liviano** — Menos re-renders del panel cerrado, escaneo /24 cada 45 s, debounce al cambiar de Wi‑Fi y sin auto-PIN en modo «solo mi equipo».
- **Estabilidad** — Menú Editar/Ver sin crash si aún no hay ventana; mDNS peers con debounce; vigilancia de red cada 10 s.

## Operación en guardia

Parche sobre **7.2.0**: instala en **todas** las estaciones del turno el mismo día. Sin migración SQLCipher (esquema **v14**). Si el hospital separa VLANs, el anfitrión puede copiar su dirección ⇄ para que clientes en otra red conecten con PIN + URL.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v7.2.1

- Mac: `R+-7.2.1-arm64.dmg`, `R+-7.2.1-x64.dmg` (y zip para auto-update).
- Windows: `R+-7.2.1-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [7.2.2](docs/RELEASE_NOTES_7.2.2.txt)

R+ 7.2.2 (LAN cliente y reconexión)
=======================================

Fecha: 2026-06-08

## Resumen

Parche sobre 7.2.1: corrige conexión de clientes LAN (bearer de invitado separado del código del host local), reconoce la dirección copiada del anfitrión al pegar en ⇄, mejora el descubrimiento por PIN y elimina el diálogo de confirmación al reconectar. Sin cambio de esquema SQLCipher (sigue v14).

## Nuevo / mejorado

- **Bearer de invitado separado** — El token del anfitrión remoto se guarda en `lan-guest-bearer.txt`; ya no sobrescribe `lan-team-code.txt` del servidor local (regresión 7.2.0). Auto-reparación si ambos archivos coincidían.
- **Pegar dirección del anfitrión** — ⇄ reconoce `http://…:3738` (o `IP:3738`) en «Unirse con enlace»; opcionalmente PIN en la misma línea. Sin PIN, rellena la tarjeta **PIN del turno** y pide los 6 dígitos.
- **PIN más rápido** — Antes del barrido /24: URLs ward, registro mDNS/UDP/heartbeat; clientes en rol remoto ya no prueban loopback (menos 401 en consola).
- **Reconexión silenciosa** — Sin diálogo «¿Reconectar al anfitrión…?»; toast si hay anfitrión fijado distinto.
- **Errores claros** — Distingue PIN incorrecto vs dirección inalcanzable al conectar con URL manual.

## Operación en guardia

Parche sobre **7.2.1**: instala en **todas** las estaciones del turno el mismo día. El anfitrión copia dirección + PIN desde ⇄; en otra VLAN el cliente pega ambos (o dirección y luego PIN en la tarjeta). Esquema SQLCipher **v14**.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v7.2.2

- Mac: `R+-7.2.2-arm64.dmg`, `R+-7.2.2-x64.dmg` (y zip para auto-update).
- Windows: `R+-7.2.2-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [7.2.3](docs/RELEASE_NOTES_7.2.3.txt)

R+ 7.2.3 (LAN anfitrión ward empaquetado)
=============================================

Fecha: 2026-06-08

## Resumen

Parche sobre 7.2.2: la dirección del anfitrión del turno (`http://10.0.57.52:3738`) viene empaquetada en clientes nuevos — prellenada en ⇄, incluida en descubrimiento por PIN y en el barrido ward sin configuración manual. Sin cambio de esquema SQLCipher (sigue v14).

## Nuevo / mejorado

- **Anfitrión ward empaquetado** — `bundledWardHostUrl()` en `clinical-settings.mjs` fija `http://10.0.57.52:3738` para el hospital; clientes lo ven al conectar con PIN del turno.
- **Descubrimiento automático** — La URL empaquetada es la primera en `listWardHostUrlsForProbe()`: shift-PIN, escaneo ⇄ y reconexión la prueban aunque el registro ward esté vacío.
- **Subred 10.0.57** — El prefijo ward empaquetado entra en barridos beacon cross-VLAN junto a NIC local y prefijos guardados.
- **UI ⇄** — Campo «Dirección del anfitrión» prellenado y placeholder con la URL del turno.

## Operación en guardia

Parche sobre **7.2.2**: instala en **todas** las estaciones del turno el mismo día. Los clientes nuevos ya traen la dirección del R4; solo hace falta el PIN del turno. Esquema SQLCipher **v14**.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v7.2.3

- Mac: `R+-7.2.3-arm64.dmg`, `R+-7.2.3-x64.dmg` (y zip para auto-update).
- Windows: `R+-7.2.3-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [7.2.4](docs/RELEASE_NOTES_7.2.4.txt)

R+ 7.2.4 (R4 cliente primero y sin equipo obligatorio)
==========================================================

Fecha: 2026-06-08

## Resumen

Parche sobre 7.2.3: al registrarse como R4, R+ ya no se convierte en anfitrión del turno antes de buscar la red — conecta al host activo (fijado, PIN o barrido) como cualquier estación. R4 y Admin dejan de requerir unirse a un equipo en Mi rotación. Sin cambio de esquema SQLCipher (sigue v14).

## Nuevo / mejorado

- **R4 como cliente primero** — Tras el registro, R4 permanece en modo cliente: usa PIN del turno, anfitrión fijado o descubrimiento LAN antes de activar el servidor embebido de esta Mac.
- **Barrido de red para R4** — Deja de omitir el escaneo de subred solo por ser elegible como anfitrión; encuentra el host fijado (`10.0.57.52:3738`) aunque nunca haya sido servidor local.
- **⇄ sin auto-promoción** — El panel Wi‑Fi intenta el anfitrión fijado primero y solo prepara servidor local si el rol ya es «host» (acción explícita o Mac designada).
- **Mi rotación sin equipo** — R4 y Admin supervisan todas las rotaciones; no aparecen como «sin equipo» ni bloquean el uso de la app por falta de membresía.
- **Migración legacy** — Se elimina la promoción automática de R4 de «cliente» a «host» cuando no hay URL guardada (UI antigua de pestañas).

## Operación en guardia

Parche sobre **7.2.3**: instala en **todas** las estaciones del turno el mismo día. Las Macs R4 nuevas deben conectar con PIN o al host fijado; solo una estación debe actuar como anfitrión del turno. Esquema SQLCipher **v14**.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v7.2.4

- Mac: `R+-7.2.4-arm64.dmg`, `R+-7.2.4-x64.dmg` (y zip para auto-update).
- Windows: `R+-7.2.4-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [7.2.5](docs/RELEASE_NOTES_7.2.5.txt)

R+ 7.2.5 (persistencia LAN anfitrión)
=========================================

Fecha: 2026-06-08

## Resumen

Parche sobre 7.2.4: el anfitrión LAN deja de reescribir un JSON monolítico en cada guardado. Los commits son **asíncronos y coalescidos**, los bundles van por **sala**, los labs viven en **sidecars** y —con SQLCipher desbloqueado— las tablas normalizadas **v15** sustituyen el blob único. Esquema SQLCipher **v15** (migración automática al desbloquear).

## Nuevo / mejorado

- **Commits coalescidos** — `CommitBarrier` agrupa escrituras (~150 ms); las rutas HTTP tipadas esperan `awaitDurableCommit` antes de responder.
- **Shards JSON por sala** — `meta.json` + `rooms/<id>/bundle.json`; migración automática desde `lan-squad-host-state.json`.
- **Sidecars de laboratorio** — `labHistory` fuera del bundle; upserts de labs ya no re-serializan el turno completo.
- **SQL v15 en anfitrión** — Tablas `lan_host_meta`, `lan_room_bundles`, `lan_bundle_entries`, `lan_lab_sets` cuando la DB clínica está desbloqueada; fallback JSON si está bloqueada.
- **Rollback de soporte** — Variable de entorno `R_PLUS_LAN_PERSIST_MODE` (`legacy` | `json` | `sql` | `sql-monolith`) para forzar generación anterior sin recompilar.

## Operación en guardia

Parche sobre **7.2.4**: instala en **todas** las estaciones del turno el mismo día. El anfitrión debe actualizar primero (migra estado en disco al arrancar). Esquema SQLCipher **v15** — las Macs cliente con DB bloqueada no migran hasta desbloquear; el host LAN sigue con shards JSON en ese caso.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v7.2.5

- Mac: `R+-7.2.5-arm64.dmg`, `R+-7.2.5-x64.dmg` (y zip para auto-update).
- Windows: `R+-7.2.5-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [7.2.6](docs/RELEASE_NOTES_7.2.6.txt)

R+ 7.2.6 (entrega en censo, guardia e interno)
=======================================================

Fecha: 2026-06-08

## Resumen

Parche sobre 7.2.5: la **entrega** usa el equipo del paciente según el **censo**, el **listado de guardia** ordena por **cama** con críticos e inestables arriba, el **interno móvil** alinea al censo y sincroniza signos al host, y el cambio entre **Lab / Med / Expediente** es más fluido.

## Nuevo / mejorado

- **Entrega — equipo del paciente** — El modal toma `patient_team_assignment` del censo; el selector incluye el equipo del censo aunque no seas miembro (Admin ve todos). Hint claro entre equipo del paciente y R1 de guardia.
- **Entrega — guardado al avanzar** — Al usar las flechas entre pacientes, cada entrega se guarda automáticamente; **Confirmar entrega** cierra el turno para todos.
- **Asignar al registrar** — Selector de equipo al agregar paciente; persiste en SQLCipher y sincroniza por LAN.
- **Entrega — Sin signos** — Tercera opción en plan de signos: el paciente no aparece en interno salvo estudios/pendientes activos.
- **Orden en guardia** — Grid, panel Entrega e interno: **críticos e inestables** primero; dentro de cada grupo, **por cama** (cuarto/cama).
- **Interno móvil** — Lista solo pacientes del censo de la sala; signos capturados en iPad llegan al host/desktop vía IPC (no solo WS).
- **Guardia hoy** — R2/R3/R4 ven el modal de guardia al iniciar entrega (pueden omitir).
- **Bulk preview → expediente** — Tras registrar desde vista previa masiva de labs, R+ abre el expediente y suspende el modal para volver a **Lab** y seguir procesando.
- **Tabs más fluidos** — Paneles principales en stack (`visibility` en lugar de `display:none`); renders diferidos al cambiar tab; caché en panel de recetas.
- **Tendencias** — Mini-gráficas marcan valores fuera de rango en rojo y actualizan sin parpadeo al refrescar.
- **Censo PDF/HTML** — Exportación y vista previa respetan el filtro de censo activo (equipo/sala).
- **UI** — Tokens Hallmark, bordes del shell y motion más suaves en el workbench clínico.

## Operación en guardia

Parche sobre **7.2.5**: instala en **todas** las estaciones del turno el mismo día. Sin cambio de esquema SQLCipher (sigue **v15**).

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v7.2.6

- Mac: `R+-7.2.6-arm64.dmg`, `R+-7.2.6-x64.dmg` (y zip para auto-update).
- Windows: `R+-7.2.6-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [7.2.7](docs/RELEASE_NOTES_7.2.7.txt)

R+ 7.2.7 (interno — frecuencia y UI signos)
=======================================================

Fecha: 2026-06-08

## Resumen

Parche sobre 7.2.6: el **interno móvil** ordena pacientes por **frecuencia de signos vitales** (más frecuente primero) y el modal de captura usa **tema oscuro** también en glucometrías.

## Nuevo / mejorado

- **Interno — orden por frecuencia** — La lista MIP prioriza pacientes con SV programados: q1h → q2h → q4h → por turno; dentro de la misma frecuencia, vencidos antes que al día; empate por cama. Pacientes solo con estudios al final.
- **Interno — glucometrías** — Los campos mg/dL y HH:MM en el modal de signos usan el mismo fondo oscuro que TAS, FC, etc. (ya no aparecen en blanco en iPad).

## Operación en guardia

Parche sobre **7.2.6**: instala en **todas** las estaciones del turno el mismo día. Sin cambio de esquema SQLCipher (sigue **v15**). El iPad solo necesita recargar la página de internos (CSS `?v=4`).

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v7.2.7

- Mac: `R+-7.2.7-arm64.dmg`, `R+-7.2.7-x64.dmg` (y zip para auto-update).
- Windows: `R+-7.2.7-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [7.2.8](docs/RELEASE_NOTES_7.2.8.txt)

R+ 7.2.8 (interno, glu rescate y LAN iPad)
=============================================

Fecha: 2026-06-10

## Resumen

Parche sobre 7.2.7: el **interno móvil** ordena por **frecuencia de signos** y mejora la captura de **glucometrías**; **Estado actual** registra **rescates de insulina** por glucometría; las **Mac cliente** del turno pueden **copiar el enlace iPad** sin ser anfitrión.

## Nuevo / mejorado

- **Interno — orden por frecuencia** — La lista MIP prioriza pacientes con SV programados: q1h → q2h → q4h → por turno; dentro de la misma frecuencia, vencidos antes que al día; empate por cama. Pacientes solo con estudios al final.
- **Interno — glucometrías** — Los campos mg/dL y HH:MM en el modal de signos usan el mismo fondo oscuro que TAS, FC, etc. (ya no aparecen en blanco en iPad).
- **Estado actual — rescate de insulina** — Cada glucometría puede marcarse **Alterada** y capturar **unidades de rescate** + **DXT post-rescate**; la nota SOME refleja rescates aplicados o disponibles.
- **Estado actual — gráfica de glu** — Puntos fuera de rango o marcados alterados se resaltan en la serie temporal.
- **LAN — enlace iPad en cliente** — Una Mac unida al turno (no solo el anfitrión) puede copiar el enlace permanente para iPad; usa la URL del host remoto del ⇄.

## Operación en guardia

Parche sobre **7.2.7**: instala en **todas** las estaciones del turno el mismo día. Sin cambio de esquema SQLCipher (sigue **v15**). El iPad solo necesita recargar la página de internos (CSS `?v=4`).

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v7.2.8

- Mac: `R+-7.2.8-arm64.dmg`, `R+-7.2.8-x64.dmg` (y zip para auto-update).
- Windows: `R+-7.2.8-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [7.2.9](docs/RELEASE_NOTES_7.2.9.txt)

R+ 7.2.9 (Manejo, dietas SOME y EA)
=======================================

Fecha: 2026-06-10

## Resumen

Parche sobre 7.2.8: la pestaña **Medicamentos** pasa a **Manejo** con parser SOME ampliado (**medicamentos P2** y **dietas**); **Estado actual** recibe propuestas de dieta y un botón flotante para copiar; el censo re-selecciona paciente si el filtro lo oculta.

## Nuevo / mejorado

- **Manejo — parser SOME ampliado** — Al pegar el bloque del hospital se procesan filas `MEDICAMENTOS`, `MEDICAMENTOS P2` y `DIETAS` (tabuladores). `CUIDADOS` y `ESTUDIOS` se omiten con conteo en el toast.
- **Manejo — dieta detectada** — Las dietas parseadas se muestran en tarjeta con kcal y gramos de proteína extraídos del detalle.
- **Manejo — SOAP pre-marcado** — Antibióticos, antiHTA, insulinas, D50 y rescates PRN por glucometría se marcan automáticamente en la grilla SOAP.
- **Estado actual — propuesta de dieta** — En sala, al procesar Manejo la dieta va a **propuesta pendiente** (`dieta`, `kcal`, `proteinG`); confirmar o descartar en EA como los medicamentos.
- **Estado actual — proteína (g/día)** — Nuevo campo en la sección dieta del monitoreo clínico.
- **Estado actual — copiar FAB** — Botón flotante (como Laboratorio) para copiar el texto de Estado actual sin bajar al pie del panel.
- **Censo — paciente activo** — Si el filtro de equipo/censo oculta al paciente seleccionado, R+ elige el primero visible o vacía la vista.

## Operación en guardia

Parche sobre **7.2.8**: instala en **todas** las estaciones del turno el mismo día. Sin cambio de esquema SQLCipher (sigue **v15**). El iPad no requiere actualización.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v7.2.9

- Mac: `R+-7.2.9-arm64.dmg`, `R+-7.2.9-x64.dmg` (y zip para auto-update).
- Windows: `R+-7.2.9-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [7.3.0](docs/RELEASE_NOTES_7.3.0.txt)

R+ 7.3.0 (Perfil histórico, directorio LAN y laboratorio)
==========================================================

Fecha: 2026-06-10

## Resumen

Sobre **7.2.9**: el **perfil farmacoterapéutico** muestra una grilla dinámica que cruza meses con filas continuas por medicamento; el **directorio LAN** registra actividad reciente y admite filtros; **Laboratorio** renueva el historial por fecha; el censo PDF envuelve labs y pendientes; el anfitrión abre un **dashboard modal** del censo host.

## Nuevo / mejorado

- **Perfil histórico — ventana dinámica** — Columnas ancladas al mes en navegación: solape automático cerca de fin/inicio de mes (< día 14), mes actual sin días futuros (`1…hoy`), mes pasado acotado por `fimiFecha` y primer/último día con indicación.
- **Perfil histórico — filas continuas** — Medicamentos con el mismo `rowKey` en dos meses se unifican en una sola fila al cruzar el calendario (persistencia sigue por mes).
- **Perfil histórico — grupos por medicamento** — Filas colapsables por nombre de fármaco; adherencia calculada sobre el conjunto de `rowKey` del grupo.
- **FAB Copiar — contexto** — Los botones flotantes de **Laboratorio** y **Estado actual** solo aparecen en la pestaña activa y cuando hay contenido copiable.
- **Directorio LAN — actividad** — `last_activity_at` en usuarios clínicos (SQLCipher **v16–v17**); etiquetas «Activo ahora», «hace X min», «Inactivo».
- **Directorio LAN — filtros** — Búsqueda, estado (asignado/sin equipo), sala y actividad; rangos de rango colapsables cuando hay más de 4 usuarios.
- **Directorio LAN — CTA** — Botón **Directorio LAN** en la barra superior de equipos (modal aparte).
- **Laboratorio — historial por fecha** — Selector **Estudio** (fecha + tipo) en lugar de lista larga; re-procesar, re-enviar a nota o borrar el set seleccionado.
- **Manejo — destino SOAP** — Medicamentos clasificados como «otros» muestran selector de destino en Estado actual / SOAP.
- **Estado actual — dieta pendiente en panel** — La propuesta de dieta se refleja en los campos del panel antes de confirmar.
- **Censo PDF — labs y pendientes** — Columnas con envoltura completa (sin elipsis por ancho estrecho).
- **Censo — columna pendientes** — Hasta 3 pendientes abiertos por prioridad (alta → media → baja).
- **Filtros censo — equipo por sala** — El dropdown de equipo se acota a la sala seleccionada; limpia filtro inválido al cambiar sala.
- **LAN anfitrión — censo dashboard** — Modal a pantalla completa con snapshot host vs local, fantasmas, archivados y purga.

## Operación en guardia

Instala **7.3.0 en todas** las estaciones del turno el mismo día. La base clínica sube a esquema **v17** (`last_activity_at` en usuarios). Macs en **7.2.9** siguen compatibles en LAN; el iPad no requiere actualización.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v7.3.0

- Mac: `R+-7.3.0-arm64.dmg`, `R+-7.3.0-x64.dmg` (y zip para auto-update).
- Windows: `R+-7.3.0-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [7.3.1](docs/RELEASE_NOTES_7.3.1.txt)

R+ 7.3.1 (Manejo modal SOME, AAS SOAP y perfil borrar)
==========================================================

Fecha: 2026-06-10

## Resumen

Parche sobre **7.3.0**: **Manejo** mueve el pegado SOME a un modal **Importar SOME** con grilla más legible; la clasificación SOAP distingue **AAS 100 mg** (otros) de dosis analgésicas; el **perfil farmacoterapéutico** permite borrar mes o perfil completo; **Estado actual** reorganiza la dieta pendiente y quita «PARA PESO DE X KG» del texto copiado.

## Nuevo / mejorado

- **Manejo — modal Importar SOME** — El pegado del hospital abre en modal (como perfil SOME); la grilla queda en la tarjeta «Medicamentos del turno» con fecha y **+1 día**.
- **Manejo — etiquetas compactas** — Filas con indicación corta; dosis de `dosisRaw` para combos como piperacilina/tazobactam.
- **SOAP — AAS por dosis** — Ácido acetilsalicílico ≤160 mg va a **Otros** (antiplaquetario); >160 mg a **Analgesia**. La clasificación usa `dosisRaw`.
- **SOAP / EA — texto dieta** — Cláusula de dieta sin «PARA PESO DE X KG» (kcal/kg y total se mantienen).
- **Perfil farmacoterapéutico — borrar** — Menú **⋯**: eliminar mes visible o borrar perfil completo del paciente (con confirmación).
- **Estado actual — dieta pendiente** — Barra de confirmación bajo nutrición; rejilla FOUR/Glasgow/Soporte y dieta/kcal/proteína en filas dedicadas.

## Operación en guardia

Parche sobre **7.3.0**: instala en **todas** las estaciones del turno el mismo día. Sin cambio de esquema SQLCipher (sigue **v17**). El iPad no requiere actualización.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v7.3.1

- Mac: `R+-7.3.1-arm64.dmg`, `R+-7.3.1-x64.dmg` (y zip para auto-update).
- Windows: `R+-7.3.1-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [7.3.2](docs/RELEASE_NOTES_7.3.2.txt)

R+ 7.3.2 (Premium UI, gráficas EA y endurecimiento)
=======================================================

Fecha: 2026-06-11

## Resumen

Sobre **7.3.1**: renovación visual **Workbench Refinado** en escritorio, móvil e interno (tokens, vidrio en overlays, navegación agrupada y **⌘K**); modal de **gráficas en Estado actual** con pestañas y tooltips completos; endurecimiento de seguridad (CSP, `window.open`, borrado PHI en web móvil); purga LAN más segura en el anfitrión.

## Corrección (republicación 2026-06-11)

- **Arranque en Mac/Windows** — El empaquetado omitía `lib/**/*.cjs` (`window-open-policy.cjs`, `lan-db-bridge.cjs`); la app fallaba al abrir con *Cannot find module*. Reinstala el instalador de esta republicación (mismo **7.3.2**).

## Nuevo / mejorado

- **Diseño — tokens y elevación** — Escala tipográfica clínica, sombras unificadas, números tabulares en labs/tendencias y presets de movimiento (**Sobrio / Mixto / Expresivo**) en Ajustes.
- **Diseño — overlays de vidrio** — Modales, menús, ⌘K y toasts con tratamiento translúcido; fallback sólido si el blur no es viable (Electron sin GPU).
- **Navegación — fila agrupada** — En expediente ancho: grupos Paciente · Clínico · Resultados · Salida con expansión al hover/foco; fallback automático a tabs en ventana estrecha.
- **Navegación — contexto y modo** — Paciente + cama + diagnóstico siempre visibles; selector segmentado Sala · Interconsulta · Guardia · Pase.
- **Navegación — ⌘K** — Paleta con búsqueda difusa de secciones y pacientes.
- **Superficies premium** — Expediente, laboratorio, sidebar, pase/guardia, manejo, onboarding y Learn Hub alineados al nuevo sistema.
- **Móvil e interno** — Filas agrupadas táctiles, targets ≥44px y tokens compartidos en `/mobile/` e interno iPad.
- **Estado actual — gráficas** — Modal con pestañas (signos, balance, labs); downsampling a 100 puntos con tooltip de serie completa; curvas y canvas de vitals alineados a Tendencias.
- **LAN — purga anfitrión** — Elimina entradas bundle-only huérfanas con guard de propiedad (`audit_log`); el borrado local ya no purga pacientes ajenos en el host.
- **Seguridad** — Allowlist `http(s)://` en ventanas externas; CSP meta en entradas HTML; borrado de claves clínicas en localStorage al cerrar sesión web; puente DB LAN sin `globalThis`.

## Operación en guardia

Instala **7.3.2 en todas** las estaciones del turno el mismo día. Sin cambio de esquema SQLCipher (sigue **v17**). El iPad no requiere actualización obligatoria, pero interno/móvil se benefician del restyle.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v7.3.2

- Mac: `R+-7.3.2-arm64.dmg`, `R+-7.3.2-x64.dmg` (y zip para auto-update).
- Windows: `R+-7.3.2-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).


## [7.3.3](docs/RELEASE_NOTES_7.3.3.txt)

R+ 7.3.3 (EA balance, evacuaciones y dieta)
===============================================

Fecha: 2026-06-11

## Resumen

Parche sobre **7.3.2**: corrige el texto copiado de **balance e I/O** en Estado actual y censo cuando hay egresos parcialmente cuantificados; las **evacuaciones** numéricas dejan de llevar «CC» (son conteo, no volumen); la rejilla de dieta muestra **kcal total** calculadas desde kcal/kg y peso sin pisar valores guardados.

## Nuevo / mejorado

- **Estado actual — balance SOAP** — Si falta el balance del turno pero ingresos y egresos numéricos lo permiten, la cláusula I/O calcula el balance (p. ej. diuresis NC + gastrostomía 120 → **+48 CC**).
- **Estado actual — evacuaciones** — Valores numéricos en nota e historial sin sufijo **CC**; **NC** y variantes siguen normalizadas.
- **Censo — columna I/O** — Balance corto con egresos mixtos (diuresis NC + drenaje numérico); evacuaciones numéricas sin **CC** en PDF y listados.
- **Estado actual — dieta** — Campo **Kcal total** refleja kcal/kg × peso en pantalla; solo persiste al editar kcal/kg o el total manualmente.

## Operación en guardia

Instala **7.3.3 en todas** las estaciones del turno el mismo día. Sin cambio de esquema SQLCipher (sigue **v17**). El iPad no requiere actualización.

## Instalación

Descarga desde: https://github.com/mausalas99/r-mas/releases/tag/v7.3.3

- Mac: `R+-7.3.3-arm64.dmg`, `R+-7.3.3-x64.dmg` (y zip para auto-update).
- Windows: `R+-7.3.3-x64.exe`.

Tras el build local: `npm run build:mac` / `npm run build:win` (incluye write-release-yml.js).

