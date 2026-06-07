/**
 * Modo Guardia — full census dashboard (separate from Pase, Sala, Interconsulta).
 */
import { storage } from '../storage.js';
import { patients } from '../app-state.mjs';
import { isDbMode } from '../db-storage-bridge.mjs';
import { isGuardiaMode } from './chrome.mjs';
import {
  buildGuardiasMap,
  clinicalSessionContext,
  getClinicalScopeContextForEvaluate,
  mapPatientForGuardiaGrid,
} from '../clinical-access-runtime.mjs';
import { userIsOnGuardiaCallToday } from '../clinico-access.mjs';
import { effectiveClinicalRank, hasElevatedTeamPrivileges } from '../clinical-privileges.mjs';
import { setGuardiaMode, syncGuardiaModeUI, toggleGuardiaMode } from '../guardia-mode-sync.mjs';
import { diagnosticosTextForCenso } from '../patient-diagnosticos.mjs';
import {
  UnifiedPatientGridBoard,
  vitalsBannerForGuardia,
} from './unified-patient-grid-board.mjs';
import { syncGuardiaIncomingStrip, syncGuardiaRotationToolbar } from './clinical-rotation.mjs';
import { wireClinicalTeamsControls } from './clinical-teams.mjs';
import {
  getEntregaPhase,
  isEntregaPhaseActive,
  loadGuardiaGridViewContext,
  openEntregaModal,
  toggleEntregaPhase,
} from './clinical-entrega.mjs';
import { mergeSalaGuardiaTodayRows } from './guardia-hoy-modal.mjs';
import {
  isEntregaRosterOpen,
  openEntregaRosterPanel,
} from './entrega-roster-panel.mjs';
import {
  ensureElevatedWardCensusOnDevice,
  refreshGuardiaCensusFromDb,
} from '../clinical-access-runtime.mjs';
import { syncGuardiaPhaseBar, teardownGuardiaPhaseBar } from './guardia-phase-bar.mjs';
import { entregaChipMarkerIds } from '../../../lib/entrega/entrega-chip-markers.mjs';
import {
  listActiveProcedimientos,
  normalizePendientesJson,
} from '../../../lib/entrega/entrega-pendientes.mjs';
import { isGuardiaChipCritical } from '../../../lib/entrega/guardia-chip-critical.mjs';
import { renderGuardiaVitalsFeed } from './guardia-vitals-feed.mjs';
import { isTurnoActivo, deactivateTurnoActivo } from './entrega-roster-panel.mjs';
import { syncOrphanEntregasStrip } from '../guardia-orphan-entregas.mjs';
import {
  openGuardiaPatientActionSheet,
  shouldShowGuardiaPatientActionMenu,
  wireGuardiaPatientActionSheetDismiss,
} from './guardia-patient-action-sheet.mjs';
import { filterPatientsForGuardiaCensus } from './patients-clinical-filter.mjs';
import { elevatedPatientFilters } from './clinical-census-filters-state.mjs';
/** R4 sector grid for R4, Admin, and program admin (full-ward census). */
function resolveGuardiaGridRank(user) {
  if (hasElevatedTeamPrivileges(user)) return 'R4';
  const raw = String(user?.rank || '').trim();
  if (raw === 'R4') return 'R4';
  return effectiveClinicalRank(user);
}

/** @type {UnifiedPatientGridBoard|null} */
let gridBoard = null;
let appShellInstalled = false;
let entregaControlsInstalled = false;
let guardiaViewBootstrapped = false;
let elevatedFullWardPullScheduled = false;

/** @param {Record<string, unknown>|null|undefined} settings */
async function bootstrapGuardiaViewOnEnter(settings) {
  const userId = String(clinicalSessionContext.user?.user_id || '');
  if (!userId) return;

  const teams = clinicalSessionContext.teams || [];
  const rank = effectiveClinicalRank(clinicalSessionContext.user);
  const now = new Date();
  const salaGuardiaToday = mergeSalaGuardiaTodayRows(
    teams,
    clinicalSessionContext.salaGuardiaToday || []
  );
  const onCallReceiver = userIsOnGuardiaCallToday(
    userId,
    rank,
    teams,
    now,
    salaGuardiaToday
  );

  if (onCallReceiver) {
    setGuardiaMode(true, { settings, renderGuardiaBoard, rerenderBoard: true });
  }
}

