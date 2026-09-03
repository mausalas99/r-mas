/** Curated release-note highlights by version (data only). Last ~10 releases. */

var RELEASE_NOTES_820 = [
  {
    title: 'Llave de rescate para salas de Nube',
    body:
      'Si se pierde el código de una sala y ningún dispositivo tiene la llave en caché, el <strong>admin</strong> puede recuperarla con su propia llave.',
  },
  {
    title: 'Listas con animación',
    body:
      'Censo y pendientes: las filas nuevas entran con transición y las que se quitan se desvanecen, sin saltos bruscos.',
  },
  {
    title: 'Fusión de pacientes más confiable',
    body:
      'La comparación de signos vitales entre dos registros ahora usa la hora real de guardado, evitando empates que perdían datos.',
  },
];

var RELEASE_NOTES_821 = [
  {
    title: 'Labs ya no se reenvían completos',
    body:
      'Corrige un error que hacía que los labs "pesados" se re-sincronizaran enteros con Nube en cada sync, en vez de solo lo nuevo.',
  },
  {
    title: 'Menos tráfico de Nube',
    body:
      'La cola de sincronización deja de acumular lotes repetidos de labs ya enviados, así que se vacía más rápido.',
  },
];

var RELEASE_NOTES_822 = [
  {
    title: 'Tablero de interconsultas rediseñado',
    body:
      'En modo Interconsultas, la barra lateral se reemplaza por un tablero con 4 equipos (guardia, postguardia, activo x2) y columnas Preop/Nuevas hoy, Pendientes y Under. Un clic en un paciente abre su Resumen a pantalla completa; "← Tablero" o Esc regresa.',
  },
  {
    title: 'Alta rápida desde el tablero',
    body:
      'El botón "+ Agregar" en el tablero de interconsultas da de alta un paciente nuevo sin esperar un laboratorio.',
  },
  {
    title: 'Servicio solicitante y equipo editables',
    body:
      'Desde el Resumen del paciente ahora se puede elegir el servicio solicitante (mismo catálogo por categorías que Interconsultas en sala) y asignar el equipo con un selector rápido, sin salir de la pantalla.',
  },
];

var RELEASE_NOTES_823 = [
  {
    title: 'Instalador Mac firmado y notarizado',
    body:
      'El DMG de 8.2.2 se publicó sin firma de Apple: macOS lo bloqueaba con "R+ no se puede abrir". 8.2.3 corrige el proceso de release para firmar y notarizar el instalador antes de publicarlo.',
  },
  {
    title: 'Verificación de firma antes de publicar',
    body:
      'El release ahora deja el DMG firmado y con el ticket de notarización pegado (stapled), listo para abrir sin advertencias de Gatekeeper.',
  },
];

var RELEASE_NOTES_824 = [
  {
    title: 'R+ Móvil (iPad/Nube) vuelve a funcionar',
    body:
      'El servidor exige que cada dispositivo reporte su versión; la build web de R+ Móvil no tenía forma de reportarla, así que entrar y unirse al turno fallaban en silencio. Ahora la build web incluye su propia versión.',
  },
  {
    title: 'Errores de red visibles en R+ Móvil',
    body:
      'Si Entrar se quedaba pegado por mala conexión, no había ningún aviso. Ahora falla con un mensaje claro a los 15 segundos.',
  },
];

var RELEASE_NOTES_825 = [
  {
    title: 'Antibiograma completo al copiar un cultivo',
    body:
      'El condensado de cultivo cortaba el antibiograma después del encabezado y perdía las líneas de sensibilidad. Ahora copia el <strong>antibiograma completo</strong>.',
  },
  {
    title: 'Cultivo actualizado ya no pierde el antibiograma',
    body:
      'Cuando <strong>Actualizar</strong> vuelve a traer el mismo germen con una hora ligeramente distinta, R+ se queda con la copia más completa en vez de la primera que encuentra.',
  },
  {
    title: 'Reticulocitos en biometría hemática',
    body: 'El valor de <strong>Ret</strong> ahora aparece en el resumen de biometría hemática que se copia.',
  },
  {
    title: 'Borrar un cultivo del historial',
    body:
      'Cada fila de cultivo tiene ahora un botón para quitar solo ese set de labs, sin tener que reimportar todo el historial para corregir una entrada duplicada o mal cargada.',
  },
  {
    title: 'Menos lotes atascados en Nube',
    body:
      'El envío de labs pendientes armaba un lote por paciente sin límite de tamaño; un paciente con muchos labs pendientes podía generar un lote demasiado grande y quedar atorado como <strong>"lote pesado"</strong>. Ahora los lotes tienen un tope y ya no se atascan.',
  },
  {
    title: 'Etiquetas de eventos en Tendencias',
    body:
      'Transfusiones, biopsias y procedimientos ahora aparecen como cajitas abreviadas (2 CE, Plaq, Bx…) directo en la gráfica, en el encabezado de fecha de la tabla y en la leyenda — un bloque por día, con editar/eliminar por chip.',
  },
  {
    title: 'Ocultar columnas y filas de Tendencias vuelve a funcionar',
    body:
      'En instalaciones con mucho historial, el checkbox para ocultar una columna o fila de la tabla no hacía nada. La causa era que el almacenamiento local del navegador se había llenado por completo; R+ ahora libera ese espacio solo al abrir la app, sin ningún paso manual.',
  },
];

