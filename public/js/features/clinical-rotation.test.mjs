import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  isIncomingPreviewWindow,
  isChartLockedForPatient,
  syncRotationConfigButton,
} from './clinical-rotation.mjs';
import { clinicalSessionContext } from '../clinical-access-runtime.mjs';

// `npm run test:one` runs through Electron's Node runtime with no `document`
// (see scripts/run-with-electron-node.mjs), so the workbench confirm scrim
// used by confirmNuevaRotacion can't be mounted here. We assert on the source
// directly instead: the destructive confirm carries the right copy, and the
// rotation call only runs after the guard on the resolved result.
const rotationSrc = readFileSync(fileURLToPath(new URL('./clinical-rotation.mjs', import.meta.url)), 'utf8');

describe('clinical-rotation preview window', () => {
  const cycle = {
    preview_start_at: '2026-05-30T00:00:00.000Z',
    effective_at: '2026-06-01T00:00:00.000Z',
  };

  it('preview window is active between preview_start and effective', () => {
    assert.equal(isIncomingPreviewWindow(cycle, new Date('2026-05-31T12:00:00Z')), true);
    assert.equal(
      isChartLockedForPatient({ effective_at: cycle.effective_at }, new Date('2026-05-31T12:00:00Z')),
      true
    );
  });

  it('returns false before preview_start_at', () => {
    assert.equal(isIncomingPreviewWindow(cycle, new Date('2026-05-29T23:59:59Z')), false);
  });

  it('returns false at or after effective_at', () => {
    assert.equal(isIncomingPreviewWindow(cycle, new Date('2026-06-01T00:00:00Z')), false);
    assert.equal(isIncomingPreviewWindow(cycle, new Date('2026-06-02T00:00:00Z')), false);
  });

  it('returns false when cycle is missing dates', () => {
    assert.equal(isIncomingPreviewWindow(null, new Date()), false);
    assert.equal(isIncomingPreviewWindow({}, new Date()), false);
  });

  it('syncRotationConfigButton hides control for non-R4 users', () => {
    if (typeof document === 'undefined') return;
    document.body.innerHTML =
      '<button type="button" id="btn-rotation-config-open"></button>';
    const prev = clinicalSessionContext.user;
    clinicalSessionContext.user = { rank: 'R2' };
    syncRotationConfigButton();
    assert.equal(document.getElementById('btn-rotation-config-open').hidden, true);
    clinicalSessionContext.user = { rank: 'R4' };
    syncRotationConfigButton();
    assert.equal(document.getElementById('btn-rotation-config-open').hidden, false);
    clinicalSessionContext.user = prev;
  });

  it('unlock chart when now is at or past assignment effective_at', () => {
    assert.equal(
      isChartLockedForPatient({ effective_at: '2026-06-01T00:00:00.000Z' }, new Date('2026-06-01T00:00:00Z')),
      false
    );
    assert.equal(
      isChartLockedForPatient({ effective_at: '2026-06-01T00:00:00.000Z' }, new Date('2026-06-02T00:00:00Z')),
      false
    );
  });

  it('confirmNuevaRotacion requests a destructive confirm before archiving teams', () => {
    const start = rotationSrc.indexOf('export async function confirmNuevaRotacion');
    assert.notEqual(start, -1);
    const nextExport = rotationSrc.indexOf('\nexport ', start + 1);
    const body = rotationSrc.slice(start, nextExport === -1 ? rotationSrc.length : nextExport);
    assert.match(body, /openConfirm\(\{/);
    assert.match(body, /weight:\s*'destructive'/);
    assert.match(body, /¿Iniciar nueva rotación\?/);
    const confirmIdx = body.indexOf('openConfirm(');
    const guardIdx = body.indexOf("if (result !== 'confirm')");
    const nuevaFnIdx = body.indexOf('nuevaFn.call(api');
    assert.ok(confirmIdx > -1 && guardIdx > confirmIdx, 'the confirm guard must follow the openConfirm call');
    assert.ok(nuevaFnIdx > guardIdx, 'the rotation call must run only after the confirm guard');
  });
});
