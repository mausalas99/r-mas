import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createDbManager } from './db-manager.mjs';

const mockSafe = {
  isEncryptionAvailable: () => true,
  encryptString: (s) => Buffer.from('enc:' + s).toString('base64'),
  decryptString: (s) => Buffer.from(s, 'base64').toString('utf8').replace(/^enc:/, ''),
};

describe('db-manager', () => {
  function makeUserDataDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'rplus-dbmgr-'));
  }

  function createManager(userDataPath) {
    return createDbManager({
      userDataPath,
      safeStorage: mockSafe,
      getClientId: () => 'test-client',
    });
  }

  it('unlock opens db and isUnlocked true', async () => {
    const tmpDir = makeUserDataDir();
    const mgr = createManager(tmpDir);
    assert.equal(mgr.isUnlocked(), false);
    assert.equal(mgr.getState(), 'locked');
    await mgr.unlockWithPassphrase('test-passphrase', { remember: false });
    assert.equal(mgr.isUnlocked(), true);
    assert.equal(mgr.getState(), 'unlocked');
    assert.ok(mgr.getDb());
    mgr.lock();
    assert.equal(mgr.isUnlocked(), false);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('withTransaction rolls back when fn throws after blob insert and audit', async () => {
    const tmpDir = makeUserDataDir();
    const mgr = createManager(tmpDir);
    await mgr.unlockWithPassphrase('rollback-pass', { remember: false });

    const auditBefore = mgr
      .getDb()
      .prepare('SELECT COUNT(*) AS c FROM forensic_audit_chain')
      .get().c;

    await assert.rejects(
      () =>
        mgr.withTransaction((db, { audit }) => {
          db.prepare(
            `INSERT INTO clinical_blob (namespace, blob_key, json, updated_at)
             VALUES ('desktop', ?, ?, ?)`
          ).run('patients', '[]', new Date().toISOString());
          audit('test-client', 'clinical.patients.save', { action: 'test' });
          throw new Error('abort transaction');
        }),
      /abort transaction/
    );

    const blobCount = mgr.getDb().prepare('SELECT COUNT(*) AS c FROM clinical_blob').get().c;
    const auditAfter = mgr
      .getDb()
      .prepare('SELECT COUNT(*) AS c FROM forensic_audit_chain')
      .get().c;
    assert.equal(blobCount, 0);
    assert.equal(auditAfter, auditBefore);
    mgr.lock();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
