/**
 * Modo Guardia — chrome, bootstrap, and census summary helpers.
 */
import { storage } from '../storage.js';
import { isGuardiaMode } from './chrome.mjs';
import { clinicalSessionContext, mapPatientForGuardiaGrid } from '../clinical-access-runtime.mjs';
import { userIsOnGuardiaCallToday } from '../clinico-access.mjs';
import { effectiveClinicalRank, hasElevatedTeamPrivileges } from '../clinical-privileges.mjs';
import { setGuardiaMode, syncGuardiaModeUI, toggleGuardiaMode } from '../guardia-mode-sync.mjs';
import { diagnosticosTextForCenso } from '../patient-diagnosticos.mjs';
import { resolvePatientCensusTeamId } from './patients-clinical-filter.mjs';
import {
  GUARDIA_UNASSIGNED_TEAM_LABEL,
  guardiaTeamGroupLabel,
} from './unified-patient-grid-team-groups.mjs';
import { vitalsBannerForGuardia } from './unified-patient-grid-board.mjs';
import { getEntregaPhase, openEntregaModal, toggleEntregaPhase } from './clinical-entrega.mjs';
import { mergeSalaGuardiaTodayRows } from './guardia-hoy-modal.mjs';
import { isEntregaRosterOpen } from './entrega-roster-panel.mjs';
import { ensureTeamAssignedPatientsOnDevice, refreshGuardiaCensusFromDb } from '../clinical-access-runtime.mjs';
import { syncGuardiaPhaseBar } from './guardia-phase-bar.mjs';
import { entregaChipMarkerIds } from '../../../lib/entrega/entrega-chip-markers.mjs';
import {
  listActiveProcedimientos,
  normalizePendientesJson,
} from '../../../lib/entrega/entrega-pendientes.mjs';
import { vitalsStructuredMonitoringEnabled } from '../../../lib/entrega/entrega-vitals-plan.mjs';
import { isGuardiaChipCritical } from '../../../lib/entrega/guardia-chip-critical.mjs';
import { wireGuardiaPatientActionSheetDismiss } from './guardia-patient-action-sheet.mjs';
import {
  alteradosForPatient,
  patientPendientes,
  isPatientAdmittedToday,
} from './guardia-census-table.mjs';
import { isPatientAdmissionIncomplete } from '../patient-admission-incomplete.mjs';
import { renderGuardiaBoard } from './guardia-board-render.mjs';
import { mountModeFrame } from './workbench/mode-frame.mjs';
import { mountCountersBand } from './workbench/counters-band.mjs';
import { mountEmptyState } from './workbench/empty-state.mjs';
import { openCommandPaletteFromShell } from '../app-shell-lazy-panels.mjs';
import {
  isAppShellInstalled,
  isEntregaClickBusy,
  isEntregaControlsInstalled,
  markAppShellInstalled,
  markEntregaControlsInstalled,
  setEntregaClickBusy,
} from './guardia-board-state.mjs';

export function resolveGuardiaGridRank(user) {
  if (hasElevatedTeamPrivileges(user)) return 'R4';
  const raw = String(user?.rank || '').trim();
  if (raw === 'R4') return 'R4';
  return effectiveClinicalRank(user);
}

/**
 * Mode frame (workbench kit band 1) for the Guardia pane — mode name + one teal
 * primary ("Entregar guardia") + Censo PDF secondary + the ⌘/ shortcut.
 * The primary button keeps the `btn-guardia-entrega-phase` id so the existing
 * entrega-phase click/state wiring (wireGuardiaEntregaPhaseButton, below) still
 * finds it after each remount — it is NOT wired here to avoid a double listener.
 */
export function renderGuardiaModeFrame() {
  const host = document.getElementById('guardia-mode-frame');
  if (!host) return;
  mountModeFrame(host, {
    modeName: 'Guardia',
    secondaryActions: [
      {
        label: 'Censo PDF',
        title: 'Generar PDF del censo de guardia',
        onClick: () => {
          if (typeof window !== 'undefined' && typeof window.exportCensoPdfFromHelp === 'function') {
            window.exportCensoPdfFromHelp();
          }
        },
      },
    ],
    onShortcut: openCommandPaletteFromShell,
    primaryAction: { label: 'Entregar guardia' },
  });
  const primaryBtn = host.querySelector('[data-wb-primary]');
  if (primaryBtn) primaryBtn.id = 'btn-guardia-entrega-phase';
}

/**
 * Right column "Signos recibidos" card (screen 6a/6b) — there is no intern
 * vitals-capture pipeline feeding Guardia yet (Phase 11, deferred). Render the
 * shared empty state instead of a fake panel or a bare zero.
 */
