import { patients, saveState } from '../app-state.mjs';
import { applyDefaultsToNewPatient } from '../app-shell.mjs';
import { generatePatientId, selectPatient, ensureUniquePatientName } from './patients.mjs';
import { applyDriveImportHcPatch } from './historia-clinica-panel.mjs';
import { applyDriveImportEventualidades } from './eventualidades-panel.mjs';
import { invalidateEventualidadesPanel } from './eventualidades-panel.mjs';

/**
 * @param {ReturnType<import('../../../lib/drive-import/parse-drive-document.mjs').parseDriveDocument>} parsed
 * @param {{
 *   mode: 'fill' | 'replace' | 'eventos',
 *   activePatient: object | null,
 *   createNew: boolean,
 * }} options
 */
export async function applyDriveImport(parsed, options) {
  const mode = options.mode || 'fill';
  let patient = options.activePatient;

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
    const hcRes = await applyDriveImportHcPatch(patient, parsed.hcPatch || {}, mode);
    hcOk = hcRes.ok;
    if (!hcOk) return { ok: false, error: 'hc-conflict' };
  }

  const evRes = await applyDriveImportEventualidades(patient, parsed.eventualidades.entries || []);
  invalidateEventualidadesPanel();

  await saveState();

  const hcKeys = Object.keys(parsed.hcPatch || {}).filter(function (k) {
    return !String(k).startsWith('_');
  });
  const navigateTo = mode === 'eventos' || !hcKeys.length ? 'eventualidades' : 'historia';

  return {
    ok: true,
    navigateTo: navigateTo,
    evAdded: evRes.added,
    evSkipped: evRes.skipped,
    patientId: patient.id,
  };
}
