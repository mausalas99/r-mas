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
    assert.match(renderSrc, /source: 'eventualidades-retry'/);
    assert.match(renderSrc, /type: 'clinical.persistSnapshot'/);
    assert.match(repoBranch, /via: 'clinical-repo'/);
    assert.match(repoBranch, /isClinicalRepoSyncProjectorEnabled/);
    assert.match(repoBranch, /scheduleEventualidadesSyncDrain\(res\.changeId\)/);
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
    assert.match(renderSrc, /invalidateInnerTabRenderCache\('eventualidades'\)/);
    assert.match(renderSrc, /invalidateInnerTabRenderCache\('resumen'\)/);
    assert.match(renderSrc, /submitEventualidadEntryGuarded/);
  });

  it('create upsert sends stable entry id; delete uses live store', () => {
    assert.match(renderSrc, /id: added && added\.id/);
    assert.match(renderSrc, /const liveStore = ensureEventualidades\(livePatient\)/);
  });

  it('optimistic add paints before persist; projector is non-blocking', () => {
    assert.match(renderSrc, /livePatient\.eventualidades = next/);
    assert.match(renderSrc, /refreshEventualidadesPanelAfterPersist\(mountEl\)/);
    assert.match(renderSrc, /scheduleEventualidadesSyncDrain/);
    assert.match(renderSrc, /drainClinicalSyncProjector\(\{ changeIds: \[id\] \}\)/);
    assert.doesNotMatch(renderSrc, /void drainClinicalSyncProjector\(\)/);
  });

  it('does not settle-fade the timeline on persist remounts (delete/save)', () => {
    const refreshStart = renderSrc.indexOf('function refreshEventualidadesPanelAfterPersist');
    const refreshEnd = renderSrc.indexOf('async function executeEventualidadesCommandWithRetry');
    assert.ok(refreshStart >= 0);
    assert.doesNotMatch(renderSrc.slice(refreshStart, refreshEnd), /settlePasteSurface/);
    const renderStart = renderSrc.indexOf('export function renderEventualidadesPanel');
    assert.ok(renderStart >= 0);
    assert.doesNotMatch(renderSrc.slice(renderStart), /settlePasteSurface/);
    assert.doesNotMatch(renderSrc, /from '\.\.\/ui-motion\.mjs'/);
  });

  it('does not rebuild Tendencias charts unless that inner tab is active', () => {
    const fnStart = renderSrc.indexOf('function refreshTendenciasAfterEventualidades');
    const fnEnd = renderSrc.indexOf('function shouldPersistViaClinicalRepo');
    assert.ok(fnStart >= 0);
    const fn = renderSrc.slice(fnStart, fnEnd);
    assert.match(fn, /getActiveInner\(\) === 'tend'/);
    assert.match(fn, /invalidateInnerTabRenderCache\('tend'\)/);
  });

  it('does not echo the patients census over IPC on persist', () => {
    assert.match(renderSrc, /echoSnapshot:\s*false/);
  });

  it('patient_not_found retry persists census only', () => {
    const start = renderSrc.indexOf('async function executeEventualidadesCommandWithRetry');
    const end = renderSrc.indexOf('export async function persistEventualidades');
    assert.ok(start >= 0 && end > start);
    const fn = renderSrc.slice(start, end);
    assert.doesNotMatch(fn, /persistClinicalState/);
    assert.match(fn, /patients: getPatients\(\)/);
    assert.match(fn, /echoSnapshot: false/);
  });

  it('paints the panel once per persist refresh', () => {
    const refreshStart = renderSrc.indexOf('function refreshEventualidadesPanelAfterPersist');
    const refreshEnd = renderSrc.indexOf('async function executeEventualidadesCommandWithRetry');
    assert.ok(refreshStart >= 0);
    const fn = renderSrc.slice(refreshStart, refreshEnd);
    assert.equal(fn.split('renderEventualidadesPanel(').length - 1, 1);
  });

  it('does not remount after add/delete persist returns', () => {
    const submit = renderSrc.slice(
      renderSrc.indexOf('async function submitEventualidadEntry'),
      renderSrc.indexOf('async function submitEventualidadEntryGuarded')
    );
    const afterAdd = submit.slice(submit.indexOf('await persistEventualidades'));
    assert.doesNotMatch(afterAdd, /refreshEventualidadesPanelAfterPersist/);

    const delBlock = renderSrc.slice(
      renderSrc.indexOf("type: 'eventualidad.delete'"),
      renderSrc.indexOf('const btn = ev.target.closest')
    );
    const afterDel = delBlock.slice(delBlock.indexOf('await persistEventualidades'));
    assert.doesNotMatch(afterDel, /refreshEventualidadesPanelAfterPersist/);
  });

  it('delete drops the card in-place with no confirm overlay', () => {
    assert.doesNotMatch(renderSrc, /\bconfirm\(/);
    assert.doesNotMatch(renderSrc, /showConfirmDialog/);
    assert.match(renderSrc, /removeEventualidadCardEl/);
    const delStart = renderSrc.indexOf('async function deleteEventualidadFromTimeline');
    const delEnd = renderSrc.indexOf('function eventualidadUpsertCommand');
    assert.ok(delStart >= 0);
    const del = renderSrc.slice(delStart, delEnd);
    assert.doesNotMatch(del, /refreshEventualidadesPanelAfterPersist/);
    assert.match(del, /removeEventualidadCardEl/);
    assert.doesNotMatch(del, /showConfirmDialog/);
  });
});
