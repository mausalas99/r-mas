import { patients, saveState } from '../app-state.mjs';
import { applyDefaultsToNewPatient } from '../app-shell.mjs';
import { generatePatientId, selectPatient, ensureUniquePatientName } from './patients.mjs';
import { applyDriveImportHcPatch } from './historia-clinica-panel.mjs';
import { applyDriveImportEventualidades } from './eventualidades-panel.mjs';
import { invalidateEventualidadesPanel } from './eventualidades-panel.mjs';
import { applyDriveImportLabSets } from './lab-panel.mjs';
import { withSuppressedLanConflictViewer } from './lan-sync.mjs';
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
  return withSuppressedLanConflictViewer(async function () {
    return applyDriveImportInner(parsed, options);
  });
}

async function applyDriveImportInner(parsed, options) {
  const mode = options.mode || 'fill';
  let patient = options.activePatient;
  let lanSyncDeferred = false;

  if (options.createNew) {
    const h = parsed.header || {};
    const id = generatePatientId();
    patient = {
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
    patients.unshift(patient);
    selectPatient(id);
  }

  if (!patient) {
    return { ok: false, error: 'no-patient' };
  }

  let hcOk = true;
  if (mode !== 'eventos') {
    const hcRes = await applyDriveImportHcPatch(patient, parsed.hcPatch || {}, mode, {
      fromReview: !!options.fromReview,
    });
    hcOk = hcRes.ok;
    if (hcRes.lanDeferred) lanSyncDeferred = true;
    if (!hcOk) return { ok: false, error: 'hc-conflict' };
  }

  const evRes = await applyDriveImportEventualidades(patient, parsed.eventualidades.entries || []);
  if (evRes.lanDeferred) lanSyncDeferred = true;
  invalidateEventualidadesPanel();
  const evMount = document.getElementById('exp-pane-eventualidades');
  if (evMount && evRes.added) {
    renderEventualidadesPanel(evMount);
  }

  let labRes = { added: 0, skipped: 0 };
  const labSets = parsed.laboratorios && parsed.laboratorios.sets ? parsed.laboratorios.sets : [];
  if (labSets.length) {
    labRes = await applyDriveImportLabSets(patient, labSets);
  }

  await saveState({ immediate: true });

  const hcKeys = Object.keys(parsed.hcPatch || {}).filter(function (k) {
    return !String(k).startsWith('_');
  });
  let navigateTo = mode === 'eventos' || !hcKeys.length ? 'eventualidades' : 'historia';
  if (labRes.added && navigateTo === 'eventualidades' && mode === 'eventos') {
    navigateTo = 'lab';
  }

  return {
    ok: true,
    navigateTo: navigateTo,
    evAdded: evRes.added,
    evSkipped: evRes.skipped,
    labAdded: labRes.added,
    labSkipped: labRes.skipped,
    patientId: patient.id,
    lanSyncDeferred: lanSyncDeferred,
  };
}