export function renderGuardiaSignosRecibidosPanel() {
  const host = document.getElementById('guardia-signos-recibidos');
  if (!host) return;
  mountEmptyState(host, {
    label: 'Signos recibidos',
    missing: 'Todavía no hay una captura de signos de internos conectada a Guardia.',
    whenArrives: 'Llega con el Interno móvil (fase 11), pendiente de las decisiones de Nube y PHI.',
  });
}

/** @param {Record<string, unknown>|null|undefined} settings */
export async function bootstrapGuardiaViewOnEnter(settings) {
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

/** Pull guardia census + missing ward patients when entering modo guardia. */
export async function bootstrapGuardiaCensusData(settings) {
  await refreshGuardiaCensusFromDb(settings);
  await ensureTeamAssignedPatientsOnDevice({ allowLanPull: true, lanPullDelayMs: 3000 });
  if (isGuardiaMode()) renderGuardiaBoard(settings);
}

/** @returns {Record<string, unknown>|null} */
export function guardiaBoardSettings() {
  try {
    if (typeof window !== 'undefined' && typeof window.loadSettings === 'function') {
      return window.loadSettings();
    }
  } catch (_e) { void _e; }
  return null;
}

export function handleEntregaPhaseButtonClick() {
  if (isEntregaClickBusy()) return;
  setEntregaClickBusy(true);
  void (async () => {
    try {
      await toggleEntregaPhase({
        settings: guardiaBoardSettings(),
        renderGuardiaBoard,
      });
      syncEntregaPhaseChrome();
    } finally {
      setEntregaClickBusy(false);
    }
  })();
}

export function installGuardiaEntregaControls() {
  if (isEntregaControlsInstalled() || typeof document === 'undefined') return;
  markEntregaControlsInstalled();

  if (typeof window !== 'undefined') {
    window.appShell = window.appShell || {};
    window.appShell.toggleEntregaPhase = handleEntregaPhaseButtonClick;
  }

  syncEntregaPhaseChrome();
}

export function installGuardiaAppShell() {
  if (isAppShellInstalled() || typeof window === 'undefined') return;
  markAppShellInstalled();
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

export function syncEntregaPhaseChrome(opts = {}) {
  const btn = document.getElementById('btn-guardia-entrega-phase');
  const status = document.getElementById('guardia-entrega-phase-status');
  const phase = getEntregaPhase();
  const active = !!phase?.active;
  const rosterOpen = opts.rosterOpen ?? isEntregaRosterOpen();

  if (btn) {
    btn.hidden = !!rosterOpen;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
    // One teal primary, top right (screen 6a/6b) — the label stays fixed;
    // state is conveyed by title + the status line below, not by re-labeling it.
    btn.textContent = 'Entregar guardia';
    btn.title = active
      ? 'Continuar entrega — listado de pacientes'
      : opts.turnoActivo
        ? 'Documentar entrega — abre el listado por paciente'
        : 'Iniciar entrega al R1 de guardia de tu sala';
  }

  if (status) {
    if (active && phase?.coveringLabel && !rosterOpen) {
      status.hidden = false;
      status.textContent = `Entregando a ${phase.coveringLabel} · pulsa "Entregar guardia" para abrir el listado`;
    } else {
      status.hidden = true;
      status.textContent = '';
    }
  }
}

/** @param {Record<string, unknown>|null|undefined} _settings */
export function wireGuardiaEntregaPhaseButton(_settings) {
  installGuardiaEntregaControls();
  const btn = document.getElementById('btn-guardia-entrega-phase');
  if (!btn || btn._guardiaEntregaWired) return;
  btn._guardiaEntregaWired = true;
  btn.addEventListener('click', () => handleEntregaPhaseButtonClick());
  syncEntregaPhaseChrome();
}

/** @param {string} pid */
export function pendingTodoCount(pid) {
  return storage.getTodos(pid).filter((t) => !t.completed).length;
}

/** @param {string} pid */
export function labsSnippetForPatient(pid) {
  const history = storage.getLabHistory();
  const rows = Array.isArray(history[pid]) ? history[pid] : [];
  if (!rows.length) return '';
  const last = rows[rows.length - 1];
  const text = String(last?.text || last?.raw || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const line = text.split('\n').find((l) => /★|crit|alter|↑|↓/i.test(l)) || text.split('\n')[0] || text;
  return line.slice(0, 48);
}

/**
 * @param {Record<string, unknown>} p
 * @param {Map<string, object>} guardiasMap
 * @param {{ teams?: object[], assignments?: object[], now?: string|Date|number }} [teamCtx]
 */
export function enrichPatientForGuardiaCard(p, guardiasMap, teamCtx = {}) {
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
  const teams = teamCtx.teams || [];
  const assignments = teamCtx.assignments || [];
  const now = teamCtx.now || new Date().toISOString();
  const censusTeamId = resolvePatientCensusTeamId(p, teams, assignments, now);
  const team = censusTeamId
    ? teams.find((t) => String(t?.team_id || '') === censusTeamId)
    : null;
  return {
    ...base,
    dxText: dxText.toUpperCase(),
    pendingCount,
    labsSnippet: labsSnippetForPatient(base.id),
    isCritical,
    entregaMarkers,
    guardiaMeta: g,
    censusTeamId,
    censusTeamLabel: censusTeamId
      ? guardiaTeamGroupLabel(team)
      : GUARDIA_UNASSIGNED_TEAM_LABEL,
    // Keep chart fields for team / sala structural match in the grid.
    sala: p.sala,
    servicio: p.servicio,
    area: p.area,
  };
}

function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function lastVitalsRecordedAt(p) {
  const hist = Array.isArray(p?.monitoreo?.historial) ? p.monitoreo.historial : [];
  if (!hist.length) return null;
  const last = hist[hist.length - 1];
  return String(last?.recordedAt || last?.registeredAt || last?.createdAt || '') || null;
}

/**
 * @param {Array<ReturnType<typeof enrichPatientForGuardiaCard>>} censusPatients
 * @param {Map<string, object>} guardiasMap
 */
export function computeGuardiaSummary(censusPatients, guardiasMap) {
  let critical = 0;
  let pending = 0;
  let vitalsMonitored = 0;
  let vitalsOverdue = 0;
  let vitalsDueSoon = 0;
  let vitalsReceivedToday = 0;
  let vitalsOutOfRange = 0;
  let pendientesOpen = 0;
  let pendientesOverdue = 0;
  let admissionsToday = 0;
  let admissionsEnValoracion = 0;
  censusPatients.forEach((p) => {
    const meta = guardiasMap.get(p.id) || p.guardiaMeta || {};
    if (p.isCritical) critical += 1;
    pending += p.pendingCount || 0;
    const doc = normalizePendientesJson(meta?.pendientes_json);
    if (vitalsStructuredMonitoringEnabled(doc.vitalsPlan)) vitalsMonitored += 1;
    const banner = vitalsBannerForGuardia(meta);
    if (banner.cls === 'breached') vitalsOverdue += 1;
    else if (banner.cls === 'warning') vitalsDueSoon += 1;
    if (isToday(lastVitalsRecordedAt(p))) {
      vitalsReceivedToday += 1;
      if (alteradosForPatient(p).chips.length > 0) vitalsOutOfRange += 1;
    }
    const pendientes = patientPendientes(p.id);
    pendientesOpen += pendientes.open.length;
    pendientesOverdue += pendientes.overdue.length;
    if (isPatientAdmittedToday(p)) {
      admissionsToday += 1;
      if (isPatientAdmissionIncomplete(p)) admissionsEnValoracion += 1;
    }
  });
  return {
    total: censusPatients.length,
    critical,
    pending,
    vitalsMonitored,
    vitalsOverdue,
    vitalsDueSoon,
    vitalsReceivedToday,
    vitalsOutOfRange,
    pendientesOpen,
    pendientesOverdue,
    admissionsToday,
    admissionsEnValoracion,
  };
}

function guardiaVitalsCounterDetail(summary) {
  if (summary.vitalsOutOfRange > 0) return `${summary.vitalsOutOfRange} fuera de rango sin revisar`;
  if (summary.vitalsOverdue > 0) return `${summary.vitalsOverdue} vencido${summary.vitalsOverdue === 1 ? '' : 's'}`;
  if (summary.vitalsDueSoon > 0) return `${summary.vitalsDueSoon} pronto`;
  return '';
}

/**
 * Counters band (workbench kit) — Toma de signos (progress) / Pendientes (alert
 * cell) / Ingresos, in that exact order (screen 6a/6b).
 * @param {ReturnType<typeof computeGuardiaSummary>} summary
 * @returns {import('./workbench/counters-band.mjs').CounterCell[]}
 */
function guardiaCounterCells(summary) {
  const vitalsPercent =
    summary.vitalsMonitored > 0
      ? Math.round((summary.vitalsReceivedToday / summary.vitalsMonitored) * 100)
      : 0;
  const pendientesDetail =
    summary.pendientesOverdue > 0
      ? `${summary.pendientesOverdue} vencido${summary.pendientesOverdue === 1 ? '' : 's'}`
      : '';
  const ingresosDetail =
    summary.admissionsEnValoracion > 0 ? `${summary.admissionsEnValoracion} en valoración` : '';
  return [
    {
      label: 'Toma de signos · 08:00',
      figure:
        summary.vitalsMonitored > 0
          ? `${summary.vitalsReceivedToday} de ${summary.vitalsMonitored} recibidos`
          : 'Sin plan de signos',
      detail: guardiaVitalsCounterDetail(summary),
      progress: { percent: vitalsPercent },
    },
    {
      label: 'Pendientes',
      figure: `${summary.pendientesOpen} abierto${summary.pendientesOpen === 1 ? '' : 's'}`,
      detail: pendientesDetail,
      tone: 'alert',
    },
    {
      label: 'Ingresos',
      figure: `${summary.admissionsToday} nuevo${summary.admissionsToday === 1 ? '' : 's'}`,
      detail: ingresosDetail,
    },
  ];
}

/**
 * @param {ReturnType<typeof computeGuardiaSummary>} summary
 * @param {{ turnoActivo?: boolean }} [opts] unused — kept for call-site compatibility
 */
export function renderGuardiaSummaryTiles(summary, opts = {}) {
  void opts;
  const host = document.getElementById('guardia-summary');
  if (!host) return;
  mountCountersBand(host, guardiaCounterCells(summary));
}

/**
 * @param {number} count
 * @param {{ turnoActivo: boolean, entregaActive: boolean, vitalsOverdue: number, critical: number }} state
 */
export function renderGuardiaCensusHead(count, state) {
  const host = document.getElementById('guardia-census-head');
  if (!host) return;

  const parts = [];
  if (state.critical > 0) parts.push(`${state.critical} crítico${state.critical === 1 ? '' : 's'}`);
  if (state.vitalsOverdue > 0) {
    parts.push(`${state.vitalsOverdue} signo${state.vitalsOverdue === 1 ? '' : 's'} vencido${state.vitalsOverdue === 1 ? '' : 's'}`);
  }
  const byTeam = hasElevatedTeamPrivileges(clinicalSessionContext.user);
  const sortHint = parts.length
    ? `${parts.join(' · ')} arriba · por cama`
    : byTeam
      ? 'Agrupados por equipo · críticos e inestables arriba · por cama'
      : 'Orden por cama · críticos e inestables arriba';

  // The patient count now lives on the census table's own card header
  // ("Censo · N pacientes", guardia-census-table.mjs) — this strip keeps only
  // the triage sort hint and the learn nudge, so the count is never duplicated.
  void count;
  host.innerHTML = `
    <div class="guardia-census-head-inner">
      <div class="guardia-census-head-main">
        <p class="guardia-section-sub">${sortHint}</p>
      </div>
    </div>`;
  appendGuardiaLearnNudge(host);
}

export function syncGuardiaLearnNudgeChrome() {
  const host = document.getElementById('guardia-census-head');
  if (!host) return;
  void import('../guardia-v7-progress.mjs').then(function (progressMod) {
    const inner = host.querySelector('.guardia-census-head-inner');
    if (!inner) return;
    const btn = inner.querySelector('.guardia-learn-nudge-btn');
    if (progressMod.isGuardiaV7TrackComplete()) btn?.remove();
  });
}

export function appendGuardiaLearnNudge(host) {
  void Promise.all([
    import('../guardia-v7-progress.mjs'),
    import('./settings-help/learn-hub.mjs'),
  ]).then(function (mods) {
    const progressMod = mods[0];
    const hubMod = mods[1];
    const inner = host.querySelector('.guardia-census-head-inner');
    if (!inner) return;
    const existing = inner.querySelector('.guardia-learn-nudge-btn');
    if (progressMod.isGuardiaV7TrackComplete()) {
      existing?.remove();
      return;
    }
    if (existing) return;
    const summary = progressMod.guardiaV7ProgressSummary();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-med-secondary guardia-learn-nudge-btn';
    btn.textContent = `Guía guardia ${summary.completed}/${summary.total}`;
    btn.title = 'Abrir capítulos de guardia en el Centro de aprendizaje';
    btn.addEventListener('click', function () {
      if (typeof hubMod.openLearnHub === 'function') {
        hubMod.openLearnHub({ focusTrack: 'guardia-v7' });
      }
    });
    inner.appendChild(btn);
  });
}

export function wireGuardiaModeToggle(settings) {
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
export function syncGuardiaBoardChrome(state) {
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

  syncEntregaPhaseChrome({ rosterOpen: state.rosterOpen, turnoActivo: state.turnoActivo });

  syncGuardiaPhaseBar({
    ...state,
    onBeginEntrega: handleEntregaPhaseButtonClick,
  });
}
