/**
 * «Guía» / «Nuevo» hints: a short flow of bubbles next to the real controls.
 * The first unfinished hint whose first target is on screen opens by itself.
 * Action steps wait for the user's own click; a click on any step target
 * moves on. No overlay on the hints themselves. × or the last step ends a flow for good.
 * Hints are opt-out: Ajustes → Apariencia, and a one-time choice modal (8.4.5).
 * This replaces the Learn Hub popping open on a fresh install.
 */
import { isGuidedTourRunning } from './tour-guards.mjs';
import { isMobileWeb } from './mobile-web.mjs';
import { FEATURE_HINTS_DONE_LS_KEY, readFeatureHintsEnabled, writeFeatureHintsEnabled } from './clinical-settings.mjs';

/**
 * Step: sel = CSS target, text = bubble HTML, action = wait for a click on the target.
 * kind 'guia' = how to use R+: every user until they finish it, returning users
 * included (8.4.2 is the first release with hints, so everyone gets the Guía once).
 * Default = «Nuevo»: `release` names the version it presents; only the hints of
 * HINTS_RELEASE show. A later release adds its own «Nuevo» hints and bumps
 * HINTS_RELEASE; users who finished the Guía then only see those.
 * Order is priority: only the first unfinished hint on screen opens.
 */
export const HINTS_RELEASE = '8.4.3';

