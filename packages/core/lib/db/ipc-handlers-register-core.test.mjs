import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createDbManager } from './db-manager.mjs';
import { getBlob } from './clinical-blobs.mjs';
import { listActiveTeams, listTeamMembers } from './clinical-access-teams-core.mjs';
import { findClinicalUserByUsername } from './clinical-access-users.mjs';
import { registerDbCoreHandlers } from './ipc-handlers-register-core.mjs';
import { UI_TEST_USERNAME } from '../ui-test-seed.mjs';

const mockSafe = {
  isEncryptionAvailable: () => true,
  encryptString: (s) => Buffer.from('enc:' + s).toString('base64'),
  decryptString: (s) => Buffer.from(s, 'base64').toString('utf8').replace(/^enc:/, ''),
};

function fakeIpcMain() {
  const handlers = new Map();
  return {
    handle: (channel, fn) => handlers.set(channel, fn),
    invoke: (channel, payload) => handlers.get(channel)(null, payload),
  };
}

describe('ipc-handlers-register-core: UI test mode seeding', () => {
  const tmpDirs = [];
  afterEach(() => {
    delete process.env.R_PLUS_UI_TEST_MODE;
    while (tmpDirs.length) fs.rmSync(tmpDirs.pop(), { recursive: true, force: true });
  });

  function makeCtx() {
    const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'rplus-ipc-core-'));
    tmpDirs.push(userDataPath);
    const dbManager = createDbManager({ userDataPath, safeStorage: mockSafe, getClientId: () => 'test-client' });
    const ipcMain = fakeIpcMain();
    const ctx = { ipcMain, dbManager, userDataPath: () => userDataPath };
    registerDbCoreHandlers(ctx);
    return { ipcMain, dbManager };
  }

  it('db:auto-unlock seeds the synthetic roster on a fresh profile\'s first boot unlock', async () => {
    process.env.R_PLUS_UI_TEST_MODE = '1';
    const { ipcMain, dbManager } = makeCtx();
    const res = await ipcMain.invoke('db:auto-unlock', { lsSnapshot: {} });
    assert.equal(res.ok, true);
    const db = dbManager.getDb();
    assert.ok(getBlob(db, 'patients'), 'patients roster should be seeded');
    assert.equal(listActiveTeams(db).length, 8);
    const user = findClinicalUserByUsername(db, UI_TEST_USERNAME);
    assert.ok(user, 'uitest account should be seeded');
    const salaOneTeam = listActiveTeams(db).find((t) => t.sala === 'Sala 1');
    assert.ok(listTeamMembers(db, salaOneTeam.team_id).some((m) => m.user_id === user.userId));
  });

  it('does not seed when R_PLUS_UI_TEST_MODE is unset (real app boot)', async () => {
    const { ipcMain, dbManager } = makeCtx();
    await ipcMain.invoke('db:auto-unlock', { lsSnapshot: {} });
    const db = dbManager.getDb();
    assert.equal(getBlob(db, 'patients'), null);
    assert.equal(listActiveTeams(db).length, 0);
    assert.equal(findClinicalUserByUsername(db, UI_TEST_USERNAME), null);
  });
});