/** @returns {Record<string, unknown>|null} */
function guardiaBoardSettings() {
  try {
    if (typeof window !== 'undefined' && typeof window.loadSettings === 'function') {
      return window.loadSettings();
    }
  } catch {
    /* ignore */
  }
  return null;
}

let entregaClickBusy = false;

function handleEntregaPhaseButtonClick() {
  if (entregaClickBusy) return;
  entregaClickBusy = true;
  void (async () => {
    try {
      await toggleEntregaPhase({
        settings: guardiaBoardSettings(),
        renderGuardiaBoard,
      });
      syncEntregaPhaseChrome();
    } finally {
      entregaClickBusy = false;
    }
  })();
}

function installGuardiaEntregaControls() {
  if (entregaControlsInstalled || typeof document === 'undefined') return;
  entregaControlsInstalled = true;

  if (typeof window !== 'undefined') {
    window.appShell = window.appShell || {};
    window.appShell.toggleEntregaPhase = handleEntregaPhaseButtonClick;
  }

  syncEntregaPhaseChrome();
}

function installGuardiaAppShell() {
  if (appShellInstalled || typeof window === 'undefined') return;
  appShellInstalled = true;
  wireGuardiaPatientActionSheetDismiss();
  installGuardiaEntregaControls();
  window.appShell = window.appShell || {};
  window.appShell.openEntregaModal = openEntregaModal;
  window.appShell.toggleEntregaPhase = handleEntregaPhaseButtonClick;
  window.addEventListener('guardia:turno-activo', () => {
    renderGuardiaBoard(null);
  });
  window.addEventListener('guardia:entrega-ended', () => {
    syncEntregaPhaseChrome();
    renderGuardiaBoard(null);
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installGuardiaEntregaControls, { once: true });
  } else {
    installGuardiaEntregaControls();
  }
}

function syncEntregaPhaseChrome(opts = {}) {
  const btn = document.getElementById('btn-guardia-entrega-phase');
  const status = document.getElementById('guardia-entrega-phase-status');
  const phase = getEntregaPhase();
  const active = !!phase?.active;
  const rosterOpen = opts.rosterOpen ?? isEntregaRosterOpen();

  if (btn) {
    btn.hidden = !!rosterOpen;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
    btn.textContent = 'Entrega';
    btn.title = active
      ? 'Continuar entrega — listado de pacientes'
      : 'Iniciar entrega al R1 de guardia de tu sala';
  }

  if (status) {
    if (active && phase?.coveringLabel && !rosterOpen) {
      status.hidden = false;
      status.textContent = `Entregando a ${phase.coveringLabel} · pulsa Entrega para abrir el listado`;
    } else {
      status.hidden = true;
      status.textContent = '';
    }
  }
}

/** @param {Record<string, unknown>|null|undefined} _settings */
function wireGuardiaEntregaPhaseButton(_settings) {
  installGuardiaEntregaControls();
  const btn = document.getElementById('btn-guardia-entrega-phase');
  if (!btn || btn._guardiaEntregaWired) return;
  btn._guardiaEntregaWired = true;
  btn.addEventListener('click', () => handleEntregaPhaseButtonClick());
  syncEntregaPhaseChrome();
}

/** @param {string} pid */
function pendingTodoCount(pid) {
  return storage.getTodos(pid).filter((t) => !t.completed).length;
}

/** @param {string} pid */
function labsSnippetForPatient(pid) {
  const history = storage.getLabHistory();
  const rows = Array.isArray(history[pid]) ? history[pid] : [];
  if (!rows.length) return '—';
  const last = rows[rows.length - 1];
  const text = String(last?.text || last?.raw || '').replace(/\s+/g, ' ').trim();
  if (!text) return '—';
  const line = text.split('\n').find((l) => /★|crit|alter|↑|↓/i.test(l)) || text.split('\n')[0] || text;
  return line.slice(0, 48);
}

/**
 * @param {Record<string, unknown>} p
 * @param {Map<string, object>} guardiasMap
 */
function enrichPatientForGuardiaCard(p, guardiasMap) {
  const base = mapPatientForGuardiaGrid(p);
  const g = guardiasMap.get(base.id);
  const dxList = Array.isArray(p.diagnosticosList) ? p.diagnosticosList : [];
  const dxText =
    diagnosticosTextForCenso(dxList, { max: 2 }) ||
    String(p.diagnosticosText || p.motivo || '').trim() ||
    'Sin diagnóstico registrado';
  const pendingCount = g?.pendientes_json
    ? listActiveProcedimientos(normalizePendientesJson(g.pendientes_json)).length
    : 0;
  const isCritical = isGuardiaChipCritical(g);
  const entregaMarkers = g ? entregaChipMarkerIds(g) : [];
  return {
    ...base,
    dxText: dxText.toUpperCase(),
    pendingCount,
    labsSnippet: labsSnippetForPatient(base.id),
    isCritical,
    entregaMarkers,
    guardiaMeta: g,
  };
}

