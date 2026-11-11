/**
 * Tour dock drawing: the step body for Fundamentos (sala / interconsulta) and the quick route, and the
 * step badge. Preact: same DOM the innerHTML strings in tour-flow-fundamentos-steps.mjs and
 * tour-flow-render.mjs made. Which step shows, the Siguiente button and dock placement stay in those
 * modules. Every draw unmounts first, so the DOM is rebuilt from scratch like the old `innerHTML` swap.
 */
import { render } from 'preact';

/** Copy kept as `<strong>` runs in tour-flow-guardia-copy.mjs: drawn as nodes, no HTML string. */
function Rich({ text }) {
  return text.split(/<strong>(.*?)<\/strong>/g).map((part, i) => (i % 2 ? <strong>{part}</strong> : part));
}

const MAIN = 'margin:0;line-height:1.5;';
const GAP = 'margin:10px 0 0;line-height:1.5;';
const NOTE = 'margin:10px 0 0;font-size:13px;color:var(--text-muted);';
const NOTE_SMALL = 'margin:10px 0 0;font-size:12px;color:var(--text-muted);';

const QUICK_ROUTE = {
  map_tabs: () => (
    <p style={MAIN}>Ruta rápida: arriba están <strong>Paciente</strong>, <strong>Laboratorio</strong>, <strong>Manejo</strong> y <strong>Agenda</strong>, en una sola píldora; pasa el cursor para verlas todas. Luego das de alta y procesas labs.</p>
  ),
  map_add_patient: () => (
    <p style={MAIN}><strong>+ Agregar</strong> da de alta. Completa cuarto, cama y servicio para que la tarjeta no quede incompleta. En el siguiente paso procesas labs demo.</p>
  ),
  lab_parse: () => (
    <>
      <p style={MAIN}>Pulsa <strong>Procesar</strong> y agrega ambos pacientes demo al censo.</p>
      <p style={NOTE}>Sin <strong>Siguiente</strong> hasta que ambos tengan laboratorio en historial.</p>
    </>
  ),
  quick_wrap: () => (
    <p style={MAIN}>Listo. Explora más en <strong>Ayuda (?) → Aprender R+</strong>: módulos de guardia o el tutorial completo en <strong>Fundamentos</strong>.</p>
  ),
};

export function QuickRouteBody({ stepId }) {
  return QUICK_ROUTE[stepId]();
}

