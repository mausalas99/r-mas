import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import {
  isInheritPatientsHandoffWindow,
  shouldShowInheritPatientsUi,
} from './teams-roster-inherit-gate.mjs';
import { setRotationRejoinPending } from '../clinical-rotation-rejoin-modal.mjs';

const cycle = {
  preview_start_at: '2026-05-30T00:00:00.000Z',
  effective_at: '2026-06-01T00:00:00.000Z',
};

describe('teams-roster-inherit-gate', () => {
  it('is open during preview window or rotation rejoin pending', () => {
    assert.equal(isInheritPatientsHandoffWindow(cycle, new Date('2026-05-31T12:00:00Z')), true);
    assert.equal(isInheritPatientsHandoffWindow(cycle, new Date('2026-05-29T00:00:00Z')), false);
    const store = { 'rpc-rotation-rejoin-pending': '1' };
    const prevLs = globalThis.localStorage;
    globalThis.localStorage = {
      getItem(k) {
        return store[k] ?? null;
      },
      setItem(k, v) {
        store[k] = v;
      },
      removeItem(k) {
        delete store[k];
      },
    };
    try {
      assert.equal(isInheritPatientsHandoffWindow(null, new Date('2026-05-29T00:00:00Z')), true);
    } finally {
      if (prevLs === undefined) delete globalThis.localStorage;
      else globalThis.localStorage = prevLs;
    }
    setRotationRejoinPending(false);
  });

  it('shouldShowInheritPatientsUi reads scope cycle', () => {
    const prev = clinicalSessionContext.scopeContext;
    try {
      clinicalSessionContext.scopeContext = { cycle };
      assert.equal(shouldShowInheritPatientsUi(new Date('2026-05-31T12:00:00Z')), true);
      assert.equal(shouldShowInheritPatientsUi(new Date('2026-05-20T12:00:00Z')), false);
    } finally {
      clinicalSessionContext.scopeContext = prev;
    }
  });
});
