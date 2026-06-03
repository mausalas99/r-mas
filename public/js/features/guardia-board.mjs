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
  mapPatientForGuardiaGrid,
  resolveClinicalRank,
} from '../clinical-access-runtime.mjs';
import { evaluateClinicalScope } from '../clinico-access.mjs';
import { syncGuardiaModeUI, toggleGuardiaMode } from '../guardia-mode-sync.mjs';
import { diagnosticosTextForCenso } from '../patient-diagnosticos.mjs';
import { UnifiedPatientGridBoard } from './unified-patient-grid-board.mjs';
import { syncGuardiaIncomingStrip, syncRotationConfigButton } from './clinical-rotation.mjs';
import { wireClinicalTeamsControls } from './clinical-teams.mjs';
import {
  getEntregaPhase,
  loadGuardiaGridViewContext,
  openEntregaModal,
  toggleEntregaPhase,
} from './clinical-entrega.mjs';
import { refreshGuardiaCensusFromDb } from '../clinical-access-runtime.mjs';
import { entregaChipMarkerIds } from '../../../lib/entrega/entrega-chip-markers.mjs';
import {
  listActiveProcedimientos,
  normalizePendientesJson,
} from '../../../lib/entrega/entrega-pendientes.mjs';

/** @type {UnifiedPatientGridBoard|null} */
let gridBoard = null;
let gridModeControlsWired = false;
let appShellInstalled = false;

function installGuardiaAppShell() {
  if (appShellInstalled || typeof window === 'undefined') return;
  appShellInstalled = true;
  window.appShell = window.appShell || {};
  window.appShell.openEntregaModal = openEntregaModal;
}

function syncEntregaPhaseChrome() {
  const btn = document.getElementById('btn-guardia-entrega-phase');
  const status = document.getElementById('guardia-entrega-phase-status');
  const phase = getEntregaPhase();
  const active = !!phase?.active;

  if (btn) {
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
    btn.textContent = active ? 'Salir de entrega' : 'Entrega';
    btn.title = active
      ? 'Terminar fase de entrega y volver al censo'
      : 'Iniciar entrega al R1 de guardia de tu sala';
  }

  if (status) {
    if (active && phase?.coveringLabel) {
      status.hidden = false;
      status.textContent = `Entregando a ${phase.coveringLabel} · toca un paciente en el censo`;
    } else {
      status.hidden = true;
      status.textContent = '';
    }
  }
}