export const FEATURE_HINTS = [
  {
    id: 'g-areas',
    kind: 'guia',
    title: 'Cambiar de área',
    steps: [
      { sel: '.topbar-area-btn', text: 'Este botón muestra el área donde estás. Pasa el cursor o púlsalo para cambiar entre <strong>Paciente</strong>, <strong>Laboratorio</strong>, <strong>Manejo</strong> y <strong>Agenda</strong>. Atajo: teclas <strong>1</strong> a <strong>4</strong>.' },
    ],
  },
  {
    id: 'g-labs',
    kind: 'guia',
    title: 'Pegar laboratorios',
    steps: [
      { sel: '#apptab-lab', action: true, text: 'Empieza aquí: los laboratorios del SOME entran por <strong>Laboratorio</strong>.' },
      { sel: '#lab-bar-more > summary', action: true, text: 'Abre el menú ⋯ y elige <strong>Pegar SOME</strong> para pegar el reporte. Atajo: copia el reporte del SOME y pulsa <strong>⌘V</strong> (Ctrl+V) en cualquier parte de R+, fuera de un campo de texto. R+ lo lleva al paciente correcto.' },
      { sel: '#btn-procesar', action: true, text: 'Pega el reporte tal cual y pulsa <strong>Procesar</strong>. Verás los alterados arriba y la tabla con los valores. Los diagramas se abren con <strong>Diagramas</strong>.' },
    ],
  },
  {
    id: 'g-tendencias',
    kind: 'guia',
    title: 'Tendencias',
    steps: [
      { sel: '#lab-inner-tend-btn', action: true, text: 'Con dos o más laboratorios, <strong>Tendencias</strong> muestra mini-gráficas en el tiempo.' },
      { sel: '#tendencias-container .tend-section-chart-btn', action: true, text: 'Pulsa <strong>Gráfica</strong> en un estudio para ver la tendencia y una tabla copiable.' },
      { sel: '#tend-group-range-row', text: '<strong>Rango</strong>: elige dos fechas para ver solo esos días. <strong>Quitar rango</strong> regresa a todo.' },
      { sel: '#tend-group-panel-charts .tend-group-legend-check', text: 'Quita la marca de un estudio para ocultarlo de la gráfica. El ojo oculta la gráfica completa.' },
      { sel: '#tend-group-modal .tend-group-tab[data-tab="table"]', action: true, text: 'Abre la <strong>Tabla</strong>.' },
      { sel: '#tend-group-table-wrap button[data-field-key]', text: 'Toca el ojo de una fila o una columna para quitarla de la copia. Queda en <strong>Ocultos en copia</strong> para regresarla.' },
      { sel: '#tend-group-panel-table .tend-group-table-actions', text: '<strong>Copiar</strong> la pega como imagen. <strong>Copiar como texto</strong> la pega como tabla editable.' },
    ],
  },
  {
    id: 'g-manejo',
    kind: 'guia',
    title: 'Importar medicamentos',
    steps: [
      { sel: '#med-import-open-btn', text: 'Pulsa <strong>Importar SOME</strong>, pega el bloque del hospital y procesa. Luego marca filas para SOAP o Tratamiento.' },
    ],
  },
  {
    id: 'g-pendientes',
    kind: 'guia',
    title: 'Pendientes',
    steps: [
      { sel: '.todo-toolbar-add-btn', action: true, text: 'Agrega un pendiente del turno.' },
      { sel: '.wb-todo-add-modal', text: 'Escribe el pendiente. Puedes decir quién lo hace y para cuándo.' },
    ],
  },
  {
    id: 'g-buscar',
    kind: 'guia',
    title: 'Buscar',
    steps: [
      { sel: '#btn-header-cmdk', text: 'Busca pacientes y acciones desde aquí. Atajo: <strong>⌘K</strong>.' },
    ],
  },
  {
    id: 'g-sync',
    kind: 'guia',
    title: 'Conexión',
    steps: [
      { sel: '#btn-header-team-sync', text: 'Aquí inicias sesión en R+ Cloud y eliges la sala de tu equipo. Así comparten el censo.' },
    ],
  },
  {
    id: 'g-conexion',
    kind: 'guia',
    title: 'Ventana Conexión',
    steps: [
      { sel: '.cloud-sync-conexion .cloud-sync-conexion-head:has([data-cloud-hero]:not([data-signed-out]))', text: '<strong>Todo al día</strong> quiere decir que tus cambios ya subieron y tu equipo los ve. Si algo falla, aquí lo dice y te da el botón para reintentar.' },
      { sel: '.cloud-sync-conexion .cloud-sync-inset-row--kv:has([data-cloud-room-code])', text: 'Este <strong>Código para invitar</strong> es de tu sala. Compártelo: con él tu equipo se une y ve el mismo censo.' },
      { sel: '.cloud-sync-conexion .cloud-sync-options-row[data-cloud-view="nube"]', text: '<strong>Detalles técnicos</strong>: si algo no sube, aquí ves el estado y las alertas.' },
      // Last: the click leaves this screen. The row says «Equipo y administración» for admins, «Equipo y cuenta» otherwise.
      { sel: '.cloud-sync-conexion .cloud-sync-options-row[data-cloud-action="nav-options"]', action: true, text: 'Toca <strong>Equipo</strong>: tu @usuario, tus equipos y el iPad.' },
    ],
  },
  {
    id: 'g-interconsultas',
    kind: 'guia',
    title: 'Tablero de interconsultas',
    steps: [
      { sel: '.ic-mode-seg', text: '<strong>Asignar</strong> muestra una fila por equipo. <strong>Mi equipo</strong> muestra solo las tarjetas de un equipo, completas.' },
      { sel: '.ic-team-board .ic-row__head', text: 'Cada fila es un equipo. Las tarjetas de ese equipo van dentro.' },
      { sel: '.ic-team-board .ic-row .ic-card', text: 'Arrastra una tarjeta a otra fila para cambiarla de equipo. Tócala para abrir su Resumen.' },
      { sel: '.ic-team-board .ic-tray .ic-row__head', text: '<strong>Por asignar</strong> junta a los que aún no tienen equipo. Arrástralos a una fila.' },
      { sel: '[data-ic-board-refresh]', text: '<strong>Actualizar pacientes</strong> refresca el tablero. <strong>+ Agregar</strong> da de alta a alguien sin esperar un laboratorio.' },
    ],
  },
  {
    id: 'censo-842',
    release: '8.4.2',
    title: 'Censo: columnas y diagramas',
    steps: [
      { sel: '#btn-export-censo-header', action: true, text: 'El censo ahora te deja elegir columnas y ver los labs como diagramas. Ábrelo aquí.' },
      { sel: '.lab-pref-row:has(#censo-export-diagramas)', text: '<strong>Labs como diagramas</strong> pone en la columna de labs los mismos diagramas de Laboratorio.' },
      { sel: '#censo-export-preview', action: true, text: 'Abre la vista previa.' },
      { sel: '#censo-preview-cols', text: 'Marca o quita columnas. R+ recuerda tu elección para el próximo censo. También puedes editar cualquier celda.' },
    ],
  },
  {
    // Actualizar labs with no portal address opens Ajustes on this field; the
    // hint only shows while it is empty (the placeholder is visible).
    id: 'portal-url-842',
    release: '8.4.2',
    title: 'Dirección del portal',
    steps: [
      { sel: '#settings-lab-portal-url:placeholder-shown', text: 'Pega aquí la dirección del portal de laboratorio: la misma que abres en el navegador para ver los labs. R+ la guarda al salir del campo; luego vuelve a tocar <strong>Actualizar labs</strong>.' },
    ],
  },
  {
    id: 'actualizar-labs-842',
    release: '8.4.2',
    title: 'Actualizar labs',
    steps: [
      { sel: '#patient-dashboard-mount [data-dash-action="actualizar-labs"]', text: '<strong>Actualizar labs</strong> trae del portal los estudios nuevos del paciente. R+ ya no trae la dirección del portal: pégala una vez en <strong>Ajustes → Laboratorio</strong>. Si falta, R+ te lleva ahí.' },
    ],
  },
  {
    id: 'resumen-842',
    release: '8.4.2',
    title: 'Resumen de un vistazo',
    steps: [
      { sel: '#patient-dashboard-mount .ctx-group', text: 'Resumen ahora muestra soporte, dieta, líneas, cultivos y día de antibiótico. Toca un grupo para ir a donde se edita.' },
      { sel: '#patient-dashboard-mount .cult', text: 'Pasa el cursor sobre un cultivo para ver su antibiograma.' },
    ],
  },
  {
    id: 'datos-842',
    release: '8.4.2',
    title: 'Datos',
    steps: [
      { sel: '#btn-exp-datos-open, #patient-dashboard-mount .dash-name', action: true, text: 'Datos tiene un diseño nuevo. Ábrelo aquí.' },
      { sel: '.exp-datos-summary', text: 'Arriba, lo esencial: cama, edad, peso, registro y día de estancia. El <strong>Equipo</strong> se cambia aquí.' },
      { sel: '.exp-datos-tabs', text: '<strong>Censo</strong>, <strong>Cama e ingreso</strong> e <strong>Identidad</strong>: toca uno para verlo. Cada cambio se guarda solo.' },
      { sel: '#patient-censo-meds .exp-datos-line:not(.exp-datos-line--empty)', text: '¿Un medicamento ya no va en el censo? Tócalo y queda tachado. Tócalo otra vez para regresarlo. Solo cambia el censo, no la receta.' },
    ],
  },
  {
    id: 'datos-tachar-843',
    release: '8.4.3',
    title: 'Tachar medicamentos',
    steps: [
      { sel: '#patient-censo-meds .exp-datos-line--toggle', text: 'Toca un medicamento para tacharlo: sale del censo. Tócalo otra vez para regresarlo. La receta no cambia.' },
    ],
  },
  {
    id: 'lab-843',
    release: '8.4.3',
    title: 'Laboratorio: alterados primero',
    steps: [
      { sel: '#lab-altered-chips:not([hidden])', text: 'Los valores alterados salen aquí, uno por estudio. Los críticos van primero y marcados.' },
      { sel: '#lab-bar-more > summary', text: 'Los diagramas se abren desde el menú ⋯, en <strong>Diagramas</strong>. <strong>Pegar SOME</strong> también está ahí. <strong>Actualizar labs</strong> queda a su lado.' },
    ],
  },
  {
    id: 'resumen-843',
    release: '8.4.3',
    title: 'Resumen con tendencias',
    steps: [
      { sel: '#patient-dashboard-mount .draw-cell', text: 'Si un lab alterado cambió, abajo ves su valor anterior y hacia dónde va. Los signos muestran su mínimo y máximo de 24 h. Eventualidades sigue en su pestaña.' },
    ],
  },
  {
    id: 'manejo-843',
    release: '8.4.3',
    title: 'Manejo en grupos',
    steps: [
      { sel: '#med-subview-receta .med-nota-chip', text: 'Cada medicamento ya sale en su grupo. <strong>Nota</strong> lo manda a Estado actual.' },
      { sel: '#med-subview-receta .med-receta-dest-picker', text: '¿Va en otro grupo? Cámbialo aquí.' },
      { sel: '#med-nota-footer .med-nota-actions', text: 'Con los marcados en <strong>Nota</strong>, añádelos a Tratamiento o envíalos a Estado actual.' },
    ],
  },
  {
    id: 'lista-843',
    release: '8.4.3',
    title: 'Tarjetas de la lista',
    steps: [
      { sel: 'aside.patient-sidebar .patient-card-toolbar:not(.patient-card-toolbar--bulk)', text: 'Pasa el cursor por el borde derecho de una tarjeta: ahí salen fijar, archivar y eliminar.' },
    ],
  },
  {
    id: 'cultivos-842',
    release: '8.4.2',
    title: 'Cultivos por sitio',
    steps: [
      { sel: '.cult-site-head', text: 'Los cultivos ahora se agrupan por sitio de la muestra. Los sitios con solo negativos se juntan en <strong>Sin aislamientos</strong>.' },
    ],
  },
  {
    id: 'estado-actual-842',
    release: '8.4.2',
    title: 'Estado actual',
    steps: [
      { sel: '.ea-clinico-med-grid', text: 'Los medicamentos van en dos mitades: agudos a la izquierda, crónicos a la derecha. Una fila por categoría.' },
      { sel: '.ea-soporte-head', text: 'Con alto flujo o ventilación, pasa el cursor sobre <strong>Soporte respiratorio</strong>: ves la gasometría y los cálculos.' },
    ],
  },
  {
    id: 'proximos-842',
    release: '8.4.2',
    title: 'Pendientes próximos',
    steps: [
      { sel: '.todo-group--proximo .todo-group-header', text: 'Los pendientes con fecha en otro día ahora van en <strong>Próximos</strong>, entre Hoy y Sin fecha.' },
    ],
  },
  {
    id: 'sala-archivo-842',
    release: '8.4.2',
    title: 'Archivar desde la tarjeta',
    steps: [
      { sel: '#sala-view-home .sv-card-archive', text: 'Archiva desde la esquina de cada tarjeta.' },
      { sel: '#sala-view-home [data-sv-arch]', text: 'Aquí ves los archivados. Ábrelos, o toca <strong>Restaurar</strong> para regresarlos a sala.' },
      { sel: '#sala-view-home .sv-card:not(.is-archived)', action: true, text: 'Toca una tarjeta para abrir al paciente.' },
    ],
  },
  {
    id: 'agua-iny-842',
    release: '8.4.2',
    title: 'Fármacos en agua inyectable',
    steps: [
      { sel: '.agua-iny-modal .agua-iny-row .rpc-switch', text: 'R+ ahora encuentra fármacos escondidos en órdenes de agua inyectable. Corrige lo que haga falta y apaga los que no quieras agregar.' },
    ],
  },
  {
    id: 'abx-dia-842',
    release: '8.4.2',
    title: 'Día de antibiótico',
    steps: [
      { sel: '.med-receta-dia', action: true, text: 'Toca el día del antibiótico para corregirlo. R+ sigue contando desde ahí.' },
      { sel: '[data-abx-dia-modal] .lab-conflict-modal', text: 'Escribe el día de hoy y guarda. Si SOME trae días que R+ no tiene, te lo pregunta así.' },
    ],
  },
];