/** One entry per Fundamentos step id: its copy, given the platform / density / branch the dock is in. */
const STEPS = {
  map_sidebar: () => <p style={MAIN}>La <strong>columna izquierda</strong> es tu censo del turno: eliges al paciente activo aquí. En este tour <strong>no hay pacientes precargados</strong>; los darás de alta en los siguientes pasos.</p>,
  map_tabs: ({ mod, dense }) => dense ? (
    <p style={MAIN}>En <strong>Guardia</strong> el centro es un <strong>resumen</strong> del paciente. Pulsa un bloque o usa <strong>{`${mod}+1…4`}</strong> para abrir el detalle en vista <strong>Normal</strong> (repite el número para ciclar subvistas).</p>
  ) : (
    <p style={MAIN}>Arriba: <strong>Paciente</strong>, <strong>Laboratorio</strong>, <strong>Manejo</strong> y <strong>Agenda</strong>, en una sola píldora que muestra dónde estás; pasa el cursor para ver las demás. <strong>{`${mod}+1…4`}</strong> cambia de pestaña. <strong>{`Repite ${mod}+1`}</strong> cicla Resumen → Clínico → Salida; <strong>{`repite ${mod}+2`}</strong> cicla Labs → Tendencias → Cultivos.</p>
  ),
  map_add_patient: () => <p style={MAIN}><strong>+ Agregar</strong> da de alta al censo. También puedes agregar desde un laboratorio procesado. Nombre y registro bastan para empezar; cuarto, cama y servicio cierran el censo.</p>,
  map_incomplete: () => <p style={MAIN}>Sin <strong>cuarto</strong>, <strong>cama</strong> o <strong>servicio</strong> la tarjeta queda <strong>incompleta</strong>. Completa esos campos aquí (o al tocar la tarjeta marcada). Con <strong>R+ Cloud</strong> el alta se comparte con el equipo.</p>,
  ic_board_map: () => <p style={MAIN}>En Interconsultas no hay barra lateral: este <strong>tablero de equipos</strong> es tu punto de partida. Un carril por equipo — <strong>guardia</strong>, <strong>postguardia</strong> y el resto como <strong>activo</strong> — más un carril <strong>Sin equipo</strong> si hay pacientes sin asignar. Solo el carril de guardia tiene <strong>Preop/Nuevas hoy</strong>; todos tienen <strong>Pendientes</strong> y <strong>Under</strong> por paciente.</p>,
  ic_board_drilldown: () => <p style={MAIN}>Toca una tarjeta para abrir el <strong>Resumen</strong> de ese paciente a pantalla completa. <strong>← Tablero</strong> (o <strong>Esc</strong>) regresa al tablero. Los pacientes llegan al tablero desde un laboratorio procesado, como en los siguientes pasos.</p>,
  ic_board_actions: () => <p style={MAIN}><strong>+ Agregar</strong> da de alta un paciente nuevo sin esperar un laboratorio. <strong>Actualizar labs</strong> trae los labs del tablero. En Mi equipo, solo los de ese equipo. También puedes <strong>arrastrar una tarjeta</strong> de un carril a otro para reasignar el equipo de ese paciente.</p>,
  ic_consult_band: () => <p style={MAIN}>Al abrir un paciente, esta tarjeta trae <strong>Servicio solicitante</strong>, <strong>Motivo</strong>, <strong>Seguimiento</strong> y el <strong>equipo asignado</strong> — todo editable aquí, junto al nombre.</p>,
  map_lab_teaser: ({ interconsulta }) => interconsulta ? (
    <p style={MAIN}>El cuadro ya trae <strong>DEMO PÉREZ</strong> (dos días) y <strong>DEMO GARCÍA</strong> con el separador <strong>--- PACIENTE ---</strong>. Revisa el texto detrás y pulsa <strong>Siguiente</strong>.</p>
  ) : (
    <p style={MAIN}>El cuadro ya trae <strong>DEMO PÉREZ</strong> (dos días) y <strong>DEMO GARCÍA</strong>. En el siguiente paso pulsa <strong>Procesar</strong>: verás la <strong>vista previa multi-paciente</strong> y podrás dar de alta a cada uno en el censo.</p>
  ),
  lab_parse: () => (
    <>
      <p style={MAIN}>Pulsa <strong>Procesar</strong>: verás la tabla con <strong>dos pacientes</strong> (PÉREZ y GARCÍA). En cada fila sin registrar usa <strong>Agregar paciente</strong>; el modal trae <strong>servicio</strong> y, en el tour, <strong>cuarto y cama</strong> sugeridos (revisa y ajusta si hace falta).</p>
      <p style={NOTE}>No hay <strong>Siguiente</strong> hasta que ambos tengan laboratorio en historial.</p>
    </>
  ),
  lab_view: () => (
    <>
      <p style={MAIN}>Revisa diagramas y tabla. En <strong>Laboratorio → Labs</strong>, el menú <strong>⋯</strong> incluye <strong>Consolidar</strong> para juntar envíos del mismo día (mismo tipo de dato).</p>
      <p style={NOTE}>Pulsa <strong>Siguiente</strong> para continuar el tour.</p>
    </>
  ),
  ic_expediente_tabs: ({ mod }) => (
    <>
      <p style={MAIN}>En <strong>Interconsulta</strong>, <strong>Paciente</strong> abre en <strong>Resumen</strong>. Grupos: <strong>Resumen</strong> y <strong>Clínico</strong> (Nota, Indicaciones). Labs, tendencias y cultivos viven en <strong>Laboratorio</strong>.</p>
      <p style={NOTE}>Atajos: <strong>{`${mod}+1`}</strong> cicla grupos · <strong>E/T/D</strong> saltan a EA, tendencias o datos.</p>
    </>
  ),
  sala_expediente_tabs: ({ mod }) => (
    <>
      <p style={MAIN}>En <strong>Sala</strong>, <strong>Paciente</strong> abre en <strong>Resumen</strong>. Grupos: <strong>Resumen</strong>, <strong>Clínico</strong> y <strong>Salida</strong>. Labs, tendencias y cultivos viven en <strong>Laboratorio</strong>.</p>
      <p style={NOTE}><strong>Clínico</strong>: <strong>Estado actual</strong> → Medicamentos → Eventualidades. Atajos: <strong>{`${mod}+1`}</strong> cicla grupos · <strong>E</strong> cicla los tres · <strong>T</strong> tendencias/cultivos.</p>
    </>
  ),
  ic_nota: () => <p style={MAIN}>Genera la <strong>Nota (.docx)</strong> desde el botón correspondiente (motor nativo en Node; no requiere Python). Si el servidor local falla, puedes <strong>Omitir</strong> el tutorial.</p>,
  ic_indica: () => <p style={MAIN}>Exporta las <strong>Indicaciones (.docx)</strong> para entrega o impresión (mismo generador nativo que la Nota).</p>,
  ic_exports: ({ desktop }) => (
    <>
      <p style={MAIN}>En <strong>Ajustes (⚙)</strong>: carpeta de documentos, formato de <strong>salida rápida</strong>, respaldos y sync. En <strong>Laboratorio → duplicados</strong> puedes revisar todos los pacientes.</p>
      {desktop ? <p style={NOTE_SMALL}>Escritorio: <strong>⇄</strong> junto a Ajustes abre R+ Cloud; respaldos locales en <strong>Respaldos, sync y recuperación</strong>.</p> : null}
    </>
  ),
  sala_tend: () => <p style={MAIN}>En <strong>Laboratorio → Tendencias</strong> ves mini-gráficas cuando hay varios laboratorios en el tiempo.</p>,
  sala_tend_chart: () => (
    <>
      <p style={MAIN}>Pulsa <strong>Gráfica</strong> en un estudio (p. ej. biometría) para ver tendencias agrupadas y una tabla copiable.</p>
      <p style={NOTE}>Cierra con clic fuera de la ventana o <strong>Esc</strong>. Es opcional en el demo: <strong>Siguiente</strong> para continuar.</p>
    </>
  ),
  sala_med: ({ mod }) => (
    <>
      <p style={MAIN}>Pulsa <strong>Importar SOME</strong>, pega el bloque TSV del hospital y procesa la receta. Marca filas para <strong>SOAP</strong> o <strong>Tratamiento</strong>; el demo ya trae dos fármacos de ejemplo.</p>
      <p style={NOTE}>Atajos: <strong>{`${mod}+3`}</strong> cicla Manejo ↔ Perfil · <strong>{`${mod}+Shift+3`}</strong> alterna texto Completo / Nombre+Día.</p>
    </>
  ),
  profile: () => <p style={MAIN}><strong>Mi Perfil</strong> (nombre arriba): médico, plantillas y valores por defecto. <strong>Ajustes</strong>: carpeta, tema, respaldos y ayuda. <strong>Siguiente</strong>: sincronización en equipo (⇄) y versión móvil.</p>,
  servicio_default: () => <p style={MAIN}>Escribe tu <strong>Servicio (Sala)</strong> en Mi Perfil (nombre completo, sin abreviaturas) y sal del campo para guardar. Luego <strong>Siguiente</strong>.</p>,
  estado_actual: () => (
    <>
      <p style={MAIN}>En <strong>Clínico → Estado actual</strong> el <strong>snapshot</strong> resume el turno (SV, glu, I/O, medicamentos). Abajo, las <strong>gráficas</strong> muestran tendencias por familia (hemodinámico, respiratorio, metabólico) con puntos alterados resaltados.</p>
      <p style={GAP}>El historial de mediciones y el texto compilado para la nota están en esta misma pestaña. El demo trae tomas de <strong>hoy</strong> (TM, TV, TN).</p>
      <p style={NOTE}>Pulsa <strong>Siguiente</strong> para practicar un <strong>registro manual</strong>.</p>
    </>
  ),
  estado_actual_registro: () => (
    <>
      <p style={MAIN}>Modal <strong>Registrar medición</strong>: <strong>signos vitales</strong> (varias capas por turno), <strong>glucometrías</strong> y bomba de insulina, <strong>I/O</strong> y evacuaciones, más campos de soporte y dieta.</p>
      <p style={GAP}>El ejemplo trae turno matutino precargado. Revisa y pulsa <strong>Registrar</strong>; el tour te guiará por el panel actualizado.</p>
      <p style={NOTE}>Sin <strong>Siguiente</strong> hasta registrar.</p>
    </>
  ),
  estado_actual_review: () => (
    <>
      <p style={MAIN}>Tras registrar, revisa tres zonas en esta pestaña: el <strong>snapshot</strong> (resumen del turno), las <strong>gráficas</strong> por familia con alertas, y el <strong>historial</strong> con texto compilado para la nota.</p>
      <p style={GAP}>En <strong>Sala</strong>, copia ese texto al expediente con el botón flotante o desde el historial. En <strong>Interconsulta</strong> verás <strong>Enviar a nota</strong> en la barra de acciones.</p>
      <p style={NOTE}>Desplázate si hace falta. <strong>Siguiente</strong>: <strong>Eventualidades</strong>.</p>
    </>
  ),
  eventualidades: () => (
    <>
      <p style={MAIN}><strong>Eventualidades</strong> es la línea de tiempo del ingreso: evolución subjetiva y procedimientos por día. El demo trae <strong>tres días</strong> de notas breves.</p>
      <p style={NOTE}>Puedes editar, agregar o borrar entradas. Pulsa <strong>Siguiente</strong>.</p>
    </>
  ),
  listado_problemas: () => (
    <>
      <p style={MAIN}><strong>Paciente → Salida → Listado</strong>: exporta problemas activos e inactivos a Word (título + incisos <strong>A) CLÍNICA</strong>, <strong>B) EXPLORACIÓN</strong>, etc.).</p>
      <p style={NOTE}>El demo trae un ejemplo. Pulsa <strong>Generar Listado</strong> (resaltado) o <strong>Siguiente</strong>.</p>
    </>
  ),
  sala_vpo: () => (
    <>
      <p style={MAIN}><strong>Paciente → Salida → VPO</strong>: documenta escalas de riesgo (ASA, RCRI, Gupta, ARISCAT, Caprini) con el resultado que obtengas en tu calculadora; EKG/Rx editables y texto copiable. Solo en <strong>Sala</strong>.</p>
      <p style={NOTE}>Completa o revisa los campos resaltados y pulsa <strong>Siguiente</strong>.</p>
    </>
  ),
  sala_agenda: ({ mod }) => (
    <>
      <p style={MAIN}>La pestaña <strong>Agenda</strong> (arriba) concentra <strong>procedimientos programados</strong> del servicio: cirugías, estudios y pendientes del turno, enlazados al paciente cuando aplica.</p>
      <p style={NOTE}>Atajos: <strong>{`${mod}+4`}</strong> abre Agenda (repite para semana actual) · <strong>{`${mod}+[ / ]`}</strong> semana anterior/siguiente. Con <strong>R+ Cloud</strong> se comparte en la sala.</p>
    </>
  ),
  livesync_desktop: ({ livesyncBtn }) => (
    <>
      <p style={MAIN}><Rich text={livesyncBtn} /> abre <strong>Conexión</strong>: inicia sesión en Nube y elige la <strong>sala</strong> de tu equipo. En iPad usa el enlace o QR en <strong>Opciones → iPad / R+ Móvil</strong>.</p>
      <p style={NOTE}>Pulsa el icono ⇄ / Wi‑Fi para abrir el panel; aparece <strong>Siguiente</strong> cuando esté visible.</p>
    </>
  ),
  livesync_mobile: ({ mobileScope }) => (
    <>
      <p style={MAIN}>En <strong>⇄ Conexión → Opciones → iPad / R+ Móvil</strong> copia el enlace o escanea el QR. {mobileScope}</p>
      <p style={NOTE}>Inicia sesión con la <strong>misma cuenta R+ Cloud</strong> y la misma sala que en el escritorio.</p>
    </>
  ),
  wrap: () => <p style={MAIN}>Listo. Repite el tutorial desde <strong>Mi Perfil</strong> o <strong>Ajustes</strong>. Para el equipo en vivo usa <strong>R+ Cloud</strong> en ⇄ y, si hace falta, el enlace móvil.</p>,
};

