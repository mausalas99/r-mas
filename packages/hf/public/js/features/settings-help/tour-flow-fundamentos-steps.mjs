/** Fundamentos (sala / interconsulta) tour step copy. */
import { stepRequiresUserAction } from '../../tour-targets.mjs';
import { getUiDensity } from '../chrome.mjs';
import { hideTourDock } from './tour-engine.mjs';
import { tourState } from './tour-state.mjs';

export const MOBILE_SCOPE_COPY =
  'La app móvil (iPad/Safari) muestra el expediente esencial; no incluye Ajustes, exportaciones Word ni todas las pestañas de escritorio.';

export const LIVESYNC_BTN_COPY =
  '<strong>R+ Cloud</strong> (icono <strong>⇄</strong> / Wi‑Fi junto a Ajustes)';

function showNext(nextBtn, label) {
  nextBtn.style.display = '';
  nextBtn.textContent = label || 'Siguiente';
}

function hideNext(nextBtn) {
  nextBtn.style.display = 'none';
}

function finishNext(nextBtn) {
  showNext(nextBtn, 'Finalizar');
  nextBtn.setAttribute('onclick', 'guidedTourFinish()');
}

function getMapTabsCopy() {
  var mod = getPlatformShortcutKey();
  if (getUiDensity() !== 'normal') {
    return (
      '<p style="margin:0;line-height:1.5;">En <strong>Guardia</strong> el centro es un <strong>resumen</strong> del paciente. Pulsa un bloque o usa <strong>' +
      mod +
      '+1…4</strong> para abrir el detalle en vista <strong>Normal</strong> (repite el número para ciclar subvistas).</p>'
    );
  }
  return (
    '<p style="margin:0;line-height:1.5;">Arriba: <strong>Paciente</strong>, <strong>Laboratorio</strong>, <strong>Manejo</strong> y <strong>Agenda</strong>. <strong>' +
    mod +
    '+1…4</strong> cambia de pestaña. <strong>Repite ' +
    mod +
    '+1</strong> cicla Resumen → Clínico → Salida; <strong>repite ' +
    mod +
    '+2</strong> cicla Labs → Tendencias → Cultivos.</p>'
  );
}

function getMapLabTeaserCopy() {
  if (tourState.guidedTourBranch === 'interconsulta') {
    return (
      '<p style="margin:0;line-height:1.5;">El cuadro ya trae <strong>DEMO PÉREZ</strong> (dos días) y <strong>DEMO GARCÍA</strong> con el separador <strong>--- PACIENTE ---</strong>. Revisa el texto detrás y pulsa <strong>Siguiente</strong>.</p>'
    );
  }
  return (
    '<p style="margin:0;line-height:1.5;">El cuadro ya trae <strong>DEMO PÉREZ</strong> (dos días) y <strong>DEMO GARCÍA</strong>. En el siguiente paso pulsa <strong>Procesar</strong>: verás la <strong>vista previa multi-paciente</strong> y podrás dar de alta a cada uno en el censo.</p>'
  );
}

function getIcExportsDesktopLine() {
  if (!window.electronAPI || typeof window.electronAPI.getAppVersion !== 'function') return '';
  return (
    '<p style="margin:10px 0 0;font-size:12px;color:var(--text-muted);">Escritorio: <strong>⇄</strong> junto a Ajustes abre R+ Cloud; respaldos locales en <strong>Respaldos, sync y recuperación</strong>.</p>'
  );
}

function getPlatformShortcutKey() {
  return navigator.platform && /Mac/i.test(navigator.platform) ? '⌘' : 'Ctrl';
}

function renderMapSidebar(bodyEl, nextBtn) {
  bodyEl.innerHTML =
    '<p style="margin:0;line-height:1.5;">La <strong>columna izquierda</strong> es tu censo del turno: eliges al paciente activo aquí. En este tour <strong>no hay pacientes precargados</strong>; los darás de alta en los siguientes pasos.</p>';
  showNext(nextBtn);
}

