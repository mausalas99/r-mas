/** Mi rotación — create/join team: props for the Preact card and the cycle-field sync. */
import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
import {
  getCycleLettersForTeamCreate,
  getCycleFieldMetaForTeamCreate,
  getCycleLetterOptionsForRank,
  usesSalaR1LinePicker,
} from '../../clinico-access.mjs';
import { clinicalServiceForSala } from '../../../../lib/clinical-salas.mjs';
import {
  getTeamCompositionLimits,
  serviceUsesStructuredComposition,
} from '../../../../lib/clinical-team-composition.mjs';
import { effectiveClinicalRank, canManageTeamRoster, canViewUserDirectory } from '../../clinical-privileges.mjs';
import { CLINICAL_TEAM_SERVICES, CLINICAL_SALAS } from './shared.mjs';

/** «2 R1», «1 R2»… for services with fixed team composition; [] otherwise. */
export function compositionHintParts(service) {
  if (!serviceUsesStructuredComposition(service)) return [];
  const limits = getTeamCompositionLimits(service);
  if (!limits) return [];
  const parts = [];
  if (limits.r1) parts.push(`${limits.r1} R1`);
  if (limits.r2) parts.push(`${limits.r2} R2`);
  if (limits.r3) parts.push(`${limits.r3} R3`);
  return parts;
}

function setR1LineGroupVisible(visible) {
  const r1LineGroup = document.getElementById('clinical-team-r1-line-group');
  if (!r1LineGroup) return;
  r1LineGroup.hidden = !visible;
  r1LineGroup.style.display = visible ? '' : 'none';
}

export function syncCreateTeamServiceFromSala() {
  const salaSelect = document.getElementById('clinical-team-create-sala');
  const serviceSelect = document.getElementById('clinical-team-create-service');
  const userSala = String(clinicalSessionContext.user?.sala || '').trim();
  if (salaSelect && userSala && !String(salaSelect.value || '').trim()) {
    salaSelect.value = userSala;
  }
  const sala = String(salaSelect?.value || userSala || '').trim();
  const mapped = clinicalServiceForSala(sala);
  if (serviceSelect && mapped) {
    serviceSelect.value = mapped;
  }
  syncCreateTeamCycleField();
}

function updateCreateTeamCycleLabels(meta, service) {
  const label = document.getElementById('clinical-team-create-day-label');
  const hint = document.getElementById('clinical-team-create-day-hint');
  const compositionHint = document.getElementById('clinical-team-composition-hint');
  if (label) label.textContent = meta.label;
  if (hint) hint.textContent = meta.hint;
  if (compositionHint) {
    const parts = compositionHintParts(service);
    const p = document.createElement('p');
    p.className = 'clinical-teams-hint clinical-teams-composition-hint';
    p.textContent = `Composición: ${parts.join(', ')}.`;
    compositionHint.replaceChildren(...(parts.length ? [p] : []));
  }
}

function refreshCreateTeamDayOptions(daySelect, letters, prev) {
  if (!daySelect) return;
  daySelect.replaceChildren(...letters.map((letter) => new Option(letter, letter)));
  if (prev && letters.includes(prev)) daySelect.value = prev;
}

function readCreateTeamCycleContext() {
  const sala = String(
    document.getElementById('clinical-team-create-sala')?.value ||
      clinicalSessionContext.user?.sala ||
      ''
  ).trim();
  const service = String(document.getElementById('clinical-team-create-service')?.value || 'Sala');
  const rank = effectiveClinicalRank(clinicalSessionContext.user);
  const r1Line = Number(document.getElementById('clinical-team-create-r1-line')?.value || 0);
  return { sala, service, rank, r1Line };
}

export function syncCreateTeamCycleField() {
  const { sala, service, rank, r1Line } = readCreateTeamCycleContext();
  const showR1Line = rank === 'R1' && usesSalaR1LinePicker(service, sala);
  const meta = getCycleFieldMetaForTeamCreate(service, rank, showR1Line && r1Line === 1 ? 1 : 0);
  const daySelect = document.getElementById('clinical-team-create-day');
  setR1LineGroupVisible(showR1Line);
  updateCreateTeamCycleLabels(meta, service);
  const prev = String(daySelect?.value || '');
  const letters =
    showR1Line && rank === 'R1'
      ? getCycleLettersForTeamCreate(service, rank, r1Line === 1 ? 1 : 0)
      : getCycleLetterOptionsForRank(service, rank);
  refreshCreateTeamDayOptions(daySelect, letters, prev);
}

/** Props for NewTeamCard (teams-roster-create-view.jsx), read from the clinical session. */
export function newTeamCardProps({ primary = true } = {}) {
  const user = clinicalSessionContext.user || {};
  const elevated = canManageTeamRoster(user);
  const userSala = String(user.sala || '').trim();
  const rank = effectiveClinicalRank(user);
  const joinService = clinicalServiceForSala(clinicalSessionContext.user?.sala) || 'Sala';
  let form;
  if (elevated) {
    form = { homeSala: userSala, salas: CLINICAL_SALAS };
  } else {
    const defaultService = clinicalServiceForSala(userSala) || CLINICAL_TEAM_SERVICES[0];
    form = {
      userSala,
      salas: CLINICAL_SALAS,
      services: CLINICAL_TEAM_SERVICES,
      defaultService,
      letters: getCycleLetterOptionsForRank(defaultService, rank),
      meta: getCycleFieldMetaForTeamCreate(defaultService, rank, 0),
      showR1Line: rank === 'R1' && usesSalaR1LinePicker(defaultService, userSala),
      compositionParts: compositionHintParts(defaultService),
    };
  }
  return {
    primary,
    elevated,
    showDirectory: canViewUserDirectory(user),
    form,
    joinLetters: getCycleLetterOptionsForRank(joinService, rank),
  };
}
