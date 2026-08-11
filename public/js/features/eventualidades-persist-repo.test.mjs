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

  it('repo path skips saveState and keeps scheduleCloudSyncPush', () => {
    const repoBranch = renderSrc.slice(
      renderSrc.indexOf('if (shouldPersistViaClinicalRepo'),
      renderSrc.indexOf('patient.eventualidades = next;\n  touchPatientLanUpdatedAt(patient.id);\n  await saveState')
    );
    assert.match(repoBranch, /executeClinicalCommand\(command/);
    assert.match(repoBranch, /scheduleCloudSyncPush\(\)/);
    assert.doesNotMatch(repoBranch, /await saveState/);
    assert.match(repoBranch, /via: 'clinical-repo'/);
  });

  it('legacy path still calls saveState', () => {
    assert.match(renderSrc, /await saveState\(\{ immediate: true \}\)/);
  });

  it('savePatientEventualidad passes eventualidad.upsert command', () => {
    assert.match(renderSrc, /type: 'eventualidad\.upsert'/);
    assert.match(renderSrc, /type: 'eventualidad\.delete'/);
    assert.match(renderSrc, /type: 'eventualidades\.labs\.set'/);
    assert.match(renderSrc, /type: 'eventualidades\.labs\.merge'/);
  });
});