/**
 * @param {Array<ReturnType<typeof enrichPatientForGuardiaCard>>} censusPatients
 * @param {Map<string, object>} guardiasMap
 */
export function computeGuardiaSummary(censusPatients, guardiasMap) {
  let critical = 0;
  let pending = 0;
  let vitalsOverdue = 0;
  let vitalsDueSoon = 0;
  censusPatients.forEach((p) => {
    const meta = guardiasMap.get(p.id) || p.guardiaMeta || {};
    if (p.isCritical) critical += 1;
    pending += p.pendingCount || 0;
    const banner = vitalsBannerForGuardia(meta);
    if (banner.cls === 'breached') vitalsOverdue += 1;
    else if (banner.cls === 'warning') vitalsDueSoon += 1;
  });
  return {
    total: censusPatients.length,
    critical,
    pending,
    vitalsOverdue,
    vitalsDueSoon,
  };
}

/**
 * @param {ReturnType<typeof computeGuardiaSummary>} summary
 * @param {{ turnoActivo?: boolean }} opts
 */
function renderGuardiaSummaryTiles(summary, opts = {}) {
  const host = document.getElementById('guardia-summary');
  if (!host) return;

  const vitalsTitle =
    summary.vitalsOverdue > 0
      ? `${summary.vitalsOverdue} signo${summary.vitalsOverdue === 1 ? '' : 's'} vencido${summary.vitalsOverdue === 1 ? '' : 's'}`
      : summary.vitalsDueSoon > 0
        ? `${summary.vitalsDueSoon} signo${summary.vitalsDueSoon === 1 ? '' : 's'} pronto`
        : 'Signos al día';

  const stats = [
    {
      value: summary.total,
      label: 'censo',
      title: opts.turnoActivo ? 'En censo — turno activo' : 'En censo — tu alcance',
    },
    {
      value: summary.critical,
      label: 'críticos',
      hot: summary.critical > 0,
      title: 'Críticos — revisar primero',
    },
    {
      value: summary.vitalsOverdue || summary.vitalsDueSoon || 0,
      label: 'signos',
      hot: summary.vitalsOverdue > 0,
      warn: !summary.vitalsOverdue && summary.vitalsDueSoon > 0,
      title: vitalsTitle,
    },
    {
      value: summary.pending,
      label: 'estudios',
      title: 'Estudios pendientes de entrega',
    },
  ];

  host.innerHTML = stats
    .map((stat, index) => {
      const classes = ['guardia-stat'];
      if (stat.hot) classes.push('guardia-stat--hot');
      else if (stat.warn) classes.push('guardia-stat--warn');
      const sep =
        index > 0 ? '<span class="guardia-stat-sep" aria-hidden="true">·</span>' : '';
      return `${sep}<div class="${classes.join(' ')}" title="${stat.title}"><span class="guardia-stat-value">${stat.value}</span><span class="guardia-stat-label">${stat.label}</span></div>`;
    })
    .join('');
}

/**
 * @param {number} count
 * @param {{ turnoActivo: boolean, entregaActive: boolean, vitalsOverdue: number, critical: number }} state
 */
function renderGuardiaCensusHead(count, state) {
  const host = document.getElementById('guardia-census-head');
  if (!host) return;

  const parts = [];
  if (state.critical > 0) parts.push(`${state.critical} crítico${state.critical === 1 ? '' : 's'}`);
  if (state.vitalsOverdue > 0) {
    parts.push(`${state.vitalsOverdue} signo${state.vitalsOverdue === 1 ? '' : 's'} vencido${state.vitalsOverdue === 1 ? '' : 's'}`);
  }
  const sortHint = parts.length ? `${parts.join(' · ')} arriba` : 'Sin alertas urgentes';

  host.innerHTML = `
    <div class="guardia-census-head-inner">
      <h2 class="guardia-section-title">Pacientes <span class="guardia-census-count">${count}</span></h2>
      <p class="guardia-section-sub">${sortHint}</p>
    </div>`;
}

