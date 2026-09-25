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
import { openEntregaModal } from './clinical-entrega.mjs';
import { mergeSalaGuardiaTodayRows } from './clinical-entrega/clinical-entrega-util.mjs';
import { ensureTeamAssignedPatientsOnDevice, refreshGuardiaCensusFromDb } from '../clinical-access-runtime.mjs';
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
import { renderGuardiaBoard, showGuardiaSalaPicker } from './guardia-board-render.mjs';
import { mountCountersBand } from './workbench/counters-band.mjs';
import { clearGuardiaSala, isAppShellInstalled, markAppShellInstalled } from './guardia-board-state.mjs';

export function resolveGuardiaGridRank(user) {
  if (hasElevatedTeamPrivileges(user)) return 'R4';
  const raw = String(user?.rank || '').trim();
  if (raw === 'R4') return 'R4';
  return effectiveClinicalRank(user);
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

/**
 * Pull guardia census + missing ward patients when entering modo guardia.
 * The LAN reconcile is fire-and-forget so the loading screen doesn't sit on
 * screen for its 3s debounce once local DB data is already in hand.
 */
export async function bootstrapGuardiaCensusData(settings) {
  await refreshGuardiaCensusFromDb(settings);
  if (isGuardiaMode()) renderGuardiaBoard(settings);
  void ensureTeamAssignedPatientsOnDevice({ allowLanPull: true, lanPullDelayMs: 3000 }).then(() => {
    if (isGuardiaMode()) renderGuardiaBoard(settings);
  });
}

export function installGuardiaAppShell() {
  if (isAppShellInstalled() || typeof window === 'undefined') return;
  markAppShellInstalled();
  wireGuardiaPatientActionSheetDismiss();
  window.appShell = window.appShell || {};
  window.appShell.openEntregaModal = openEntregaModal;
  document.addEventListener('click', (ev) => {
    const btn = ev.target?.closest?.('#guardia-btn-cambiar-sala');
    if (!btn) return;
    ev.preventDefault();
    clearGuardiaSala();
    // Force the picker even though a home sala would otherwise re-derive
    // instantly — Cambiar is a one-night manual override.
    showGuardiaSalaPicker(null);
  });
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
    // patients-modal.mjs's fillCompleteAdmissionLocationInputs() reads these
    // straight off the patient object — without them the edit modal opened
    // from a Guardia card showed a blank "Cama —" instead of the real bed.
    cuarto: p.cuarto,
    cama: p.cama,
    // guardia-census-table.mjs's alteradosForPatient()/admissionDateForPatient()
    // read these straight off the patient object (not off the `base` grid-card
    // shape above) — without them every row silently read as "sin toma 08:00"
    // and the Ingresos (D3a) counter stayed at 0 no matter what was seeded.
    monitoreo: p.monitoreo,
    registeredAt: p.registeredAt,
    fimiFecha: p.fimiFecha,
    fiuxFecha: p.fiuxFecha,
    guardiaEsfuerzo: p.guardiaEsfuerzo,
    guardiaPronostico: p.guardiaPronostico,
    guardiaNota: p.guardiaNota,
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
 * Deliberately empty — Cambiar now lives in the census table's own header
 * (buildGuardiaCensusTableHtml) so the census grid keeps the vertical room
 * this separate bar used to take.
 * @param {{ sala: string, teamCount: number }} state
 */
export function renderGuardiaCensusHead(state) {
  void state;
  const host = document.getElementById('guardia-census-head');
  if (host) host.innerHTML = '';
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
 * @param {{ settings?: Record<string, unknown>|null }} state
 */
export function syncGuardiaBoardChrome(state) {
  void state;
  const filterHint = document.getElementById('guardia-census-filter-hint');
  const scopePanel = document.getElementById('guardia-census-scope');

  if (filterHint) {
    // Sala + equipo scope is now shown on the census head (renderGuardiaCensusHead) —
    // Filtros censo no longer applies to Guardia, so this hint only covers alcance.
    const alcanceOn = !!clinicalSessionContext.guardiaMode;
    filterHint.textContent = alcanceOn
      ? 'Solo pacientes que te entregaron en este turno.'
      : 'Todos los pacientes en tu alcance clínico.';
    filterHint.classList.toggle('visually-hidden', !alcanceOn);
  }
  if (scopePanel) {
    scopePanel.classList.toggle('guardia-census-scope--narrow', !!clinicalSessionContext.guardiaMode);
  }
}
