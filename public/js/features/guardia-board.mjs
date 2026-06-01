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
import { diagnosticosTextForCenso } from '../patient-diagnosticos.mjs';
import { UnifiedPatientGridBoard } from './unified-patient-grid-board.mjs';
import { syncGuardiaIncomingStrip } from './clinical-rotation.mjs';
import { wireClinicalTeamsControls } from './clinical-teams.mjs';
import {
  loadGuardiaGridViewContext,
  openEntregaModal,
  saveGuardiaGridMode,
} from './clinical-entrega.mjs';
import { refreshGuardiaCensusFromDb } from '../clinical-access-runtime.mjs';

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

function wireGuardiaGridModeToggle(settings) {
  if (gridModeControlsWired) return;
  gridModeControlsWired = true;

  const censoBtn = document.getElementById('guardia-grid-mode-censo');
  const entregaBtn = document.getElementById('guardia-grid-mode-entrega');
  if (!censoBtn || !entregaBtn) return;

  const syncButtons = (mode) => {
    const isEntrega = mode === 'entrega';
    censoBtn.classList.toggle('is-active', !isEntrega);
    entregaBtn.classList.toggle('is-active', isEntrega);
    censoBtn.setAttribute('aria-pressed', String(!isEntrega));
    entregaBtn.setAttribute('aria-pressed', String(isEntrega));
  };

  const applyMode = (mode) => {
    saveGuardiaGridMode(mode);
    syncButtons(mode);
    if (gridBoard) {
      gridBoard.setViewContext(mode === 'entrega' ? 'HANDOFF' : 'GUARDIA');
    }
    renderGuardiaBoard(settings);
  };

  syncButtons(loadGuardiaGridViewContext() === 'HANDOFF' ? 'entrega' : 'censo');

  censoBtn.addEventListener('click', () => applyMode('censo'));
  entregaBtn.addEventListener('click', () => applyMode('entrega'));
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
  const openTodos = pendingTodoCount(base.id);
  const isCritical = !!(g?.is_critical || openTodos > 0 && storage.getTodos(base.id).some((t) => !t.completed && t.priority === 'alta'));
  return {
    ...base,
    dxText: dxText.toUpperCase(),
    pendingCount: openTodos,
    labsSnippet: labsSnippetForPatient(base.id),
    isCritical,
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
  host.innerHTML = `
    <div class="guardia-summary-tile guardia-summary-tile--critical">
      <div>
        <div class="guardia-summary-label">Pacientes críticos</div>
        <div class="guardia-summary-value guardia-summary-value--critical">${summary.critical}</div>
      </div>
      <span class="guardia-summary-icon" aria-hidden="true">⚠️</span>
    </div>
    <div class="guardia-summary-tile">
      <div>
        <div class="guardia-summary-label">Pendientes totales</div>
        <div class="guardia-summary-value">${summary.pending}</div>
      </div>
      <span class="guardia-summary-icon" aria-hidden="true">📋</span>
    </div>`;
}

function wireGuardiaModeToggle(settings) {
  const btn = document.getElementById('btn-guardia-mode-toggle');
  if (!btn || btn._rpcGuardiaModeWired) return;
  btn._rpcGuardiaModeWired = true;

  const syncUI = (active) => {
    btn.setAttribute('aria-pressed', String(active));
    btn.classList.toggle('is-active', active);
    const label = btn.querySelector('.guardia-mode-label');
    if (label) label.textContent = active ? 'Modo Guardia' : 'Modo Normal';
  };

  syncUI(clinicalSessionContext.guardiaMode);

  btn.addEventListener('click', () => {
    clinicalSessionContext.guardiaMode = !clinicalSessionContext.guardiaMode;
    syncUI(clinicalSessionContext.guardiaMode);
    renderGuardiaBoard(settings);
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
  wireGuardiaGridModeToggle(settings);
  wireGuardiaModeToggle(settings);

  clinicalSessionContext.scopeContext = {
    teams: clinicalSessionContext.teams || [],
    guardias: clinicalSessionContext.guardias || [],
    assignments: clinicalSessionContext.assignments || [],
    salaGuardiaToday: clinicalSessionContext.salaGuardiaToday || [],
    guardiaMode: clinicalSessionContext.guardiaMode,
    now: new Date(),
  };

  if (guardiasMap.size > 0 && gridViewContext === 'GUARDIA') {
    censusPatients = censusPatients.filter((p) => guardiasMap.has(p.id));
  }

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