function wireGuardiaModeToggle(settings) {
  const btn = document.getElementById('btn-guardia-mode-toggle');
  if (!btn || btn._rpcGuardiaModeWired) return;
  btn._rpcGuardiaModeWired = true;

  syncGuardiaModeUI();

  btn.addEventListener('click', () => {
    toggleGuardiaMode({
      settings,
      renderGuardiaBoard,
    });
  });
}

/**
 * @param {{
 *   turnoActivo: boolean,
 *   entregaActive: boolean,
 *   rosterOpen: boolean,
 *   settings?: Record<string, unknown>|null,
 * }} state
 */
function syncGuardiaBoardChrome(state) {
  const scroll = document.getElementById('guardia-board-scroll');
  if (scroll) {
    scroll.classList.toggle('guardia-board-scroll--turno', state.turnoActivo);
    scroll.classList.toggle('guardia-board-scroll--roster', state.rosterOpen);
  }

  const filterHint = document.getElementById('guardia-census-filter-hint');
  const scopePanel = document.getElementById('guardia-census-scope');
  const vitalsSection = document.getElementById('guardia-vitals-section');
  const metricsPanel = document.getElementById('guardia-metrics-panel');

  if (metricsPanel) metricsPanel.hidden = !!state.rosterOpen;
  if (vitalsSection) vitalsSection.hidden = !state.turnoActivo || !!state.rosterOpen;

  if (filterHint) {
    const elevated = hasElevatedTeamPrivileges(clinicalSessionContext.user);
    const alcanceOn = !!clinicalSessionContext.guardiaMode;
    filterHint.textContent = alcanceOn
      ? 'Solo pacientes que te entregaron en este turno.'
      : elevated
        ? 'Censo completo del servicio — acota con Filtros censo arriba.'
        : state.turnoActivo
          ? 'Todos los pacientes en tu alcance durante el turno.'
          : 'Todos los pacientes en tu alcance clínico.';
    filterHint.classList.toggle('visually-hidden', !elevated && !alcanceOn);
  }
  if (scopePanel) {
    scopePanel.classList.toggle('guardia-census-scope--narrow', !!clinicalSessionContext.guardiaMode);
  }

  syncEntregaPhaseChrome({ rosterOpen: state.rosterOpen });

  syncGuardiaPhaseBar({
    ...state,
    onBeginEntrega: handleEntregaPhaseButtonClick,
  });
}

/**
 * @param {Record<string, unknown>|null|undefined} settings
 */
