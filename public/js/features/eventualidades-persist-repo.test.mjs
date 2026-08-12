import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const renderSrc = readFileSync(join(__dirname, 'eventualidades-render.mjs'), 'utf8');

describe('eventualidades persist clinical-repo wiring', () => {
  it('imports flag + clinical-repo client', () => {
    assert.match(renderSrc, /from '\.\.\/clinical-repo-flag\.mjs'/);
    assert.match(renderSrc, /from '\.\.\/clinical-repo-client\.mjs'/);
    assert.match(renderSrc, /isClinicalRepoEventualidadesEnabled/);
    assert.match(renderSrc, /canExecuteClinicalCommand/);
    assert.match(renderSrc, /executeClinicalCommand/);
  });

  it('repo path uses retry helper; projector or scheduleCloudSyncPush', () => {
    const repoBranch = renderSrc.slice(
      renderSrc.indexOf('if (shouldPersistViaClinicalRepo'),
      renderSrc.indexOf('patient.eventualidades = next;\n  touchPatientLanUpdatedAt(patient.id);\n  await persistClinicalState')
    );
    assert.match(repoBranch, /executeEventualidadesCommandWithRetry\(command\)/);
    assert.match(renderSrc, /patient_not_found/);
    assert.match(renderSrc, /function executeEventualidadesCommandWithRetry/);
    assert.match(repoBranch, /via: 'clinical-repo'/);
    assert.match(repoBranch, /isClinicalRepoSyncProjectorEnabled/);
    assert.match(repoBranch, /void drainClinicalSyncProjector\(\)/);
    assert.match(repoBranch, /Do not await projector/);
    assert.match(repoBranch, /scheduleCloudSyncPush\(\)/);
    assert.match(repoBranch, /mergeCommandPatientsIntoAppState/);
  });

  it('legacy path still calls persistClinicalState', () => {
    assert.match(renderSrc, /await persistClinicalState\(\{ immediate: true \}\)/);
  });

  it('repo success path applies patient patch into clinical-read-model', () => {
    assert.match(renderSrc, /from '\.\.\/clinical-read-model\.mjs'/);
    assert.match(renderSrc, /_applyPatientPatch/);
    const repoBranch = renderSrc.slice(
      renderSrc.indexOf('if (shouldPersistViaClinicalRepo'),
      renderSrc.indexOf('patient.eventualidades = next;\n  touchPatientLanUpdatedAt(patient.id);\n  await persistClinicalState')
    );
    assert.match(repoBranch, /_applyPatientPatch\(/);
    assert.match(repoBranch, /source: 'eventualidades-persist'/);
  });

  it('savePatientEventualidad passes eventualidad.upsert command', () => {
    assert.match(renderSrc, /type: 'eventualidad\.upsert'/);
    assert.match(renderSrc, /type: 'eventualidad\.delete'/);
    assert.match(renderSrc, /type: 'eventualidades\.labs\.set'/);
    assert.match(renderSrc, /type: 'eventualidades\.labs\.merge'/);
  });

  it('re-renders connected mount and surfaces persist errors', () => {
    assert.match(renderSrc, /eventualidadesMountEl/);
    assert.match(renderSrc, /refreshEventualidadesPanelAfterPersist/);
    assert.match(renderSrc, /No se pudo guardar la eventualidad/);
    assert.match(renderSrc, /invalidateInnerTabRenderCache/);
  });

  it('create upsert sends stable entry id; delete uses live store', () => {
    assert.match(renderSrc, /id: added && added\.id/);
    assert.match(renderSrc, /const liveStore = ensureEventualidades\(livePatient\)/);
  });

  it('optimistic add paints before persist; projector is non-blocking', () => {
    assert.match(renderSrc, /livePatient\.eventualidades = next/);
    assert.match(renderSrc, /refreshEventualidadesPanelAfterPersist\(mountEl\)/);
    assert.match(renderSrc, /void drainClinicalSyncProjector\(\)/);
  });
});