/**
 * @param {{ stepId: string, mod: string, dense: boolean, interconsulta: boolean, desktop: boolean, livesyncBtn: string, mobileScope: string }} props
 *   mod = shortcut key (⌘ / Ctrl); dense = Guardia density; interconsulta = branch; desktop = Electron app;
 *   livesyncBtn / mobileScope = the shared copy from tour-flow-guardia-copy.mjs.
 */
export function FundamentosBody({ stepId, ...copy }) {
  const step = STEPS[stepId];
  return step ? step(copy) : null;
}

/** @param {{ branch: string, prog: object, idx: number, total: number }} props branch: quick-route | guardia-v7 | sala | interconsulta */
export function TourBadge({ branch, prog, idx, total }) {
  if (branch === 'quick-route') {
    return (
      <>
        <span class="tour-dock-badge-line tour-dock-badge-kicker">Ruta rápida</span>
        <span class="tour-dock-badge-line tour-dock-badge-step">{`Paso ${prog.stepInChapter} de ${prog.chapterSteps}`}</span>
      </>
    );
  }
  if (branch === 'guardia-v7') {
    return (
      <>
        <span class="tour-dock-badge-line tour-dock-badge-kicker">Guardia</span>
        <span class="tour-dock-badge-line tour-dock-badge-module">{`Módulo ${prog.chapterIndex}/5 · ${prog.chapterTitle}`}</span>
        <span class="tour-dock-badge-line tour-dock-badge-step">{`Paso ${prog.stepInChapter} de ${prog.chapterSteps}`}</span>
      </>
    );
  }
  const label = branch === 'interconsulta' ? 'Interconsulta' : 'Sala';
  return (
    <>
      <span class="tour-dock-badge-line tour-dock-badge-module">{`Paso ${idx} de ${total} · ${label}`}</span>
      <span class="tour-dock-badge-line tour-dock-badge-step">{`Cap. ${prog.chapterIndex}/${prog.chapterCount} · ${prog.chapterTitle} · paso ${prog.stepInChapter}/${prog.chapterSteps}`}</span>
    </>
  );
}

function draw(host, vnode) {
  render(null, host);
  host.textContent = '';
  render(vnode, host);
}

export const drawFundamentosBody = (host, props) => draw(host, <FundamentosBody {...props} />);
export const drawQuickRouteBody = (host, stepId) => draw(host, <QuickRouteBody stepId={stepId} />);
export const drawTourBadge = (host, props) => draw(host, <TourBadge {...props} />);