function renderMapAddPatient(bodyEl, nextBtn) {
  bodyEl.innerHTML =
    '<p style="margin:0;line-height:1.5;"><strong>+ Agregar</strong> da de alta al censo. También puedes agregar desde un laboratorio procesado. Nombre y registro bastan para empezar; cuarto, cama y servicio cierran el censo.</p>';
  showNext(nextBtn);
}

function renderMapIncomplete(bodyEl, nextBtn) {
  bodyEl.innerHTML =
    '<p style="margin:0;line-height:1.5;">Sin <strong>cuarto</strong>, <strong>cama</strong> o <strong>servicio</strong> la tarjeta queda <strong>incompleta</strong>. Completa esos campos aquí (o al tocar la tarjeta marcada). Con <strong>R+ Cloud</strong> el alta se comparte con el equipo.</p>';
  showNext(nextBtn);
}

function renderMapTabs(bodyEl, nextBtn) {
  bodyEl.innerHTML = getMapTabsCopy();
  showNext(nextBtn);
}

function renderMapLabTeaser(bodyEl, nextBtn) {
  bodyEl.innerHTML = getMapLabTeaserCopy();
  showNext(nextBtn);
}

function renderLabParse(bodyEl, nextBtn) {
  bodyEl.innerHTML =
    '<p style="margin:0;line-height:1.5;">Pulsa <strong>Procesar</strong>: verás la tabla con <strong>dos pacientes</strong> (PÉREZ y GARCÍA). En cada fila sin registrar usa <strong>Agregar paciente</strong>; el modal trae <strong>servicio</strong> y, en el tour, <strong>cuarto y cama</strong> sugeridos (revisa y ajusta si hace falta).</p>' +
    '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">No hay <strong>Siguiente</strong> hasta que ambos tengan laboratorio en historial.</p>';
  hideNext(nextBtn);
}

function renderLabView(bodyEl, nextBtn) {
  bodyEl.innerHTML =
    '<p style="margin:0;line-height:1.5;">Revisa diagramas y tabla. En <strong>Laboratorio → Labs</strong>, el menú <strong>⋯</strong> incluye <strong>Consolidar</strong> para juntar envíos del mismo día (mismo tipo de dato).</p>' +
    '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Pulsa <strong>Siguiente</strong> para continuar el tour.</p>';
  showNext(nextBtn);
}

function renderIcExpedienteTabs(bodyEl, nextBtn) {
  var mod = getPlatformShortcutKey();
  bodyEl.innerHTML =
    '<p style="margin:0;line-height:1.5;">En <strong>Consulta Externa</strong>, <strong>Paciente</strong> abre en <strong>Resumen</strong>. Grupo <strong>Clínico</strong>: <strong>Consulta IC</strong>, la nota de seguimiento de insuficiencia cardiaca. Labs, tendencias y cultivos viven en <strong>Laboratorio</strong>.</p>' +
    '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Atajos: <strong>' +
    mod +
    '+1</strong> cicla grupos.</p>';
  showNext(nextBtn);
}

function renderSalaExpedienteTabs(bodyEl, nextBtn) {
  var mod = getPlatformShortcutKey();
  bodyEl.innerHTML =
    '<p style="margin:0;line-height:1.5;">En <strong>Sala</strong>, <strong>Paciente</strong> abre en <strong>Resumen</strong>. Grupos: <strong>Resumen</strong>, <strong>Clínico</strong> y <strong>Salida</strong>. Labs, tendencias y cultivos viven en <strong>Laboratorio</strong>.</p>' +
    '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);"><strong>Clínico</strong>: <strong>Estado actual</strong> → Eventualidades. Atajos: <strong>' +
    mod +
    '+1</strong> cicla grupos · <strong>E</strong> EA/Eventualidades · <strong>T</strong> tendencias/cultivos.</p>';
  showNext(nextBtn);
}

