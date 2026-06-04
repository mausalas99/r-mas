/** Curated release-note highlights by version (data only). */

var RELEASE_NOTES_663 = [
  {
    title: 'Arranque más rápido',
    body:
      'El primer paint carga menos código: <strong>Ajustes</strong>, plataforma y varios módulos clínicos entran con <strong>import()</strong> y <strong>chunks</strong> de esbuild.',
  },
  {
    title: 'Chart.js fiable',
    body:
      'Tendencias y gráficas del expediente vuelven a abrir con <strong>Chart UMD</strong> en el HTML, sin depender de rutas ESM que fallaban al arrancar.',
  },
  {
    title: 'Windows — Configura tu rotación',
    body:
      'Corrige el cartel atascado en «Desbloquea la base…» cuando la base ya estaba abierta: reintento de sesión clínica tras el unlock, mensajes según SQLCipher/argon2 y arranque más robusto.',
  },
  {
    title: 'Sobre 6.6.2 (LAN ward-ready)',
    body:
      'Incluye la línea <strong>6.6.2</strong>: clinical-ops separado del bundle, cola offline con avisos, host con HC desde censo y menos 409 al sincronizar equipos.',
  },
  {
    title: 'Actualiza todo el turno',
    body:
      'Instala <strong>6.6.3 en todas</strong> las Macs y PCs del turno el mismo día. En Windows, permite R+ en el firewall (puerto <strong>3738</strong>) la primera vez en sala ⇄.',
  },
];

var RELEASE_NOTES_665 = [
  {
    title: 'Un anfitrión por turno',
    body:
      'En la misma Wi‑Fi, R+ elige un solo servidor por <strong>rango</strong> (R4/admin) y antigüedad. Si dos Macs eran anfitrión, la de menor rango puede <strong>combinar</strong> datos y clientes con el ganador.',
  },
  {
    title: 'Plug and play + enlace',
    body:
      '<strong>R1–R3</strong> suelen unirse solos al R4 sin pegar nada. En ⇄: <strong>Copiar enlace de invitación</strong> para iPad u otra PC, o <strong>Unirme con enlace</strong> en escritorio si el barrido no alcanzó.',
  },
  {
    title: 'Sin pérdida al ceder',
    body:
      'Al combinar servidores, primero sube el bundle al anfitrión ganador; solo después redirige al equipo. Si falla la subida, sigues como servidor en esta Mac.',
  },
  {
    title: 'Actualiza todo el turno',
    body:
      'Instala <strong>6.6.5 en todas</strong> las Macs y PCs el mismo día. En Windows, permite R+ en el firewall (puerto <strong>3738</strong>) la primera vez en sala ⇄.',
  },
];

