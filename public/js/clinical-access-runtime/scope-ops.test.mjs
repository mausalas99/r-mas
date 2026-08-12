import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { clinicalSessionContext } from '../clinical-session-context.mjs';
import { isClinicalScopeReadyForPatientApply } from './scope-ops.mjs';

function mockDesktopElectron() {
  globalThis.window = {
    electronAPI: { dbClinicalLoadAll: async () => ({ ok: true, blobs: {} }) },
  };
}

function mockMobileWeb() {
  globalThis.__RPC_MOBILE_WEB__ = true;
  globalThis.window = {};
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
  delete globalThis.__RPC_MOBILE_WEB__;
});

describe('isClinicalScopeReadyForPatientApply', () => {
  it('allows desktop LAN push/apply before scopeContext hydrate', () => {
    assert.equal(isClinicalScopeReadyForPatientApply(), true);
  });

  it('blocks iPad until user has a joined team in LAN scope', () => {
    mockMobileWeb();
    assert.equal(isClinicalScopeReadyForPatientApply(), false);
    clinicalSessionContext.scopeContext = {
      teams: [
        {
          team_id: 'team-a',
          members: [{ user_id: 'u1', username: 'r1doc' }],
        },
      ],
      assignments: [],
      guardias: [],
    };
    assert.equal(isClinicalScopeReadyForPatientApply(), true);
  });
});
