/**
 * Modo Guardia — census grid render orchestration.
 */
import { getPatients } from '../app-state.mjs';
import { isGuardiaMode } from './chrome.mjs';
import {
  buildGuardiasMap,
  clinicalSessionContext,
  getClinicalScopeContextForEvaluate,
  ensureElevatedWardCensusOnDevice,
  refreshGuardiaCensusFromDb,
  waitForClinicalAccessReady,
} from '../clinical-access-runtime.mjs';
import { userIsOnGuardiaCallToday } from '../clinico-access.mjs';
import { effectiveClinicalRank, hasElevatedTeamPrivileges } from '../clinical-privileges.mjs';
import { mountGuardiaCensusTable } from './guardia-census-table.mjs';
import { syncGuardiaIncomingStrip, syncGuardiaRotationToolbar } from './clinical-rotation.mjs';
import { wireClinicalTeamsControls } from './clinical-teams.mjs';
import { openEntregaModal } from './clinical-entrega.mjs';
import { mergeSalaGuardiaTodayRows } from './clinical-entrega/clinical-entrega-util.mjs';
import { syncOrphanEntregasStrip } from '../guardia-orphan-entregas.mjs';
import { filterPatientsByTeamSala, filterPatientsForGuardiaCensus } from './patients-clinical-filter.mjs';
import { elevatedPatientFilters } from './clinical-census-filters-state.mjs';
import {
  renderGuardiaCensusEmpty,
  renderGuardiaCensusLoading,
  renderGuardiaSalaPicker,
} from './guardia-census-empty.mjs';
import { setGuardiaMode } from '../guardia-mode-sync.mjs';
import { CLINICAL_SALA_VALUES } from '../../../lib/clinical-salas.mjs';
import { resolveHomeSala } from './clinical-census-filters-ui.mjs';
import {
  bootstrapGuardiaCensusData,
  bootstrapGuardiaViewOnEnter,
  enrichPatientForGuardiaCard,
  installGuardiaAppShell,
  renderGuardiaCensusHead,
  resolveGuardiaGridRank,
  syncGuardiaBoardChrome,
} from './guardia-board-chrome.mjs';
import {
  isElevatedFullWardPullScheduled,
  isGuardiaInitialLoadDone,
  isGuardiaViewBootstrapped,
  markElevatedFullWardPullScheduled,
  markGuardiaInitialLoadDone,
  readGuardiaSala,
  setGuardiaViewBootstrapped,
  writeGuardiaSala,
} from './guardia-board-state.mjs';

function clearInactiveGuardiaBoard() {
  setGuardiaViewBootstrapped(false);
}

function ensureGuardiaBoardBootstrapped(settings) {
  installGuardiaAppShell();
  void import('./clinical-rotation-entry.mjs').then((mod) => {
    mod.syncClinicalRotationEntryChrome?.();
  });
  if (!isGuardiaViewBootstrapped()) {
    setGuardiaViewBootstrapped(true);
    void Promise.all([
      bootstrapGuardiaViewOnEnter(settings),
      bootstrapGuardiaCensusData(settings),
      waitForClinicalAccessReady(),
    ]).then(() => {
      markGuardiaInitialLoadDone();
      if (isGuardiaMode()) renderGuardiaBoard(settings);
    });
  }
}

function scheduleElevatedWardPullIfNeeded(user) {
  if (
    !hasElevatedTeamPrivileges(user) ||
    elevatedPatientFilters.teamId ||
    isElevatedFullWardPullScheduled()
  ) {
    return;
  }
  markElevatedFullWardPullScheduled();
  void ensureElevatedWardCensusOnDevice({
    allowLanPull: true,
    lanPullDelayMs: 3000,
    teamFilterId: '',
  });
}

function buildGuardiaScopeContext() {
  const now = new Date();
  const salaGuardiaToday = mergeSalaGuardiaTodayRows(
    clinicalSessionContext.teams || [],
    clinicalSessionContext.salaGuardiaToday || []
  );
  const userId = String(clinicalSessionContext.user?.user_id || '');
  const clinicalRank = effectiveClinicalRank(clinicalSessionContext.user);
  const onCallGuardiaReceiver = userIsOnGuardiaCallToday(
    userId,
    clinicalRank,
    clinicalSessionContext.teams || [],
    now,
    salaGuardiaToday
  );
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
  scheduleElevatedWardPullIfNeeded(clinicalSessionContext.user);
  return { salaGuardiaToday, onCallGuardiaReceiver };
}

/**
 * Guardia census (Step 2): clinical scope, then narrowed to the sala declared
 * for tonight (Step 1) via each patient's resolved team — never `patient.sala`,
 * which can be mis-stamped on elevated devices with a full-ward pull.
 * @param {Map<string, object>} guardiasMap
 * @param {string} declaredSala
 */