export function renderGuardiaBoard(settings) {
  if (!isGuardiaMode()) {
    guardiaViewBootstrapped = false;
    teardownGuardiaPhaseBar();
    deactivateTurnoActivo();
    document.documentElement.classList.remove('guardia-entrega-roster-open');
    return;
  }
  installGuardiaAppShell();
  void import('./clinical-rotation-entry.mjs').then((mod) => {
    mod.syncClinicalRotationEntryChrome?.();
  });
  if (!guardiaViewBootstrapped) {
    guardiaViewBootstrapped = true;
    void bootstrapGuardiaViewOnEnter(settings);
    void ensureTeamAssignedPatientsOnDevice({ allowLanPull: true, lanPullDelayMs: 3000 }).then(() => {
      if (isGuardiaMode()) renderGuardiaBoard(settings);
    });
  }
  wireGuardiaEntregaPhaseButton(settings);
  syncEntregaPhaseChrome();

  const root = document.getElementById('appcontent-guardia');
  if (!root || root.getAttribute('aria-hidden') === 'true') return;

  const guardiasMap = clinicalSessionContext.guardiasMap.size
    ? clinicalSessionContext.guardiasMap
    : buildGuardiasMap(clinicalSessionContext.guardias);

  const entregaActive = isEntregaPhaseActive();
  const turnoActivo = isTurnoActivo();
  const rosterOpen = isEntregaRosterOpen();
  const gridViewContext = loadGuardiaGridViewContext();
  wireGuardiaModeToggle(settings);
  syncGuardiaRotationToolbar();
  syncGuardiaBoardChrome({
    turnoActivo,
    entregaActive,
    rosterOpen,
    settings,
    renderGuardiaBoard,
  });

  if (entregaActive && !turnoActivo) {
    const rosterHost = document.getElementById('entrega-roster-panel');
    if (rosterHost && !rosterHost.innerHTML.trim()) {
      openEntregaRosterPanel(settings);
    }
  }

  const now = new Date();
  const salaGuardiaToday = mergeSalaGuardiaTodayRows(
    clinicalSessionContext.teams || [],
    clinicalSessionContext.salaGuardiaToday || []
  );
  const userId = String(clinicalSessionContext.user?.user_id || '');
  const clinicalRank = effectiveClinicalRank(clinicalSessionContext.user);
  const gridRank = resolveGuardiaGridRank(clinicalSessionContext.user);
  const onCallGuardiaReceiver = userIsOnGuardiaCallToday(
    userId,
    clinicalRank,
    clinicalSessionContext.teams || [],
    now,
    salaGuardiaToday
  );

  if (
    hasElevatedTeamPrivileges(clinicalSessionContext.user) &&
    !elevatedPatientFilters.teamId &&
    !elevatedFullWardPullScheduled
  ) {
    elevatedFullWardPullScheduled = true;
    void ensureElevatedWardCensusOnDevice({
      allowLanPull: true,
      lanPullDelayMs: 3000,
      teamFilterId: '',
    });
  }

  const baseScope = getClinicalScopeContextForEvaluate();
  clinicalSessionContext.scopeContext = {
    ...baseScope,
    teams: clinicalSessionContext.teams || baseScope.teams,
    guardias: clinicalSessionContext.guardias || baseScope.guardias,
    salaGuardiaToday,
    guardiaMode: clinicalSessionContext.guardiaMode,
    onCallGuardiaReceiver,
    now,
  };

  let scopedPatients = patients.filter((p) => p && p.id && !p.isDemo && !p.archived);
  if (gridViewContext === 'GUARDIA') {
    scopedPatients = filterPatientsForGuardiaCensus(
      scopedPatients,
      clinicalSessionContext.user,
      clinicalSessionContext.scopeContext,
      guardiasMap,
      elevatedPatientFilters
    );
  }
  const censusPatients = scopedPatients.map((p) => enrichPatientForGuardiaCard(p, guardiasMap));

  const summary = computeGuardiaSummary(censusPatients, guardiasMap);
  renderGuardiaSummaryTiles(summary, { turnoActivo });
  renderGuardiaCensusHead(censusPatients.length, {
    turnoActivo,
    entregaActive,
    vitalsOverdue: summary.vitalsOverdue,
    critical: summary.critical,
  });

  if (turnoActivo) {
    renderGuardiaVitalsFeed(
      patients.filter((p) => p && p.id && !p.isDemo && !p.archived),
      censusPatients.map((p) => p.id)
    );
  }

  void syncGuardiaIncomingStrip(settings);
  syncOrphanEntregasStrip(settings);
  wireClinicalTeamsControls();

  if (!gridBoard) {
    gridBoard = new UnifiedPatientGridBoard('guardia-census-grid', gridViewContext);
  } else {
    gridBoard.setViewContext(gridViewContext);
  }
  const showPatientActionMenu = shouldShowGuardiaPatientActionMenu({
    turnoActivo,
    entregaActive,
    onCallGuardiaReceiver,
    gridViewContext,
  });
  gridBoard.chipOpensEntrega = !turnoActivo;
  gridBoard.chipGuardiaPatientMenu = showPatientActionMenu;

  gridBoard.onChipClick = (patientId) => {
    if (!turnoActivo) {
      const guardia = guardiasMap.get(patientId);
      openEntregaModal({
        patientId,
        guardiaId: guardia?.guardia_id,
        onConfirm: () => {
          void refreshGuardiaCensusFromDb(settings);
        },
      });
      return;
    }
    if (showPatientActionMenu) {
      const row = censusPatients.find((p) => String(p.id) === String(patientId));
      openGuardiaPatientActionSheet({
        patientId,
        patientLabel: row?.name ? String(row.name) : undefined,
      });
    }
  };

  gridBoard.drawCensusGrid(censusPatients, guardiasMap, gridRank);
  gridBoard.startVitalsTicker();
}

/**
 * @param {Record<string, unknown>|null|undefined} settings
 */
export function syncGuardiaBoardFromRuntime(settings) {
  if (!isDbMode() || !isGuardiaMode()) return;
  renderGuardiaBoard(settings);
}

export function isGuardiaBoardAvailable() {
  return isDbMode();
}

export function syncGuardiaModeButtonVisibility() {
  const show = isDbMode();
  const btn = document.getElementById('header-guardia-mode-chip');
  if (btn) btn.style.display = show ? 'inline-flex' : 'none';
}