function renderConsultaIc(bodyEl, nextBtn) {
  bodyEl.innerHTML =
    '<p style="margin:0;line-height:1.5;"><strong>Consulta IC</strong> es la nota de seguimiento ambulatorio de insuficiencia cardiaca: fase de seguimiento, comorbilidades, estudios, NYHA, VExUS, congestión y ritmo, en un asistente por secciones.</p>' +
    '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Revisa el ejemplo precargado y pulsa <strong>Siguiente</strong>.</p>';
  showNext(nextBtn);
}

function renderIcExports(bodyEl, nextBtn) {
  bodyEl.innerHTML =
    '<p style="margin:0;line-height:1.5;">En <strong>Ajustes (⚙)</strong>: carpeta de documentos, formato de <strong>salida rápida</strong>, respaldos y sync. En <strong>Laboratorio → duplicados</strong> puedes revisar todos los pacientes.</p>' +
    getIcExportsDesktopLine();
  showNext(nextBtn);
}

function renderSalaTend(bodyEl, nextBtn) {
  bodyEl.innerHTML =
    '<p style="margin:0;line-height:1.5;">En <strong>Laboratorio → Tendencias</strong> ves mini-gráficas cuando hay varios laboratorios en el tiempo.</p>';
  showNext(nextBtn);
}

function renderSalaTendChart(bodyEl, nextBtn) {
  bodyEl.innerHTML =
    '<p style="margin:0;line-height:1.5;">Pulsa <strong>Gráfica</strong> en un estudio (p. ej. biometría) para ver tendencias agrupadas y una tabla copiable.</p>' +
    '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Cierra con clic fuera de la ventana o <strong>Esc</strong>. Es opcional en el demo: <strong>Siguiente</strong> para continuar.</p>';
  showNext(nextBtn);
}

function renderSalaMed(bodyEl, nextBtn) {
  var mod = getPlatformShortcutKey();
  bodyEl.innerHTML =
    '<p style="margin:0;line-height:1.5;">Pulsa <strong>Importar SOME</strong>, pega el bloque TSV del hospital y procesa la receta. Marca filas para <strong>SOAP</strong> o <strong>Tratamiento</strong>; el demo ya trae dos fármacos de ejemplo.</p>' +
    '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Atajos: <strong>' +
    mod +
    '+3</strong> cicla Manejo ↔ Perfil · <strong>' +
    mod +
    '+Shift+3</strong> alterna texto Completo / Nombre+Día.</p>';
  showNext(nextBtn);
}

function renderProfile(bodyEl, nextBtn) {
  bodyEl.innerHTML =
    '<p style="margin:0;line-height:1.5;"><strong>Mi Perfil</strong> (nombre arriba): médico, plantillas y valores por defecto. <strong>Ajustes</strong>: carpeta, tema, respaldos y ayuda. <strong>Siguiente</strong>: sincronización en equipo (⇄) y versión móvil.</p>';
  showNext(nextBtn);
}

function renderServicioDefault(bodyEl, nextBtn) {
  bodyEl.innerHTML =
    '<p style="margin:0;line-height:1.5;">Escribe tu <strong>Servicio (Sala)</strong> en Mi Perfil (nombre completo, sin abreviaturas) y sal del campo para guardar. Luego <strong>Siguiente</strong>.</p>';
  showNext(nextBtn);
}

