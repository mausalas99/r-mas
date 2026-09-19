import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// patients.mjs touches `document` at module scope (event listener registration),
// and `document` doesn't exist under Electron's ELECTRON_RUN_AS_NODE test
// runtime (see agenda.test.mjs for the same constraint) — assert on source
// text instead of importing and dispatching the event.
const src = readFileSync(fileURLToPath(new URL('./patients.mjs', import.meta.url)), 'utf8');

function functionBody(name) {
  const start = src.indexOf('function ' + name);
  assert.notEqual(start, -1, name + ' should be declared');
  const nextExport = src.indexOf('\nexport ', start + 1);
  const nextFn = src.indexOf('\nfunction ', start + 1);
  let end = src.length;
  if (nextExport !== -1) end = Math.min(end, nextExport);
  if (nextFn !== -1) end = Math.min(end, nextFn);
  return src.slice(start, end);
}

describe('patients.mjs: Cerrar consulta migrates the patient to Directorio', () => {
  it('listens for hf:consulta-cerrada, guarded for the no-document test runtime', () => {
    assert.match(src, /typeof document !== 'undefined'/);
    assert.match(src, /document\.addEventListener\('hf:consulta-cerrada', migratePatientToDirectorioOnConsultaClose\)/);
  });

  it('flips hospitalizado = false, the same field dischargePatient (Alta) uses', () => {
    const migrateBody = functionBody('migratePatientToDirectorioOnConsultaClose');
    const dischargeBody = functionBody('dischargePatient');
    assert.match(migrateBody, /p\.hospitalizado = false/);
    assert.match(migrateBody, /persistClinicalState\(\)/);
    assert.match(migrateBody, /patientsBridge\.renderPatientList\(\)/);
    assert.match(migrateBody, /scheduleCloudSyncPush\(\)/);
    // Same field, same side effects as the existing Sala "Alta" migration path.
    assert.match(dischargeBody, /p\.hospitalizado = false/);
  });
});
