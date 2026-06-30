import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { clinicalSessionContext } from '../clinical-session-context.mjs';
import { isClinicalScopeReadyForLanPatientApply } from './scope-lan.mjs';

function mockDesktopElectron() {
  globalThis.window = {
    electronAPI: { dbClinicalLoadAll: async () => ({ ok: true, blobs: {} }) },
  };
}

beforeEach(() => {
  mockDesktopElectron();
  clinicalSessionContext.user = { user_id: 'u1', rank: 'R1', username: 'r1doc' };
  clinicalSessionContext.scopeContext = null;
});

afterEach(() => {
  clinicalSessionContext.user = null;
  clinicalSessionContext.scopeContext = null;
  delete globalThis.window;
});

describe('isClinicalScopeReadyForLanPatientApply', () => {
  it('allows desktop LAN push/apply before scopeContext hydrate', () => {
    assert.equal(isClinicalScopeReadyForLanPatientApply(), true);
  });
});