function renderEstadoActual(bodyEl, nextBtn) {
  bodyEl.innerHTML =
    '<p style="margin:0;line-height:1.5;">En <strong>Clínico → Estado actual</strong> el <strong>snapshot</strong> resume el turno (SV, glu, I/O, medicamentos) y suma tarjetas cardio: <strong>fenotipo</strong>, <strong>descongestión</strong> y <strong>congestión/POCUS</strong> (VExUS, líneas B). Abajo, las <strong>gráficas</strong> muestran tendencias por familia (hemodinámico, respiratorio, metabólico) con puntos alterados resaltados.</p>' +
    '<p style="margin:10px 0 0;line-height:1.5;">El historial de mediciones y el texto compilado para la nota están en esta misma pestaña. El demo trae tomas de <strong>hoy</strong> (TM, TV, TN).</p>' +
    '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Pulsa <strong>Siguiente</strong> para practicar un <strong>registro manual</strong>.</p>';
  showNext(nextBtn);
}

function renderEstadoActualRegistro(bodyEl, nextBtn) {
  bodyEl.innerHTML =
    '<p style="margin:0;line-height:1.5;">Modal <strong>Registrar medición</strong>: <strong>signos vitales</strong> (varias capas por turno), <strong>glucometrías</strong> y bomba de insulina, <strong>I/O</strong> y evacuaciones, más campos de soporte y dieta.</p>' +
    '<p style="margin:10px 0 0;line-height:1.5;">El ejemplo trae turno matutino precargado. Revisa y pulsa <strong>Registrar</strong>; el tour te guiará por el panel actualizado.</p>' +
    '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Sin <strong>Siguiente</strong> hasta registrar.</p>';
  hideNext(nextBtn);
}

function renderEstadoActualReview(bodyEl, nextBtn) {
  bodyEl.innerHTML =
    '<p style="margin:0;line-height:1.5;">Tras registrar, revisa tres zonas en esta pestaña: el <strong>snapshot</strong> (resumen del turno), las <strong>gráficas</strong> por familia con alertas, y el <strong>historial</strong> con texto compilado para la nota.</p>' +
    '<p style="margin:10px 0 0;line-height:1.5;">En <strong>Sala</strong>, copia ese texto al expediente con el botón flotante o desde el historial. En <strong>Interconsulta</strong> verás <strong>Enviar a nota</strong> en la barra de acciones.</p>' +
    '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Desplázate si hace falta. <strong>Siguiente</strong>: <strong>Eventualidades</strong>.</p>';
  showNext(nextBtn);
}

function renderEventualidades(bodyEl, nextBtn) {
  bodyEl.innerHTML =
    '<p style="margin:0;line-height:1.5;"><strong>Eventualidades</strong> es la línea de tiempo del ingreso: evolución subjetiva y procedimientos por día. El demo trae <strong>tres días</strong> de notas breves.</p>' +
    '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Puedes editar, agregar o borrar entradas. Pulsa <strong>Siguiente</strong>.</p>';
  showNext(nextBtn);
}

function renderEvaluacionInicial(bodyEl, nextBtn) {
  bodyEl.innerHTML =
    '<p style="margin:0;line-height:1.5;"><strong>Clínico → Eval. inicial</strong>: se llena <strong>una vez por hospitalización</strong>, al ingreso. Etiología y fenotipo de la insuficiencia cardiaca, exploración (llenado capilar, edema, Doppler, VExUS), Rx de tórax y medicamentos previos.</p>' +
    '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Revisa el ejemplo precargado y pulsa <strong>Siguiente</strong>.</p>';
  showNext(nextBtn);
}

function renderSalaHojaIc(bodyEl, nextBtn) {
  bodyEl.innerHTML =
    '<p style="margin:0;line-height:1.5;"><strong>Paciente → Salida → Hoja IC</strong>: exporta el seguimiento intrahospitalario a Word con fenotipo, descongestión, congestión/POCUS, medicamentos y labs del día, tal como quedaron en <strong>Estado actual</strong>.</p>' +
    '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">En el tutorial no hace falta exportar; <strong>Siguiente</strong> para la <strong>Agenda</strong>.</p>';
  showNext(nextBtn);
}

