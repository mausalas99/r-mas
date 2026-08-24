import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const panelConexionSrc = readFileSync(join(here, 'panel-conexion.mjs'), 'utf8');
const panelRuntimeSrc = readFileSync(join(here, 'panel-conexion-runtime.mjs'), 'utf8');
const autostartSrc = readFileSync(join(here, 'autostart.mjs'), 'utf8');

const panelDiagSrc = readFileSync(join(here, 'panel-cloud-diagnostics.mjs'), 'utf8');
const panelViewsSrc = readFileSync(join(here, 'panel-conexion-views.mjs'), 'utf8');

describe('panel-conexion status chip', () => {
  it('bindStatusChip resolves toast from deps (not outer mount scope)', () => {
    const fnStart = panelConexionSrc.indexOf('function bindStatusChip');
    assert.ok(fnStart >= 0);
    const fnBody = panelConexionSrc.slice(fnStart, fnStart + 900);
    assert.match(fnBody, /const toast = typeof deps\.toast === 'function'/);
    assert.doesNotMatch(fnBody, /refreshCloudSyncDiagnostics\([^)]*\{\s*toast,\s*\}/);
  });

  it('shows a non-silent "sala no protegida" badge and retries the key fetch while unprotected', () => {
    const helperStart = panelConexionSrc.indexOf('function checkRoomUnprotectedBadge');
    const helperEnd = panelConexionSrc.indexOf('\n/** @param {HTMLElement}', helperStart + 1);
    const helperBody = panelConexionSrc.slice(helperStart, helperEnd > helperStart ? helperEnd : undefined);
    assert.match(helperBody, /isRoomUnprotected\(roomId\)/);
    assert.match(helperBody, /retryRoomDekIfUnprotected\(/);

    const fnStart = panelConexionSrc.indexOf('function renderStatusChip');
    const fnEnd = panelConexionSrc.indexOf('\n  function ', fnStart + 1);
    const fnBody = panelConexionSrc.slice(fnStart, fnEnd > fnStart ? fnEnd : undefined);
    assert.match(fnBody, /checkRoomUnprotectedBadge\(deps\)/);
    assert.match(fnBody, /statusDetailText\(/);

    const textFnStart = panelConexionSrc.indexOf('function statusDetailText');
    const textFnEnd = panelConexionSrc.indexOf('\n/** @param {HTMLElement}', textFnStart + 1);
    const textFnBody = panelConexionSrc.slice(textFnStart, textFnEnd > textFnStart ? textFnEnd : undefined);
    assert.match(textFnBody, /'Esta sala no está protegida ahora mismo\.'/);
  });
});

describe('Diagnóstico Nube live pendientes', () => {
  it('wires outbox-changed + poll while open, stops on leave', () => {
    assert.match(panelDiagSrc, /wireDiagnosticsLiveRefresh/);
    assert.match(panelDiagSrc, /CLOUD_OUTBOX_CHANGED_EVENT/);
    assert.match(panelDiagSrc, /stopCloudSyncDiagnosticsLiveRefresh/);
    assert.match(panelViewsSrc, /stopCloudSyncDiagnosticsLiveRefresh/);
    assert.match(panelViewsSrc, /next !== 'nube'/);
  });
});

describe('panel-conexion-runtime auto sync', () => {
  it('mutate bridge flush runs syncCycle (push+pull), not flushOutbox alone', () => {
    assert.match(panelRuntimeSrc, /flush:\s*function\s*\(\)\s*\{[\s\S]*?syncCycle\(\)/);
    assert.doesNotMatch(
      panelRuntimeSrc,
      /flush:\s*function\s*\(\)\s*\{[\s\S]*?flushOutbox\(\)/
    );
  });

  it('seeds sala clinicalOps (equipos) on connect without waiting for a local edit', () => {
    assert.match(panelRuntimeSrc, /syncCloudClinicalOpsOnConnect/);
  });

  it('initial seed uses outbox once (no direct census/lab HTTP push on connect)', () => {
    assert.match(panelRuntimeSrc, /scheduleInitialCloudSeed/);
    assert.match(panelRuntimeSrc, /deferBootCycle:\s*true/);
    assert.doesNotMatch(panelRuntimeSrc, /pushCloudCensusNow/);
    assert.doesNotMatch(panelRuntimeSrc, /pushCloudLabSidecarsNow/);
    assert.doesNotMatch(panelRuntimeSrc, /scheduleCloudSyncPush/);
  });
});

describe('autostart Nube seed', () => {
  it('delegates census/lab seed to panel-conexion-runtime (no duplicate direct push)', () => {
    assert.doesNotMatch(autostartSrc, /pushCloudCensusNow/);
    assert.doesNotMatch(autostartSrc, /pushCloudLabSidecarsNow/);
    assert.match(autostartSrc, /startSharedNubeRuntime/);
  });
});