function buildGuardiaCensusPatients(guardiasMap, declaredSala) {
  let scopedPatients = getPatients().filter((p) => p && p.id && !p.isDemo && !p.archived);
  const scope = clinicalSessionContext.scopeContext || getClinicalScopeContextForEvaluate();
  const teams = scope.teams || clinicalSessionContext.teams || [];
  const assignments = scope.assignments || [];
  const now = scope.now || new Date().toISOString();
  scopedPatients = filterPatientsForGuardiaCensus(
    scopedPatients,
    clinicalSessionContext.user,
    clinicalSessionContext.scopeContext,
    guardiasMap,
    { sala: '__all__', teamId: '', service: '' }
  );
  scopedPatients = filterPatientsByTeamSala(scopedPatients, declaredSala, teams);
  return scopedPatients.map((p) =>
    enrichPatientForGuardiaCard(p, guardiasMap, { teams, assignments, now })
  );
}

function wireGuardiaGridBoard({
  censusPatients,
  guardiasMap,
  gridRank,
  settings,
}) {
  const container = document.getElementById('guardia-census-grid');
  if (!container) return;
  // Always opens the entrega (handoff) modal — the turno activo / grid-view
  // toggle that used to gate this on-row-click was removed 2026-09-24 along
  // with its only entry point (see PLAN.md decisions).
  const onRowClick = (patientId) => {
    const guardia = guardiasMap.get(patientId);
    openEntregaModal({
      patientId,
      guardiaId: guardia?.guardia_id,
      onConfirm: () => {
        void refreshGuardiaCensusFromDb(settings);
      },
    });
  };
  if (!censusPatients.length) {
    renderGuardiaCensusEmpty(container, {
      // clinicalSessionContext.guardiaMode = census filter «solo entregados» (not Guardia view).
      filterOn: !!clinicalSessionContext.guardiaMode,
      onShowAll: () => {
        setGuardiaMode(false, { settings, renderGuardiaBoard, rerenderBoard: true });
      },
    });
    return;
  }
  const scope = clinicalSessionContext.scopeContext || getClinicalScopeContextForEvaluate();
  mountGuardiaCensusTable(
    container,
    censusPatients,
    guardiasMap,
    gridRank,
    {
      teams: scope.teams || clinicalSessionContext.teams || [],
      assignments: scope.assignments || [],
      now: scope.now || new Date().toISOString(),
    },
    onRowClick
  );
}

/** Step 1 picker — shown only when no sala can be derived (or forced by Cambiar). */
export function showGuardiaSalaPicker(settings) {
  renderGuardiaSalaPicker(document.getElementById('guardia-census-grid'), {
    salas: CLINICAL_SALA_VALUES,
    selected: String(clinicalSessionContext.user?.sala || '').trim(),
    onStart: (sala) => {
      writeGuardiaSala(sala);
      renderGuardiaBoard(settings);
    },
  });
}

export function renderGuardiaBoard(settings) {
  if (!isGuardiaMode()) {
    clearInactiveGuardiaBoard();
    return;
  }
  ensureGuardiaBoardBootstrapped(settings);

  const root = document.getElementById('appcontent-guardia');
  if (!root || root.getAttribute('aria-hidden') === 'true') return;

  const guardiasMap = clinicalSessionContext.guardiasMap.size
    ? clinicalSessionContext.guardiasMap
    : buildGuardiasMap(clinicalSessionContext.guardias);

  syncGuardiaRotationToolbar();
  syncGuardiaBoardChrome({ settings, renderGuardiaBoard });

  buildGuardiaScopeContext();

  if (!isGuardiaInitialLoadDone()) {
    renderGuardiaCensusLoading(document.getElementById('guardia-census-grid'));
    return;
  }

  // Step 1: 24h override, else home sala (profile, else joined team) — the
  // picker only shows when all three resolve empty.
  const declaredSala =
    readGuardiaSala() ||
    resolveHomeSala(clinicalSessionContext.user, clinicalSessionContext.teams || []);
  if (!declaredSala) {
    showGuardiaSalaPicker(settings);
    return;
  }

  const censusPatients = buildGuardiaCensusPatients(guardiasMap, declaredSala);
  const scopeTeams = clinicalSessionContext.scopeContext?.teams || clinicalSessionContext.teams || [];
  const teamCount = scopeTeams.filter((t) => String(t?.sala || '').trim() === declaredSala).length;

  renderGuardiaCensusHead({ sala: declaredSala, teamCount });

  void syncGuardiaIncomingStrip(settings);
  syncOrphanEntregasStrip(settings);
  wireClinicalTeamsControls();

  wireGuardiaGridBoard({
    censusPatients,
    guardiasMap,
    gridRank: resolveGuardiaGridRank(clinicalSessionContext.user),
    settings,
  });
}