var RELEASE_NOTES_826 = [
  {
    title: 'Auto-actualización de Mac reparada',
    body:
      'Las instalaciones que quedaron en <strong>8.1.4 u 8.1.5</strong> no podían actualizarse solas por un cambio interno de identidad de la app. Esta versión sí les llega, y una vez instalada trae la siguiente actualización por sí sola, sin pasos manuales.',
  },
  {
    title: 'Rango de fechas en Tendencias',
    body:
      'Nueva fila <strong>desde/hasta</strong> arriba del modal de grupo para acotar la gráfica y la tabla a un periodo; <strong>Quitar rango</strong> restaura todo.',
  },
  {
    title: 'Agrupar por día en la tabla de Tendencias',
    body:
      'Una casilla nueva fusiona varias tomas del mismo día en una sola columna; si una toma es parcial, conserva los valores de tomas anteriores de ese día. La preferencia se recuerda por paciente y sección.',
  },
  {
    title: 'Gráficas más nítidas',
    body:
      'Las gráficas de Tendencias se dibujan a la resolución real de la pantalla (Retina/4K), las etiquetas de eventos ya no se salen del borde, y el PNG que se copia sale a <strong>3x</strong>.',
  },
  {
    title: 'Hora de glucometría extra con lista',
    body:
      'En Estado Actual, la hora de una glucometría extra se elige de una lista (<strong>04:00, 12:00, 20:00</strong>) en vez de teclearla.',
  },
];

var RELEASE_NOTES_827 = [
  {
    title: 'Identificador de app restaurado',
    body: 'Vuelve a com.rmas.rplusclinical tras el puente 8.2.6.',
  },
  {
    title: 'Publicada como pre-release',
    body: 'Solo el puente 8.2.6 la instala en Macs atoradas; se promueve a Latest tras confirmar el traspaso.',
  },
];

var RELEASE_NOTES_828 = [
  {
    title: 'Cifrado de extremo a extremo en Nube',
    body:
      'Notas, labs, indicaciones y monitoreo se guardan <strong>cifrados</strong> en las salas de Nube. Todas las Macs y PCs del turno deben actualizar a esta versión.',
  },
  {
    title: 'Equipos de la próxima rotación',
    body:
      'R4/Admin arma y publica los equipos del mes siguiente <strong>antes</strong> de que empiece, con vínculo al equipo que reemplazan para heredar pacientes al iniciar.',
  },
  {
    title: 'Autounión anticipada',
    body:
      'Un residente ya puede ver y <strong>unirse</strong> a su equipo de la próxima rotación desde antes, sin esperar la asignación de R4.',
  },
  {
    title: '"Hereda pacientes de" corregido',
    body:
      'En Mis equipos, el selector ya no mostraba solo <strong>Ninguno</strong> — ahora lista toda la sala como en el resto de vistas.',
  },
];

var RELEASE_NOTES_829 = [
  {
    title: 'Copiar labs con formato',
    body:
      'Al copiar labs (panel o "copiar varios días") ahora se pega con <strong>negritas</strong> en Word, Google Docs, etc. Antes solo pegaba texto plano.',
  },
  {
    title: 'Electrolitos urinarios (EU) separados',
    body:
      'Na/K/Cl/Cr en orina ahora forman su propia sección <strong>EU</strong>, en vez de mezclarse dentro de EGO.',
  },
  {
    title: 'Pegado múltiple más tolerante',
    body:
      'Si un bloque pegado mezcla 2 expedientes, ahora solo se excluye ese bloque — el <strong>resto</strong> de los reportes sí se guarda.',
  },
  {
    title: 'Corrección — cambio de sala',
    body:
      'Al cambiar la sala de un usuario, ahora se le <strong>quita</strong> automáticamente del equipo de la sala anterior.',
  },
];

var RELEASE_NOTES_830 = [
  {
    title: 'Corrección — equipo desactualizado en la nube',
    body:
      'Un cambio de equipo que no se pudo guardar por un bloqueo momentáneo de la base local ya no se perdía en silencio — ahora se <strong>reintenta en cada inicio de sesión</strong>.',
  },
  {
    title: 'Corrección — choque al unirse a una sala',
    body:
      'Unirse a una sala nube desde dos dispositivos casi al mismo tiempo ya no muestra un <strong>error de base de datos</strong> en vez de confirmar la membresía.',
  },
  {
    title: 'Recuento celular (líquidos)',
    body:
      'El número de recuento ya no se confunde con la letra del tubo, y <strong>Rec, Linf, Eri</strong> ahora aparecen en las tendencias de líquidos.',
  },
];

/** Fallback when a version has no curated entry (keep aligned with latest stable). */
export var RELEASE_NOTES_HIGHLIGHTS_DEFAULT = RELEASE_NOTES_830;

export var RELEASE_NOTES_HIGHLIGHTS = {
  '8.3.0': RELEASE_NOTES_830,
  '8.2.9': RELEASE_NOTES_829,
  '8.2.8': RELEASE_NOTES_828,
  '8.2.7': RELEASE_NOTES_827,
  '8.2.6': RELEASE_NOTES_826,
  '8.2.5': RELEASE_NOTES_825,
  '8.2.4': RELEASE_NOTES_824,
  '8.2.3': RELEASE_NOTES_823,
  '8.2.2': RELEASE_NOTES_822,
  '8.2.1': RELEASE_NOTES_821,
  '8.2.0': RELEASE_NOTES_820,
};