function wireGuardiaEntregaPhaseButton(settings) {
  if (gridModeControlsWired) return;
  gridModeControlsWired = true;

  const btn = document.getElementById('btn-guardia-entrega-phase');
  if (!btn) return;

  syncEntregaPhaseChrome();

  btn.addEventListener('click', () => {
    toggleEntregaPhase({
      settings,
      renderGuardiaBoard,
    });
    syncEntregaPhaseChrome();
  });
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
function lastMedicionHasAlterations(p) {
  const hist = p?.monitoreo?.historial;
  if (!Array.isArray(hist) || !hist.length) return false;
  const last = hist[hist.length - 1];
  const alt = last && typeof last === 'object' ? /** @type {any} */ (last).alteredAt : null;
  return !!(alt && typeof alt === 'object' && Object.keys(alt).length > 0);
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
  const openTodos = pendingTodoCount(base.id);
  const pendingCount = g?.pendientes_json
    ? listActiveProcedimientos(normalizePendientesJson(g.pendientes_json)).length
    : 0;
  const vitalsAltered = lastMedicionHasAlterations(p);
  const isCritical = !!(
    g?.is_critical ||
    vitalsAltered ||
    (openTodos > 0 && storage.getTodos(base.id).some((t) => !t.completed && t.priority === 'alta'))
  );
  const entregaMarkers = g ? entregaChipMarkerIds(g) : [];
  return {
    ...base,
    dxText: dxText.toUpperCase(),
    pendingCount,
    labsSnippet: labsSnippetForPatient(base.id),
    isCritical,
    vitalsAltered,
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
  censusPatients.forEach((p) => {
    if (p.isCritical || guardiasMap.get(p.id)?.is_critical) critical += 1;
    pending += p.pendingCount || 0;
  });
  return { critical, pending };
}

/** @param {{ critical: number, pending: number }} summary */
function renderGuardiaSummaryTiles(summary) {
  const host = document.getElementById('guardia-summary');
  if (!host) return;
  const alertIcon =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';
  const listIcon =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>';
  host.innerHTML = `
    <div class="guardia-summary-tile guardia-summary-tile--critical">
      <div>
        <div class="guardia-summary-label">Pacientes críticos</div>
        <div class="guardia-summary-value guardia-summary-value--critical">${summary.critical}</div>
      </div>
      <span class="guardia-summary-icon">${alertIcon}</span>
    </div>
    <div class="guardia-summary-tile">
      <div>
        <div class="guardia-summary-label">Pendientes totales</div>
        <div class="guardia-summary-value">${summary.pending}</div>
      </div>
      <span class="guardia-summary-icon">${listIcon}</span>
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
 * @param {Record<string, unknown>|null|undefined} settings
 */
export function renderGuardiaBoard(settings) {
  if (!isGuardiaMode()) return;
  installGuardiaAppShell();
  const root = document.getElementById('appcontent-guardia');
  if (!root || root.getAttribute('aria-hidden') === 'true') return;

  const guardiasMap = clinicalSessionContext.guardiasMap.size
    ? clinicalSessionContext.guardiasMap
    : buildGuardiasMap(clinicalSessionContext.guardias);

  let censusPatients = patients
    .filter((p) => p && p.id && !p.isDemo && !p.archived)
    .map((p) => enrichPatientForGuardiaCard(p, guardiasMap));

  const gridViewContext = loadGuardiaGridViewContext();
  wireGuardiaEntregaPhaseButton(settings);
  syncEntregaPhaseChrome();
  wireGuardiaModeToggle(settings);
  syncRotationConfigButton();

  clinicalSessionContext.scopeContext = {
    teams: clinicalSessionContext.teams || [],
    guardias: clinicalSessionContext.guardias || [],
    assignments: clinicalSessionContext.assignments || [],
    salaGuardiaToday: clinicalSessionContext.salaGuardiaToday || [],
    guardiaMode: clinicalSessionContext.guardiaMode,
    now: new Date(),
    users: Array.isArray(clinicalSessionContext.scopeContext?.users)
      ? clinicalSessionContext.scopeContext.users
      : [],
    cycle: clinicalSessionContext.scopeContext?.cycle ?? null,
  };

  if (!clinicalSessionContext.guardiaMode && gridViewContext === 'GUARDIA') {
    clinicalSessionContext.scopeContext = clinicalSessionContext.scopeContext || {};
    censusPatients = censusPatients.filter((p) => {
      const scope = evaluateClinicalScope(
        clinicalSessionContext.user,
        { id: p.id, service: p.service, sala: p.sala },
        clinicalSessionContext.guardiasMap.get(p.id) || null,
        clinicalSessionContext.scopeContext
      );
      return scope.readable;
    });
  }

  const summary = computeGuardiaSummary(censusPatients, guardiasMap);
  renderGuardiaSummaryTiles(summary);

  void syncGuardiaIncomingStrip(settings);
  wireClinicalTeamsControls();

  if (!gridBoard) {
    gridBoard = new UnifiedPatientGridBoard('guardia-census-grid', gridViewContext);
  } else {
    gridBoard.setViewContext(gridViewContext);
  }
  gridBoard.chipOpensEntrega = !!clinicalSessionContext.guardiaMode;

  gridBoard.onChipClick = (patientId) => {
    const guardia = guardiasMap.get(patientId);
    openEntregaModal({
      patientId,
      guardiaId: guardia?.guardia_id,
      onConfirm: () => {
        void refreshGuardiaCensusFromDb(settings);
      },
    });
  };

  const rank = clinicalSessionContext.user?.rank || resolveClinicalRank(settings);
  gridBoard.drawCensusGrid(censusPatients, guardiasMap, rank);
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