const STEP_WAIT_MS = 2500;
const LOST_GRACE_MS = 1500;

let layer = null;
let bubble = null;
let flow = null; // { hint, i, el, lostAt }
const paused = new Map(); // hint id → step the user walked away from

function readDone() {
  try {
    const v = JSON.parse(localStorage.getItem(FEATURE_HINTS_DONE_LS_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function markDone(id) {
  const done = readDone();
  if (done.indexOf(id) >= 0) return;
  done.push(id);
  try {
    localStorage.setItem(FEATURE_HINTS_DONE_LS_KEY, JSON.stringify(done));
  } catch { /* private storage: the hint shows again next start */ }
}

function onScreen(r) {
  return r.width >= 4 && r.height >= 4 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
}

/** Not covered by something else (a modal, a sheet): the point hit lands in el (or in our own layer). */
function uncovered(el, r) {
  const x = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1);
  const y = Math.min(Math.max(r.top + Math.min(r.height / 2, 20), 0), innerHeight - 1);
  const hit = document.elementFromPoint(x, y);
  // A toast goes away by itself: it does not hide the target.
  return !!hit && (el.contains(hit) || layer.contains(hit) || !!hit.closest('.toast-stack'));
}

/** First match that is on screen and not covered. scroll=true brings a step target into view. */
function findVisible(sel, scroll) {
  for (const el of document.querySelectorAll(sel)) {
    if (layer.contains(el)) continue;
    let r = el.getBoundingClientRect();
    // An area tab folded into the top-bar pill: judge the pill, which opens while a tab in it is the target.
    if (el.matches('.topbar-nav .app-tab')) {
      const area = el.closest('.topbar-area');
      const pill = area.getBoundingClientRect();
      if (onScreen(pill) && uncovered(area, pill)) return el;
      continue;
    }
    // Hidden by an inner scroll box (or a sticky bar) counts too, not only the window edge.
    if (scroll && r.width && !(onScreen(r) && uncovered(el, r))) {
      el.scrollIntoView({ block: 'center' });
      r = el.getBoundingClientRect();
    }
    if (onScreen(r) && uncovered(el, r)) return el;
  }
  return null;
}

function badgeOf(hint) {
  return hint.kind === 'guia' ? 'Guía' : 'Nuevo';
}

/** Hints this release offers: every «Guía», plus the «Nuevo» hints of HINTS_RELEASE. */
export function activeHints(hints = FEATURE_HINTS) {
  return hints.filter(function (h) { return h.kind === 'guia' || h.release === HINTS_RELEASE; });
}

/**
 * A guided tour, or the onboarding / «Preparando R+» boot screen that replaces
 * the app while it starts (class set by clinical-onboarding-main.mjs; not
 * imported, to keep that module out of this lazy chunk).
 */
function tourBusy() {
  const dock = document.getElementById('tour-dock');
  return isGuidedTourRunning() || !!(dock && dock.offsetParent) ||
    document.documentElement.classList.contains('clinical-onboarding-active') ||
    !!document.querySelector('.clinical-onboard-boot-loader');
}

function placeBubble() {
  if (!flow || !flow.el) return;
  const r = flow.el.getBoundingClientRect();
  // Target gone or covered for a moment (a view is changing, the «Preparando R+»
  // boot screen): hide at once, never jump to the corner or float over it.
  bubble.style.visibility = flow.el.isConnected && onScreen(r) && !flow.lostAt ? '' : 'hidden';
  const bw = bubble.offsetWidth;
  const bh = bubble.offsetHeight;
  let top = r.bottom + 12;
  if (top + bh > innerHeight - 8) top = Math.max(8, r.top - bh - 12);
  bubble.style.top = top + 'px';
  bubble.style.left = Math.min(Math.max(8, r.left), innerWidth - bw - 8) + 'px';
}

/**
 * No flow open: open the first unfinished hint on screen. A hint the user
 * walked away from comes back at that same step, once its target shows again.
 */
function openNext() {
  if (flow || tourBusy()) return;
  const enabled = readFeatureHintsEnabled();
  if (enabled === null) { openChoice(); return; }
  if (!enabled) return;
  const done = readDone();
  for (const hint of activeHints()) {
    if (done.indexOf(hint.id) >= 0) continue;
    const at = paused.get(hint.id) || 0;
    if (findVisible(hint.steps[at].sel, false)) {
      startFlow(hint, at);
      return;
    }
  }
}

function setTarget(el) {
  if (flow.el) flow.el.classList.remove('fh-target');
  flow.el = el;
  if (el) el.classList.add('fh-target');
}

function renderStep() {
  const step = flow.hint.steps[flow.i];
  const last = flow.i === flow.hint.steps.length - 1;
  bubble.dataset.hint = flow.hint.id;
  bubble.innerHTML =
    '<div class="fh-bubble-head"><span class="fh-bubble-badge">' + badgeOf(flow.hint) + ' · ' + (flow.i + 1) + '/' + flow.hint.steps.length +
    '</span><button type="button" class="fh-close" aria-label="Cerrar">×</button></div>' +
    '<p class="fh-bubble-text">' + step.text + '</p>' +
    (step.action ? '' : '<div class="fh-bubble-foot"><button type="button" class="wb-btn wb-btn-primary fh-next">' + (last ? 'Entendido' : 'Siguiente') + '</button></div>');
  bubble.hidden = false;
  placeBubble();
}

/** Wait for the step target (a modal may still be opening). Missing → skip the step. */
function showStep() {
  const myFlow = flow;
  const step = flow.hint.steps[flow.i];
  const t0 = Date.now();
  bubble.hidden = true;
  (function poll() {
    if (flow !== myFlow) return;
    const el = findVisible(step.sel, true);
    if (el) {
      setTarget(el);
      flow.lostAt = 0;
      renderStep();
    } else if (Date.now() - t0 < STEP_WAIT_MS) {
      setTimeout(poll, 150);
    } else {
      nextStep();
    }
  })();
}

function nextStep() {
  if (!flow) return;
  if (flow.i >= flow.hint.steps.length - 1) {
    endFlow(true);
    return;
  }
  flow.i++;
  showStep();
}

function startFlow(hint, startAt) {
  if (flow) endFlow(false);
  flow = { hint: hint, i: startAt || 0, el: null, lostAt: 0 };
  showStep();
}

/** done=false: the app stepped aside (tour, boot screen), so the hint comes back at this step. */
function endFlow(done) {
  if (!flow) return;
  if (done) markDone(flow.hint.id);
  else paused.set(flow.hint.id, flow.i);
  setTarget(null);
  flow = null;
  bubble.hidden = true;
}

function tick() {
  if (flow && readFeatureHintsEnabled() !== true) endFlow(false); // switched off in Ajustes
  // Busy (tour, boot screen): step aside now; the flow comes back at this step.
  if (flow && tourBusy()) {
    endFlow(false);
    return;
  }
  if (flow && flow.el && !bubble.hidden) {
    const step = flow.hint.steps[flow.i];
    const again = findVisible(step.sel, false);
    if (again) {
      if (again !== flow.el) setTarget(again);
      flow.lostAt = 0;
    } else if (!flow.lostAt) {
      flow.lostAt = Date.now();
    } else if (Date.now() - flow.lostAt > LOST_GRACE_MS) {
      endFlow(true); // the user walked away: do not chase them
      return;
    }
    placeBubble();
  }
  openNext();
}

let choice = null;

function closeChoice() {
  if (choice) choice.remove();
  choice = null;
}

/** Opens Ajustes on the hints switch and rings it, so a user who said no can find it again. */
function showWhereInSettings() {
  void import('./features/settings-help/settings-dropdown.mjs').then(function (mod) {
    mod.ensureSettingsDropdownOpen();
    mod.showSettingsPanel('settings-accordion-appearance');
    // The panel resets its scroll while it opens: scroll and ring after that.
    setTimeout(function () {
      const card = document.getElementById('settings-feature-hints-card');
      if (!card) return;
      card.scrollIntoView({ block: 'center' });
      card.classList.add('fh-where');
      setTimeout(function () { card.classList.remove('fh-where'); }, 8000);
    }, 400);
  });
}

function choiceStep2() {
  choice.querySelector('.fh-choice').innerHTML =
    '<h2 id="fh-choice-title">Pistas desactivadas</h2>' +
    '<p>Puedes activarlas otra vez cuando quieras en:</p>' +
    '<p class="fh-choice-path"><strong>Ajustes → Apariencia → Pistas en pantalla</strong></p>' +
    '<div class="fh-choice-actions">' +
    '<button type="button" class="wb-btn wb-btn-secondary" data-fh-choice="where">Mostrarme dónde</button>' +
    '<button type="button" class="wb-btn wb-btn-primary" data-fh-choice="ok">Entendido</button></div>';
  choice.querySelector('[data-fh-choice="ok"]').focus();
}

/** One-time modal: no × , no Escape, no backdrop click. Closes only when the user picks. */
function openChoice() {
  if (choice) return;
  choice = document.createElement('div');
  choice.className = 'fh-choice-backdrop';
  choice.innerHTML =
    '<div class="fh-choice" role="dialog" aria-modal="true" aria-labelledby="fh-choice-title">' +
    '<h2 id="fh-choice-title">Nuevo: pistas en pantalla</h2>' +
    '<p>R+ puede mostrar pistas junto a los botones, para enseñarte a usar cada área y contarte las novedades.</p>' +
    '<p>Cada pista se cierra con la <strong>×</strong>. Elige si quieres verlas.</p>' +
    '<div class="fh-choice-actions">' +
    '<button type="button" class="wb-btn wb-btn-secondary" data-fh-choice="off">Desactivar pistas</button>' +
    '<button type="button" class="wb-btn wb-btn-primary" data-fh-choice="on">Activar pistas</button></div></div>';
  choice.addEventListener('click', function (e) {
    const b = e.target.closest('[data-fh-choice]');
    if (!b) return;
    const what = b.dataset.fhChoice;
    if (what === 'on') { writeFeatureHintsEnabled(true); closeChoice(); syncHintsSwitch(); }
    else if (what === 'off') { writeFeatureHintsEnabled(false); syncHintsSwitch(); choiceStep2(); }
    else { closeChoice(); if (what === 'where') showWhereInSettings(); }
  });
  choice.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); return; }
    if (e.key !== 'Tab') return;
    const btns = choice.querySelectorAll('button');
    const first = btns[0]; const last = btns[btns.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  document.body.appendChild(choice);
  choice.querySelector('[data-fh-choice="on"]').focus();
}

function syncHintsSwitch() {
  const cb = document.getElementById('settings-feature-hints');
  if (cb) cb.checked = readFeatureHintsEnabled() === true;
}

/** Ajustes switch. */
export function setFeatureHintsEnabled(on) {
  writeFeatureHintsEnabled(!!on);
  if (!on) endFlow(false);
  syncHintsSwitch();
}

/** Help center «Ver pistas de nuevo»: clear the done list, every hint shows again. */
export function resetFeatureHints() {
  try { localStorage.removeItem(FEATURE_HINTS_DONE_LS_KEY); } catch { /* private storage */ }
  writeFeatureHintsEnabled(true);
  syncHintsSwitch();
  endFlow(false);
  paused.clear();
}

export function initFeatureHints() {
  if (layer || typeof document === 'undefined' || isMobileWeb()) return;
  layer = document.createElement('div');
  layer.className = 'fh-layer';
  bubble = document.createElement('div');
  bubble.className = 'fh-bubble';
  bubble.setAttribute('role', 'status');
  bubble.hidden = true;
  layer.appendChild(bubble);
  document.body.appendChild(layer);
  bubble.addEventListener('click', function (e) {
    if (e.target.closest('.fh-close')) endFlow(true);
    else if (e.target.closest('.fh-next')) nextStep();
  });
  // A click on the step target moves on: any copy of it counts (e.g. the
  // archive icon on another card), not only the one the bubble points at.
  document.addEventListener('click', function (e) {
    if (!flow || !flow.el || bubble.hidden || !e.target.closest || layer.contains(e.target)) return;
    if (e.target.closest(flow.hint.steps[flow.i].sel)) setTimeout(nextStep, 0);
  }, true);
  addEventListener('resize', placeBubble);
  addEventListener('scroll', placeBubble, true);
  // chisle: 700 ms poll over a MutationObserver — the app re-renders often; 8 selectors is cheap.
  setInterval(tick, 700);
  // Except the boot / onboarding screen: react on the class flip, not up to 700 ms later.
  new MutationObserver(tick).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  tick();
}