/** Fallback when a version has no curated entry (keep aligned with latest stable). */
export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_665;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '6.6.5': RELEASE_NOTES_665,
  '6.6.4': [
    {
      title: 'Enlace ⇄ para iPad',
      body:
        'Copia un enlace <code>/join/req_…</code> para abrir R+ en iPad en la misma red. Para guardia con sala en vivo, preferir <strong>6.6.5</strong>.',
    },
    {
      title: 'Arranque en chunks',
      body:
        'Continúa la mejora de arranque de <strong>6.6.3</strong> (menos código en el primer paint).',
    },
  ],
  '6.6.3': RELEASE_NOTES_663,
  '6.6.2': [
    {
      title: 'LAN ward-ready',
      body:
        '<strong>Clinical-ops</strong> y directorio ya no dependen de subir el bundle completo del turno. La cola offline se drena con avisos claros si algo queda pendiente.',
    },
    {
      title: '⇄ sin errores al sincronizar',
      body:
        'Correcciones al abrir expediente y al fusionar <strong>eventualidades</strong>. El anfitrión sirve historia clínica del censo cuando aún no hay registro <code>hc:</code> dedicado.',
    },
    {
      title: 'Actualiza todo el turno',
      body:
        'Instala <strong>6.6.2 en todas</strong> las Macs y PCs el mismo día. No mezcles <strong>6.6.1</strong> o anterior en la misma guardia.',
    },
  ],
  '6.6.1': [
    {
      title: 'LiveSync más fiable',
      body:
        'El censo y datos de sala se publican por <strong>HTTP</strong> con menos bundles duplicados por Wi‑Fi. La cola offline vive en la <strong>base cifrada</strong> cuando está desbloqueada. Al guardar <strong>@usuario</strong> ya no se corta el WebSocket en vivo.',
    },
    {
      title: '⇄ diagnóstico y anfitrión',
      body:
        'Panel <strong>Estado de sincronización</strong> en ⇄. Puedes <strong>fijar el anfitrión</strong> del turno. Si la sala solo se infiere de Ajustes, R+ pide confirmación antes de unirte.',
    },
    {
      title: 'Actualiza todo el turno',
      body:
        'Instala <strong>6.6.1 en todas</strong> las Macs y PCs del turno el mismo día. No mezcles <strong>6.6.0</strong> y <strong>6.6.1</strong> en la misma guardia — el censo puede no verse en equipos viejos.',
    },
  ],
  '6.6.0': [
    {
      title: '@usuario sin depender de ⇄',
      body:
        'Puedes <strong>registrar @usuario</strong> y guardar tu perfil <strong>sin sala en vivo</strong> si no hay red. Cuando vuelva el Wi‑Fi, abre <strong>⇄</strong>, únete a tu sala y guarda de nuevo para publicar en el directorio del turno.',
    },
    {
      title: 'Directorio LAN e iPad',
      body:
        'Mejoras de <strong>directorio</strong> y sync de perfiles (6.5.9 + cloud). Al <strong>copiar enlace para iPad</strong> se genera un ticket nuevo. En <strong>labs</strong>, copia varios días desde el menú del historial.',
    },
    {
      title: 'Recomendación de turno',
      body:
        'Actualiza <strong>todas</strong> las Macs y PCs del turno a <strong>6.6.0</strong>. En Windows, permite R+ en el firewall (puerto <strong>3738</strong>) la primera vez en sala.',
    },
  ],
  '6.5.9': [
    {
      title: 'Directorio y sync LAN (Mac y Windows)',
      body:
        'El <strong>directorio LAN</strong> muestra usuarios de <strong>todas las salas</strong>, carga sin quedarse en «Cargando…», y al sincronizar ⇄ <strong>no se pierden</strong> los @usuario entre versiones o PCs Windows.',
    },
    {
      title: '@usuario publicado al guardar',
      body:
        'Si ya tienes LAN, debes tener la sala <strong>⇄</strong> activa (o unirte por invitación) <strong>antes</strong> de registrar @usuario. Al guardar perfil, R+ lo <strong>publica al turno</strong> de inmediato — no solo en tu Mac.',
    },
    {
      title: 'Entrega, equipos y Windows',
      body:
        '<strong>Modo Entrega</strong>: plantillas y + procedimiento. <strong>Mi rotación</strong>: eliminar equipo corregido. En <strong>Windows</strong>, todo el turno en 6.5.9 y firewall (3738) la primera vez en sala.',
    },
  ],
  '6.5.8': [
    {
      title: 'Interno móvil (QR de sala)',
      body:
        'Admin/R4 generan un <strong>QR por sala</strong> para que los MIP registren signos y glucometrías en el celular. Los datos llegan a <strong>Estado actual</strong> y al <strong>Modo Guardia</strong> del residente.',
    },
    {
      title: 'Entrega y rollback',
      body:
        '<strong>Modo Entrega</strong> con pendientes estructurados (estudios/procedimientos y plantillas). Si una actualización falla, en <strong>Ajustes → Aplicación</strong> puedes <strong>restaurar una versión estable anterior</strong> sin perder tu base clínica.',
    },
  ],
  '6.5.7': [
    {
      title: 'Sync LAN de equipos',
      body:
        'Al conectar la sala ⇄ se sincronizan <strong>equipos</strong>, <strong>usuarios LAN</strong> y <strong>eventualidades</strong> entre Macs. Compatible con una Mac en 6.5.6 (stubs de usuario hasta el perfil completo).',
    },
    {
      title: 'Eventualidades en vivo',
      body:
        'Las eventualidades de ambas Macs se fusionan por paciente; al guardar una se dispara sync ⇄ además del host REST.',
    },
  ],
  '6.5.6': [
    {
      title: 'Mi rotación',
      body:
        'Equipos por sala, <strong>tu ciclo</strong> en cada equipo (R1/R2), agregar integrantes por usuario LAN e <strong>invitación por código</strong> para la app del Mac (no Safari).',
    },
    {
      title: 'Conflictos de sincronización',
      body:
        'Al refrescar ya no se abre el comparador una y otra vez: el conflicto queda en <strong>Ajustes → LAN</strong>. Si el texto se ve igual, R+ se alinea con la sala; si no, el modal es más claro y ancho.',
    },
  ],
  '6.5.5': [
    {
      title: 'Reparación para 6.5.4',
      body:
        'Si tras actualizar a <strong>6.5.4</strong> ves «native binding» o la base no abre, usa <strong>Ajustes → Reinstalar actualización de reparación (6.5.5)</strong> en canal <strong>Estable</strong>. Tus datos locales se conservan.',
    },
    {
      title: 'Instalador corregido',
      body:
        'Esta versión repite las novedades de 6.5.4 (identidad LAN, equipos, arranque sin contraseña) con el empaquetado nativo completo en Mac Intel y Apple Silicon.',
    },
  ],
  '6.5.4': [
    {
      title: 'Arranque sin contraseña',
      body:
        'R+ ya <strong>no pide contraseña maestra</strong> al abrir. El almacén clínico se abre solo en este equipo. Si antes quedaste atascado en la pantalla de desbloqueo, actualiza a esta versión.',
    },
    {
      title: 'Configura tu rotación',
      body:
        'Al abrir la base verás el asistente en el <strong>centro de la pantalla</strong>: usuario LAN, equipos de tu sala y unirte o crear equipo. También en la barra lateral y en <strong>Mi Perfil</strong> → <strong>Mi rotación</strong>.',
    },
    {
      title: 'Equipos sin “Guardia hoy”',
      body:
        'Los <strong>equipos</strong> son unidades persistentes de sala/ciclo: créalos o únete sin marcar guardia del día en el equipo. Los pacientes se asocian por <strong>coincidencia estructural</strong>.',
    },
    {
      title: 'R4 / Admin: filtros censo',
      body:
        '<strong>R4</strong> y <strong>Admin</strong> ven filtros <strong>Sala / Equipo / Servicio</strong> en la barra lateral (colapsables). <strong>R1–R3</strong> no ven ese bloque; su lista sigue el alcance clínico.',
    },
  ],
  '5.6.3': [
    {
      title: 'Laboratorio y pacientes',
      body:
        'Al cambiar de paciente el laboratorio se limpia y el historial se expande. Orden de tarjetas por <strong>arrastre</strong> (SortableJS) y vista de ronda más compacta.',
    },
    {
      title: 'Modo Pase y receta',
      body:
        'Vista <strong>Pase</strong> con agenda y pendientes en fila; dosis de medicación solo antes de <code>//</code>; chips compactos en UI grandes.',
    },
    {
      title: 'Actualizaciones',
      body:
        'Canal <strong>Estable</strong> por defecto; pre-releases solo si lo activas en Ajustes.',
    },
  ],
  '6.5.2': [
    {
      title: 'Recuperación de contraseña',
      body:
        'Si olvidas tu contraseña maestra, haz clic en <strong>¿Olvidaste tu contraseña?</strong> en la pantalla de desbloqueo e ingresa el <strong>código de recuperación</strong> que R+ te mostró al configurar la base (es único de esta instalación).',
    },
    {
      title: 'Llave de respaldo automática',
      body:
        'Cada vez que desbloqueas la base, se guarda automáticamente una copia cifrada (AES-256-GCM) de tu llave; no requiere configuración manual.',
    },
    {
      title: 'Modo Guardia (prototipo)',
      body:
        'El <strong>Modo Guardia</strong> está en desarrollo y <strong>aún no funciona</strong> para uso clínico real. Es un prototipo funcional. No lo uses para decisiones clínicas.',
    },
  ],
  '6.5.1': [
    {
      title: 'Perfil farmacoterapéutico',
      body:
        'En <strong>Medicamentos → Perfil histórico</strong>: calendario mensual SOME, marcas <strong>no administrado</strong>, adherencia por fila y merge desde <strong>Receta</strong>.',
    },
    {
      title: 'Datos clínicos cifrados',
      body:
        'En escritorio, pacientes y expediente viven en una base <strong>SQLCipher</strong> con contraseña maestra; migración automática la primera vez que desbloqueas.',
    },
    {
      title: 'Auditoría y respaldos',
      body:
        '<strong>Verificar cadena</strong> de integridad en Ajustes; export/import del almacén cifrado desde <strong>Respaldos, sync y recuperación</strong>.',
    },
    {
      title: 'Sala en vivo',
      body:
        'El perfil se sincroniza en <strong>⇄</strong>; <strong>borradores de conflicto</strong> en el panel LAN hasta resolver cambios simultáneos.',
    },
  ],
  '6.5.0': [
    {
      title: 'Historia Clínica (Sala)',
      body:
        'Formulario institucional en <strong>3 pasos</strong> con catálogos APP, AHF e IPAS; vista <strong>Lectura</strong> con narrativa compilada; ancla de labs de ingreso y sync en <strong>⇄</strong>.',
    },
    {
      title: 'Eventualidades y Clínico reorganizado',
      body:
        'En <strong>Sala</strong>, <strong>Clínico</strong> agrupa <strong>Historia Clínica → Estado actual → Eventualidades → Manejo</strong>. Bitácora clínica por día en <strong>Eventualidades</strong>.',
    },
    {
      title: 'Word sin Python',
      body:
        '<strong>Nota</strong>, <strong>Indicaciones</strong> y <strong>Listado</strong> se generan en Node; el instalador ya no depende de Python para esos <code>.docx</code>.',
    },
    {
      title: 'Sala en vivo más robusta',
      body:
        'Fusión por <strong>versión</strong> de entidad, cola de escritura en el anfitrión y panel de <strong>conflictos</strong> con borrador local hasta resolver.',
    },
  ],
  '6.4.2': [
    {
      title: 'Censo PDF en instalador',
      body:
        'La exportación de <strong>censo PDF</strong> vuelve a incluirse correctamente en el build de escritorio.',
    },
    {
      title: 'Arranque',
      body: 'Corrección menor que impedía abrir la app en algunos instaladores recientes.',
    },
  ],
  '6.4.1': [
    {
      title: 'Misma base que 6.4.0',
      body:
        'VPO, formatos en Nota/Indicaciones, censo PDF y el resto de <strong>6.4.0</strong> sin pantallas nuevas; versión de mantenimiento.',
    },
    {
      title: 'Publicación más segura',
      body:
        '<code>release:publish</code> comprueba tag y release en GitHub antes del build para evitar repetir <strong>6.4.0</strong> por error.',
    },
    {
      title: 'Tests al publicar',
      body: 'Corrección en censo PDF para que la batería de tests pase en Node durante el release.',
    },
  ],
  '6.4.0': [
    {
      title: 'Valoración preoperatoria (VPO)',
      body:
        'Nueva pestaña <strong>VPO</strong> con calculadora ASA, RCRI, Gupta, ARISCAT y Caprini; EKG/Rx editables; fármacos perioperatorios desde la receta SOME y bloques para copiar.',
    },
    {
      title: 'Procedimiento y diagnósticos',
      body:
        'Catálogo <strong>Gupta</strong> con búsqueda; diagnósticos importables desde la nota; botones para tomar labs y signos del expediente sin pisar lo escrito.',
    },
    {
      title: 'Formatos en Nota e Indicaciones',
      body:
        'Desde <strong>Mi Perfil</strong>, edita plantillas en blanco en las pestañas del expediente (misma vista que al atender) y pulsa <strong>Guardar</strong> al final.',
    },
  ],
  '6.3.6': [
    {
      title: 'Cultivos multipaciente',
      body:
        'Varios <strong>MICROORGANISMO</strong> en un informe SOME: <strong>una fila por aislamiento</strong> en Cultivos, con cuenta y antibiograma (R/I/S) por germen.',
    },
    {
      title: 'Preliminar y resistencia',
      body:
        'Cabecera <strong>Preliminar</strong> sin ATB; marcas <strong>BLEE</strong>, <strong>Carb-R</strong> y <strong>BLAC</strong> por aislamiento; alertas en <strong>Manejo → ATB</strong>.',
    },
    {
      title: 'Sala en vivo — anfitrión suplente',
      body:
        'Si el anfitrión cierra R+ o deja de responder, otra <strong>Mac o Windows</strong> con R+ de escritorio (enlace de invitación) asume el servidor hasta que vuelva; el equipo reconecta solo cuando puede.',
    },
  ],
  '6.3.5': [
    {
      title: 'Bomba de insulina (switch)',
      body:
        'Interruptor como en <strong>Vista de laboratorio</strong>: activado solo filas con <strong>unidades</strong>; apagado, glucometrías normales.',
    },
    {
      title: 'Sala en vivo — Unirse',
      body:
        'Corregido <strong>Unirse</strong> en la lista de salas: el botón vuelve a responder al primer clic.',
    },
  ],
  '6.3.4': [
    {
      title: 'Estado Actual — multilectura',
      body:
        'Hasta <strong>4 lecturas</strong> del mismo signo vital en el turno con botón <strong>+1</strong> en T°, TA, FC, FR y SatO₂; hora opcional por lectura.',
    },
    {
      title: 'Bomba de insulina',
      body:
        'Registro opcional de glu + unidades + hora; el texto SOAP incluye <strong>BOMBA DE INSULINA</strong> cuando aplica.',
    },
    {
      title: 'Expediente y Sala en vivo',
      body:
        'Al cambiar de paciente conservas la pestaña (<strong>Estado actual</strong>, Tendencias…). Corregido <strong>Copiar invitación</strong> en ⇄.',
    },
  ],
  '6.3.3': [
    {
      title: 'Guía clínica',
      body:
        '<strong>Manejo</strong> oculto hasta confirmar con la frase del modal; <strong>Nota</strong> e <strong>Indicaciones</strong> siguen en Clínico.',
    },
    {
      title: 'Modales',
      body:
        '<strong>Esc</strong> y clic en el fondo vuelven a cerrar ayuda, laboratorio, perfil, Estado Actual y capas anidadas.',
    },
    {
      title: 'Tendencias y gasometría',
      body:
        'Interpretación extendida con <strong>razonamiento</strong> y tooltips; sparks ligeros; filtro <strong>Solo fuera de rango</strong>.',
    },
  ],
  '6.3.2': [
    {
      title: 'Pegar monitoreo',
      body:
        'En <strong>Estado Actual</strong>, pega T°, FC, TA, DXT, I, E y EVAC; el balance resta todas las salidas en cc (ignora <strong>B:</strong>).',
    },
    {
      title: 'Egresos en el SOAP',
      body:
        'Diuresis, drenajes y nefrostomías se listan por separado en el texto; evacuaciones con <strong>NC</strong> o frase libre.',
    },
    {
      title: 'Receta y pendientes',
      body:
        'Receta hospitalaria por paciente; pendientes <strong>Repo</strong> eliminados o hechos no reaparecen tras reiniciar ni con LiveSync.',
    },
  ],
  '6.3.1': [
    {
      title: 'Cultivos y micobacterias',
      body:
        'Secreción de herida con paréntesis en el nombre, reportes <strong>MYCOBACTERIAS</strong> (baciloscopia + cultivo) y muestra desde <strong>OBSERVACIONES</strong> vuelven a reflejarse bien en <strong>Cultivos</strong>.',
    },
    {
      title: 'Gasometría venosa / mixta',
      body:
        'pH, PCO2 y HCO3 aunque los flags A/B vayan en líneas separadas; la interpretación puede incluir trastorno metabólico concomitante.',
    },
    {
      title: 'Estado Actual',
      body: 'Cuadritos de signos vitales sin artefactos en las esquinas.',
    },
  ],
  '6.3.0': [
    {
      title: 'Sala en vivo más simple',
      body:
        'En Mac: sin pestañas Anfitrión/Cliente; <strong>Activar sala en vivo</strong>, crear o unirse a salas y compartir el enlace. Opción para unirse a la sala de otra computadora.',
    },
    {
      title: 'Reconexión estable',
      body:
        'Corregido el estado <strong>reconectando…</strong> que podía quedarse fijo al reconectar LiveSync en la misma sala.',
    },
    {
      title: 'Sesiones guardadas',
      body: 'Si ya estás en una sala, el botón muestra <strong>En sala</strong> en lugar de <strong>Unirse</strong>.',
    },
  ],
  '6.2.1': [
    {
      title: 'Expediente más fluido',
      body:
        'Menos pausa al cambiar de paciente y al volver a <strong>Estado actual</strong> o <strong>Resultados</strong>. La app carga el frontend en un solo bundle y reutiliza paneles ya pintados.',
    },
    {
      title: 'Ocultar solo Manejo',
      body:
        'En <strong>Mi Perfil → Expediente</strong>, <strong>Ocultar Manejo en Clínico</strong> deja visibles Nota e Indicaciones en Interconsulta; solo quita el segmento Manejo.',
    },
    {
      title: 'Corrección Sala',
      body:
        'En modo Sala, la pestaña <strong>Resultados</strong> ya no muestra el formulario de Nota encima de Tendencias.',
    },
  ],
  '6.2.0': [
    {
      title: 'Estado Actual en Sala',
      body:
        'Nueva pestaña <strong>Estado actual</strong> en el expediente: signos vitales, glucometrías, balance hídrico, historial, gráficas y texto clínico copiable. Botón verde en el encabezado para abrir el panel.',
    },
    {
      title: 'Laboratorio — salida rápida',
      body:
        'En <strong>Vista de laboratorio</strong> (engranaje) puedes activar <strong>Salida rápida</strong> para formatear SOME sin tener al paciente en tu lista.',
    },
    {
      title: 'Expediente más ágil',
      body:
        'Menos lag al cambiar pestañas: carga diferida de Manejo, Tendencias y gráficas; precarga al pasar el mouse y caché al volver a una pestaña ya visitada.',
    },
  ],
  '6.1.0': [
    {
      title: 'Manejo: Infusiones, ATB y CAD/EHH',
      body:
        'Expediente → Clínico → <strong>Manejo</strong> ahora incluye cuatro sub-pestañas. <strong>Infusiones</strong> (vasopresores, sedación y calculadoras), <strong>ATB</strong> (catálogo con sugerencias según cultivos) y <strong>CAD/EHH</strong> (checklist ADA con lectura de laboratorio), además de <strong>Electrolitos</strong>.',
    },
    {
      title: 'ATB asistido',
      body:
        'Filtra por familia o indicación, revisa dosis y ajuste renal desde laboratorios recientes, y copia la indicación SOME sin +Pendiente.',
    },
    {
      title: 'Pestañas clínicas unificadas',
      body:
        'Nota, Indicaciones y las sub-pestañas de Manejo comparten la misma barra subrayada para navegar el expediente con menos fricción.',
    },
  ],
  '6.0.1': [
    {
      title: 'Laboratorio: entrada masiva',
      body:
        'Pega varios reportes SOME en el mismo cuadro. Varios días del mismo paciente van seguidos; entre pacientes distintos usa Separador de paciente. Al procesar pegados masivos, la vista previa muestra pacientes, días y errores antes de guardar.',
    },
    {
      title: 'Receta HU → PDF',
      body:
        'Exportación PDF con plantilla oficial HU 000-061-R-06-12 desde el servidor local de R+.',
    },
    {
      title: 'Tutorial actualizado',
      body:
        'El tour usa dos días de laboratorio de DEMO PÉREZ (alta en el censo al procesar) y explica el separador multi-paciente con ejemplo DEMO GARCÍA.',
    },
  ],
  '6.0.0': [
    {
      title: 'Expediente en 4 pestañas',
      body:
        'Paciente, Clínico, Resultados y Salida — en Sala (Manejo; Salida: Listado + Receta HU) e Interconsulta (Nota, Indicaciones, Manejo + Receta HU). Datos del paciente en bloque colapsable.',
    },
    {
      title: 'Modo Pase sin cambios en el resumen',
      body:
        'El tablero de ronda se ve igual que antes. Al abrir el detalle en pestañas (vista Normal) entras al expediente reorganizado.',
    },
    {
      title: 'Manejo clínico',
      body:
        'Expediente → Clínico → <strong>Manejo</strong>: cuatro sub-pestañas — <strong>Electrolitos</strong> (alteraciones con SOME copiable), <strong>Infusiones</strong> (infusiones y sedación con calculadoras), <strong>ATB</strong> (catálogo con sugerencias según cultivos positivos) y <strong>CAD/EHH</strong> (checklist ADA con lectura de laboratorio). Receta HU exporta PDF oficial; en Sala e Interconsulta está en Expediente → Salida.',
    },
  ],
  '5.2.1': [
    {
      title: 'Interfaz Arc',
      body:
        'Cáscara flotante con esquinas radiales, paneles unificados y rail discreto cuando ocultas la barra de pacientes.',
    },
    {
      title: 'Correcciones UX',
      body:
        'Agenda con un solo panel; pestaña Datos sin perder el foco al escribir; esquinas alineadas con sidebar auto-oculto.',
    },
  ],
  '5.2.0': [
    {
      title: 'Integración Neo',
      body:
        'Envía tablas SOME y tendencias a la app Neo (antes Sesión de Ingreso) con los botones Enviar a Neo.',
    },
    {
      title: 'Tutorial Sala',
      body:
        'El tour señala dónde enviar laboratorio y gráficas; durante el tutorial no se abre Neo.',
    },
  ],
  '5.1.0': [
    {
      title: 'Tablas del reporte SOME',
      body:
        'Tras procesar un SOME, abre el modal desde Resultados: cada departamento en tabla con flags de alerta y secciones plegables.',
    },
    {
      title: 'Copiar TSV o PNG por departamento',
      body:
        'Desde el modal, copia una sección entera al portapapeles como tabla (TSV) o imagen (PNG) para pegar en notas o mensajes.',
    },
    {
      title: 'Parser SOME más fiable',
      body:
        'Mejor lectura de EGO, citoquímico de líquidos y química; menos filas basura. Historial de labs más estable al restaurar respaldos.',
    },
  ],
  '5.0.4': [
    {
      title: 'Historial de labs reparado',
      body:
        'Corrige respaldos con historial mal formado que impedían abrir Laboratorio (error forEach en sets corruptos).',
    },
  ],
  '5.0.3': [
    {
      title: 'Copiar labs en Windows',
      body:
        'Tras procesar un reporte verás Copiar en Resultados y el botón flotante; en Windows queda por encima de la barra de tareas.',
    },
    {
      title: 'Tendencias al estilo SOME',
      body:
        'Las gráficas de BH y química sanguínea siguen el orden del informe; más parámetros de diferencial listos para mostrar.',
    },
  ],
  '5.0.2': [
    {
      title: 'Código más modular',
      body:
        'La app arranca desde un bootstrap liviano; laboratorio, pacientes, Pase y ajustes viven en módulos separados para mantener y probar más fácil.',
    },
    {
      title: 'Pase y pacientes corregidos',
      body:
        'Tras el refactor: selección en la lista, guardado de pacientes y resumen Modo Pase vuelven a mostrarse al elegir un expediente.',
    },
  ],
  '5.0.1': [
    {
      title: 'Diferencial manual y BH legible',
      body:
        'SOME con diferencial manual: Segmentados, bandas y coagulación en salida clara (Dif. / Coag.), sin confundir con biometría automática ni EGO.',
    },
    {
      title: 'Tendencias BH y gráfica fullscreen',
      body:
        'Panel Diferencial manual en gráficas y tablas con nombres del reporte. Modal Gráfica del estudio a pantalla completa.',
    },
    {
      title: 'LiveSync: borrados en la sala',
      body:
        'Al quitar un pendiente o eliminar un paciente en la sala ⇄, el cambio se aplica en todos los equipos conectados.',
    },
  ],
  '3.5.0': [
    {
      title: 'Gráfica y tabla por estudio',
      body:
        'En Tendencias, pulsa «Gráfica» en un estudio (BH, QS, gases…): tendencias agrupadas por panel y tabla copiable (PNG o TSV).',
    },
    {
      title: 'Paneles, títulos y cierre unificado',
      body:
        'Reordena u oculta paneles; edita el título de cada gráfica con un clic. Todas las ventanas se cierran con Esc o clic fuera (sin botones × / Cerrar).',
    },
  ],
  '3.4.1': [
    {
      title: 'Sugerencias clínicas desde laboratorio',
      body:
        'Al procesar labs, R+ puede agregar un pendiente automático si Hb < 7 g/dL (transfusión). Las reposiciones electrolíticas no se agregan solas: usa Manejo → Electrolitos y el botón + Pendiente. Sin duplicar la misma regla el mismo día.',
    },
    {
      title: 'Medicamentos: +1 día (DIA#)',
      body:
        'Botón +1 día en Medicamentos para incrementar el día de tratamiento sin volver a pegar del hospital (todos los ítems con DIA# activos).',
    },
  ],
  '3.4.0': [
    {
      title: 'R+ Móvil (Safari, misma Wi‑Fi)',
      body:
        'Abre el enlace móvil en iPad o teléfono: la misma interfaz R+ que en escritorio (sin generar Word). Sincroniza pacientes, labs, pendientes y agenda por sala LiveSync. Copia el enlace en ⇄ → Copiar enlace móvil.',
    },
    {
      title: 'Tutorial: LiveSync al terminar',
      body:
        'Al completar el recorrido Sala o Interconsulta, el tutorial explica ⇄, salas en vivo y la versión móvil.',
    },
  ],
  '3.3.2': [
    {
      title: 'LAN: código 1234 y expediente en sala',
      body:
        'El código de equipo por defecto es 1234. Al unirte a una sala ⇄ se fusionan pacientes, notas, laboratorios, agenda y pendientes entre el equipo, sin borrar los pacientes que solo existen en tu R+.',
    },
    {
      title: 'Copiar labs (3.3.1)',
      body:
        'Copiar en Resultados vuelve a usar el texto compacto de R+, no el informe crudo de SOME.',
    },
  ],
  '3.3.1': [
    {
      title: 'Copiar labs corregido',
      body:
        'El botón Copiar en Resultados vuelve a copiar el texto compacto de R+ (BH, QS, gases, etc.), no el informe crudo pegado desde SOME con tablas y flags sueltos.',
    },
  ],
  '3.3.0': [
    {
      title: 'LiveSync por sala',
      body:
        'Al unirte a una sala LAN (⇄), la agenda de procedimientos y los pendientes del expediente se comparten en tiempo real con el equipo en esa sala. Al salir se guarda un snapshot local para reconciliar al volver.',
    },
    {
      title: 'Copiar prompt IA (Listado)',
      body:
        'En Listado de problemas, el botón Copiar prompt IA lleva al portapapeles la plantilla para generar el listado activo/inactivo y planes iniciales en un chat externo.',
    },
  ],
  '3.2.2': [
    {
      title: 'Actualizaciones en canal Estable',
      body:
        'Con Estable seleccionado en Ajustes, la app vuelve a detectar releases oficiales en GitHub (incluido salto desde versiones 3.0.x). Al cambiar de canal se busca de nuevo. El aviso Pre-release solo aparece en borradores reales de GitHub.',
    },
    {
      title: 'Laboratorio (BH, Copiar, asteriscos)',
      body:
        'BH compacta sin línea extendida; botón Copiar en Resultados; valores alterados con * al copiar. Ver detalle en notas de 3.2.1 si vienes de 3.2.0.',
    },
  ],
  '3.2.1': [
    {
      title: 'Laboratorio: BH compacta y Copiar visible',
      body:
        'Con BH extendida apagada, la primera línea solo lleva Hb, Hto, VCM, HCM, Leu, Neu, Eos y Plt (más coag si aplica); RBC, CHCM, RDW, MPV y reticulocitos van a la segunda línea solo cuando activas la preferencia. El botón Copiar del encabezado de Resultados vuelve a verse en densidad de interfaz normal.',
    },
    {
      title: 'Alterados con asterisco al copiar',
      body:
        'El texto generado para portapapeles y nota conserva el * en valores fuera de rango. En pantalla el asterisco aparece en rojo junto al valor; se evita copiar el texto “, alterado” al seleccionar los resultados.',
    },
  ],
  '3.2.0': [
    {
      title: 'Interfaz “soft” y rendimiento',
      body:
        'Superficies sólidas (sin vidrio animado pesado para la GPU), sombras más ligeras, lista de pacientes y tarjetas sin desplazamientos costosos al hacer hover; botón principal en degradados solo violeta (--action).',
    },
    {
      title: 'Tutorial: Modo Pase en ambos flujos',
      body:
        'El recorrido guiado para Sala y para Interconsulta incluye el mismo paso de vista Pase (resumen de ronda); después el tour continúa en pestañas completas. Versión estable 3.2.',
    },
  ],
  '3.0.2': [
    {
      title: 'Gasometría e historial',
      body:
        'Delta-delta e interpretación clínica cuando hay datos. Reprocesar desde el historial usando el texto guardado y deduplicación al consolidar entradas muy similares.',
    },
    {
      title: 'Laboratorio al cambiar de paciente',
      body:
        'Se limpian los resultados del paciente anterior, el historial se expande y la vista hace scroll a la tarjeta del paciente seleccionado.',
    },
    {
      title: 'Listado de Problemas (.docx)',
      body:
        'Cada problema va en su propia tabla para evitar cortes entre páginas; el texto largo en a) b) c) se parte en párrafos más cortos con cortes en frases.',
    },
    {
      title: 'Tutorial y Mac',
      body:
        'El panel del tour queda por encima del contenido resaltado en el paso del listado. En Apple Silicon, si no hay Python embebido, se prioriza Homebrew en /opt/homebrew.',
    },
  ],
  '3.0.1': [
    {
      title: 'Procalcitonina (PCT)',
      body:
        'El bloque de Estudios Especiales se procesa: la procalcitonina aparece en QS junto a PCR y se marca cuando excede el límite de adulto (por defecto 0.05 ng/mL). Disponible también como serie en Tendencias.',
    },
    {
      title: 'Listado de Problemas en 8 pt',
      body:
        'El texto dinámico del .docx (fecha, número, descripción) ahora sale en 8 pt para que entren más problemas por hoja sin romper el template.',
    },
  ],
  '3.0.0': [
    {
      title: 'Modos Sala / Interconsulta',
      body:
        'El expediente cambia según tu rol. En Mi Perfil eliges Sala o Interconsulta. Sala oculta Nota e Indicaciones, expone Estado Actual y Listado de Problemas, y usa Servicio (con default configurable) en lugar de Área. Los datos del paciente se editan en la pestaña <strong>Datos</strong> del expediente.',
    },
    {
      title: 'Estado Actual',
      body:
        'En Sala, pestaña <strong>Estado Actual</strong>: vitales estructurados, glu, balance I/O, tendencias y confirmación frente a receta hospitalaria; <strong>Copiar</strong> / <strong>Guardar y copiar</strong>. El botón verde del encabezado sigue abriendo la plantilla sin subjetivo.',
    },
    {
      title: 'Listado de Problemas',
      body:
        'Pestaña nueva con Activos e Inactivos sin límite, drag-and-drop, fechas por problema y generador .docx con numeración a) b) c) de Word, títulos en negritas y firma editable (médicos por defecto se configuran en Mi Perfil).',
    },
    {
      title: 'Anion gap en gasometría',
      body:
        'AG (Na − (Cl + HCO3)) se calcula desde Na y Cl de Química Sanguínea o Electrolitos Séricos; si no hay química, no se muestra. Se marca cuando cae fuera de 8–12 mEq/L.',
    },
    {
      title: 'Calcio ionizado',
      body:
        'El bloque de gases extrae Ca++ ionizado desde Observaciones y lo marca según rango.',
    },
    {
      title: 'Tutorial más actionable',
      body:
        'El tour navega a la zona correcta, resalta el control y espera tu acción antes de avanzar. Dock pequeño y semitransparente en la esquina; clic en la barra colapsada para expandirlo. Aviso preventivo si guardas un paciente sin expediente.',
    },
    {
      title: 'Salida rápida ramificada',
      body:
        'En Sala exporta Listado de Problemas (.docx) si hay datos. En Interconsulta exporta Nota igual que antes.',
    },
  ],
  '2.4.1': [
    {
      title: 'Medicamentos (nombre + día) en formato compacto',
      body:
        'La salida resumida ahora usa formato corto: medicamento, dosis, vía abreviada, frecuencia abreviada y día de uso (por ejemplo: MEROPENEM 2G IV C/8H DIA 2).',
    },
    {
      title: 'Tendencias: hover del último punto',
      body:
        'En la mini-gráfica ampliada ya aparece el tooltip con la fecha y el valor cuando pasas el cursor sobre el último punto de la serie.',
    },
  ],
  '2.4.0': [
    {
      title: 'Sidebar de pacientes renovado',
      body:
        'Nueva organización del listado con Pinned/Fijados, archivado de pacientes y reordenamiento por arrastrar y soltar con animación más fluida.',
    },
    {
      title: 'Interacción y limpieza visual',
      body:
        'Mi Perfil se abre tocando R+ en el encabezado. Se simplificaron acciones de cada tarjeta para un layout más limpio y se ajustaron scrollbars translúcidos sin barras horizontales innecesarias en el sidebar.',
    },
    {
      title: 'Nuevos parsers de laboratorio',
      body:
        'R+ ahora procesa Fisicoquímico de heces y Frotis de sangre periférica para que esos resultados se integren al flujo clínico.',
    },
  ],
  '2.3.1': [
    {
      title: 'Tendencias y cultivos',
      body:
        'El panel de tendencias solo incluye analitos de laboratorio convencional (biometría, química, electrolitos, etc.). Los bloques de urocultivo, hemocultivo y similares dejan de aparecer como gráficas; siguen en la pestaña Cultivos del expediente.',
    },
  ],
  '2.3.0': [
    {
      title: 'Tendencias por tipo de estudio',
      body:
        'Las gráficas se agrupan por sección (biometría, química, gases, LCR, etc.) y puedes colapsar cada bloque. El mismo analito no se mezcla entre paneles distintos (por ejemplo hematocrito de biometría frente al de gasometría).',
    },
    {
      title: 'Catálogo amplio y series ocultas',
      body:
        'Más analitos en tendencias; puedes ocultar cada gráfica con el ícono del ojo. Los ocultos aparecen en una barra con chips, «Mostrar todos» y la barra se puede colapsar (se recuerda tu preferencia).',
    },
    {
      title: 'Gasometría',
      body:
        'Si el bloque de gases incluye hematocrito, también se extrae para tendencias en esa sección.',
    },
  ],
  '2.2.1': [
    {
      title: 'Tutorial y ayuda al día',
      body:
        'El recorrido Sala / Interconsulta incluye un paso de <strong>Modo Pase</strong> (resumen de ronda) en ambos flujos; el modal inicial y el tour explican Sincronizar y Consolidar en el historial, la pestaña Cultivos, tendencias y duplicados en Ajustes → Laboratorio. El mini-tour de Laboratorio incluye un paso sobre el historial.',
    },
    {
      title: 'Consolidar, más claro',
      body:
        'El mensaje de confirmación y el tooltip del botón Consolidar describen en lenguaje sencillo cuándo se fusionan envíos del mismo día (solo laboratorio o solo cultivos) y qué pasa con los conjuntos mixtos.',
    },
  ],
  '2.2.0': [
    {
      title: 'Pestaña Cultivos en el expediente',
      body:
        'Tabla con hemocultivo, urocultivo, catéter, Gram y fungicultivo: agrupada por tipo y ordenada del más reciente al más antiguo; arriba un resumen de cultivos negativos.',
    },
    {
      title: 'Historial y tendencias',
      body:
        'Consolidar estudios del mismo día (solo labs o solo cultivos), mejor clasificación de bloques de cultivo, tendencias sin puntos duplicados y fechas al copiar labs.',
    },
  ],
  '2.1.2': [
    {
      title: 'Duplicados en historial de labs',
      body:
        'Sincronizar desde Laboratorio o revisar todos los pacientes en Ajustes → Laboratorio; se quitan entradas repetidas y se mantiene la copia más antigua.',
    },
    {
      title: 'Expediente al pegar el reporte',
      body:
        'Si el texto trae un registro que coincide con otro paciente, R+ cambia a ese paciente. Si el registro no está en la lista, no se guarda el lab en el historial del activo por error.',
    },
  ],
  '2.1.1': [
    {
      title: 'Cultivos polimicrobianos',
      body:
        'Cuando el informe lista varios microorganismos (urocultivo u otros), cada aislamiento se resume con su antibiograma y su cuenta UFC.',
    },
  ],
  '2.1.0': [
    {
      title: 'Cultivos y antibiograma',
      body:
        'Tipo de cultivo y muestra en el resumen; marcas de resistencia (BLEE, carbapenemasas, etc.); antibiograma compacto solo con R, I y ESBL.',
    },
    {
      title: 'Citoquímico de líquidos',
      body:
        'Se procesa el bloque de líquidos corporales (Liq:) sin mezclar esos valores con la química de suero.',
    },
    {
      title: 'Barra lateral',
      body:
        'La lista de pacientes hace scroll por dentro; Mi Perfil y Guardar perfil siguen al alcance.',
    },
  ],
  '2.0.1': [
    {
      title: 'Modal de actualización',
      body:
        'Las notas de la nueva versión se muestran como texto legible dentro de la app, sin etiquetas HTML visibles.',
    },
  ],
  '2.0.0': [
    {
      title: 'Medicamentos y plantilla SOAP',
      body:
        'Nueva pestaña Medicamentos: importa la receta en TSV, copia desde SOME, vuelca a tratamiento o a la plantilla SOAP. Catálogo de clasificación exportable e importable desde Ajustes.',
    },
    {
      title: 'Ajustes y recuperación de datos',
      body:
        'Panel en secciones plegables, centro de ayuda arriba, scroll corregido. Deshacer usa copia en memoria fiable; respaldo automático antes de importar todo, restaurable desde Respaldos.',
    },
    {
      title: 'Laboratorio y tutorial',
      body:
        'Mejoras en historial de laboratorio y recorridos Sala e Interconsulta, con guías más claras en el centro de ayuda.',
    },
  ],
};
