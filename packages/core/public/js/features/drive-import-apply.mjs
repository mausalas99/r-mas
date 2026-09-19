import { getPatients, persistClinicalState } from '../app-state.mjs';
import { applyDefaultsToNewPatient } from '../app-shell.mjs';
import { generatePatientId, selectPatient, ensureUniquePatientName } from './patients.mjs';
import { applyDriveImportEventualidades } from './eventualidades-panel.mjs';
import { invalidateEventualidadesPanel } from './eventualidades-panel.mjs';
import { applyDriveImportLabSets } from './lab-panel.mjs';
import { renderEventualidadesPanel } from './eventualidades-panel.mjs';

/**
 * @param {ReturnType<import('../../../lib/drive-import/parse-drive-document.mjs').parseDriveDocument>} parsed
 * @param {{
 *   mode: 'fill' | 'replace' | 'eventos',
 *   activePatient: object | null,
 *   createNew: boolean,
 *   fromReview?: boolean,
 * }} options
 */
export async function applyDriveImport(parsed, options) {
  return applyDriveImportInner(parsed, options);
}

function createPatientFromDriveHeader(header) {
  const h = header || {};
  const id = generatePatientId();
  const patient = {
    id: id,
    nombre: ensureUniquePatientName(h.nombre || 'PACIENTE SIN NOMBRE'),
    edad: h.edad || '',
    sexo: h.sexo === 'F' ? 'F' : 'M',
    cama: h.cama || '',
    registro: h.registro || '',
    area: '',
    servicio: '',
    cuarto: '',
    fromLab: false,
  };
  applyDefaultsToNewPatient(patient);
  getPatients().unshift(patient);
  selectPatient(id);
  return patient;
}

async function applyDriveEventualidadesSection(patient, parsed) {
  const evRes = await applyDriveImportEventualidades(patient, parsed.eventualidades.entries || []);
  invalidateEventualidadesPanel();
  const evMount = document.getElementById('exp-pane-eventualidades');
  if (evMount && evRes.added) {
    renderEventualidadesPanel(evMount);
  }
  return evRes;
}

async function applyDriveLabSetsIfAny(patient, parsed) {
  const labSets = parsed.laboratorios && parsed.laboratorios.sets ? parsed.laboratorios.sets : [];
  if (!labSets.length) return { added: 0, skipped: 0 };
  return applyDriveImportLabSets(patient, labSets);
}

function resolveDriveImportNavigateTo(mode, parsed, labRes) {
  let navigateTo = mode === 'eventos' ? 'eventualidades' : 'estadoActual';
  if (labRes.added && navigateTo === 'eventualidades' && mode === 'eventos') {
    navigateTo = 'lab';
  }
  return navigateTo;
}

async function applyDriveImportInner(parsed, options) {
  const mode = options.mode || 'fill';
  let patient = options.activePatient;
  let lanSyncDeferred = false;

  if (options.createNew) {
    patient = createPatientFromDriveHeader(parsed.header);
  }

  if (!patient) {
    return { ok: false, error: 'no-patient' };
  }

  const evRes = await applyDriveEventualidadesSection(patient, parsed);
  if (evRes.lanDeferred) lanSyncDeferred = true;

  const labRes = await applyDriveLabSetsIfAny(patient, parsed);
  await persistClinicalState({ immediate: true });

  return {
    ok: true,
    navigateTo: resolveDriveImportNavigateTo(mode, parsed, labRes),
    evAdded: evRes.added,
    evSkipped: evRes.skipped,
    labAdded: labRes.added,
    labSkipped: labRes.skipped,
    patientId: patient.id,
    lanSyncDeferred: lanSyncDeferred,
  };
}