function renderSalaAgenda(bodyEl, nextBtn) {
  var mod = getPlatformShortcutKey();
  bodyEl.innerHTML =
    '<p style="margin:0;line-height:1.5;">La pestaña <strong>Agenda</strong> (arriba) concentra <strong>procedimientos programados</strong> del servicio: cirugías, estudios y pendientes del turno, enlazados al paciente cuando aplica.</p>' +
    '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Atajos: <strong>' +
    mod +
    '+4</strong> abre Agenda (repite para semana actual) · <strong>' +
    mod +
    '+[ / ]</strong> semana anterior/siguiente. Con <strong>R+ Cloud</strong> se comparte en la sala.</p>';
  showNext(nextBtn);
}

function renderLivesyncDesktop(bodyEl, nextBtn) {
  bodyEl.innerHTML =
    '<p style="margin:0;line-height:1.5;">' +
    LIVESYNC_BTN_COPY +
    ' abre <strong>Conexión</strong>: inicia sesión en Nube y elige la <strong>sala</strong> de tu equipo. En iPad usa el enlace o QR en <strong>Opciones → iPad / R+ Móvil</strong>.</p>' +
    '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Pulsa el icono ⇄ / Wi‑Fi para abrir el panel; aparece <strong>Siguiente</strong> cuando esté visible.</p>';
  if (stepRequiresUserAction('livesync_desktop')) hideNext(nextBtn);
}

function renderLivesyncMobile(bodyEl, nextBtn) {
  bodyEl.innerHTML =
    '<p style="margin:0;line-height:1.5;">En <strong>⇄ Conexión → Opciones → iPad / R+ Móvil</strong> copia el enlace o escanea el QR. ' +
    MOBILE_SCOPE_COPY +
    '</p>' +
    '<p style="margin:10px 0 0;font-size:13px;color:var(--text-muted);">Inicia sesión con la <strong>misma cuenta R+ Cloud</strong> y la misma sala que en el escritorio.</p>';
  showNext(nextBtn);
}

function renderWrap(bodyEl, nextBtn) {
  bodyEl.innerHTML =
    '<p style="margin:0;line-height:1.5;">Listo. Repite el tutorial desde <strong>Mi Perfil</strong> o <strong>Ajustes</strong>. Para el equipo en vivo usa <strong>R+ Cloud</strong> en ⇄ y, si hace falta, el enlace móvil.</p>';
  finishNext(nextBtn);
}

const FUNDAMENTOS_STEP_HANDLERS = {
  map_sidebar: renderMapSidebar,
  map_tabs: renderMapTabs,
  map_add_patient: renderMapAddPatient,
  map_incomplete: renderMapIncomplete,
  map_lab_teaser: renderMapLabTeaser,
  lab_parse: renderLabParse,
  lab_view: renderLabView,
  ic_expediente_tabs: renderIcExpedienteTabs,
  sala_expediente_tabs: renderSalaExpedienteTabs,
  consulta_ic: renderConsultaIc,
  ic_exports: renderIcExports,
  sala_tend: renderSalaTend,
  sala_tend_chart: renderSalaTendChart,
  sala_med: renderSalaMed,
  profile: renderProfile,
  servicio_default: renderServicioDefault,
  evaluacion_inicial: renderEvaluacionInicial,
  estado_actual: renderEstadoActual,
  estado_actual_registro: renderEstadoActualRegistro,
  estado_actual_review: renderEstadoActualReview,
  eventualidades: renderEventualidades,
  sala_hoja_ic: renderSalaHojaIc,
  sala_agenda: renderSalaAgenda,
  livesync_desktop: renderLivesyncDesktop,
  livesync_mobile: renderLivesyncMobile,
  wrap: renderWrap,
};

function renderFundamentosStep(stepId, bodyEl, nextBtn) {
  var handler = FUNDAMENTOS_STEP_HANDLERS[stepId];
  if (!handler) {
    hideTourDock();
    return;
  }
  handler(bodyEl, nextBtn);
}

export { renderFundamentosStep };
