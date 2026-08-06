import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  claimUsername,
  ensureClinicalUser,
  provisionClinicalUserFromCloudIdentity,
  resolveBootstrapClinicalUser,
  setClinicalUserProfileFromAdmin,
} from './clinical-access-users.mjs';
import { createUnlockedDbManager } from './test-open-db.mjs';

/** @type {string | undefined} */
let tmpDir;
/** @type {Awaited<ReturnType<typeof createUnlockedDbManager>> | undefined} */
let dbManager;

afterEach(async () => {
  if (dbManager) {
    await dbManager.lock();
    dbManager = undefined;
  }
  if (tmpDir) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = undefined;
  }
});

describe('provisionClinicalUserFromCloudIdentity', () => {
  it('creates clinical user for valid cloud username', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rplus-provision-'));
    dbManager = await createUnlockedDbManager(tmpDir);
    const profile = await dbManager.withTransaction((db) =>
      provisionClinicalUserFromCloudIdentity(db, {
        username: 'clouduser',
        displayName: 'Cloud User',
        rank: 'R2',
      })
    );
    assert.equal(profile.username, 'clouduser');
    assert.equal(profile.clinical_name, 'Cloud User');
    assert.equal(profile.rank, 'R2');
  });

  it('returns existing user without duplicating', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rplus-provision-'));
    dbManager = await createUnlockedDbManager(tmpDir);
    const first = await dbManager.withTransaction((db) =>
      provisionClinicalUserFromCloudIdentity(db, { username: 'sameuser', displayName: 'A' })
    );
    const second = await dbManager.withTransaction((db) =>
      provisionClinicalUserFromCloudIdentity(db, { username: 'sameuser', displayName: 'B' })
    );
    assert.equal(first.user_id, second.user_id);
    assert.equal(second.clinical_name, 'A');
  });

  it('rejects invalid username', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rplus-provision-'));
    dbManager = await createUnlockedDbManager(tmpDir);
    await assert.rejects(
      () =>
        dbManager.withTransaction((db) =>
          provisionClinicalUserFromCloudIdentity(db, { username: 'ab' })
        ),
      /Usuario inválido/
    );
  });
});

describe('setClinicalUserProfileFromAdmin', () => {
  it('updates rank on existing user', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rplus-provision-'));
    dbManager = await createUnlockedDbManager(tmpDir);
    await dbManager.withTransaction((db) =>
      provisionClinicalUserFromCloudIdentity(db, { username: 'r2user', displayName: 'Test', rank: 'R1' })
    );
    const profile = await dbManager.withTransaction((db) =>
      setClinicalUserProfileFromAdmin(db, { username: 'r2user', rank: 'R2' })
    );
    assert.equal(profile.rank, 'R2');
  });
});

describe('resolveBootstrapClinicalUser', () => {
  it('keeps preferredUserId when preferredUsername differs (no second peer row)', async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rplus-bootstrap-'));
    dbManager = await createUnlockedDbManager(tmpDir);
    const bound = await dbManager.withTransaction((db) => {
      const created = ensureClinicalUser(db, { clientId: 'device-a', rank: 'R1' });
      claimUsername(db, { userId: created.userId, username: 'drmauricios' });
      return created;
    });
    const resolved = await dbManager.withTransaction((db) =>
      resolveBootstrapClinicalUser(db, {
        clientId: 'device-a',
        preferredUserId: bound.userId,
        preferredUsername: 'drmauriciosalas2',
      })
    );
    assert.equal(resolved.userId, bound.userId);
    assert.equal(resolved.username, 'drmauricios');
    const count = await dbManager.withTransaction((db) =>
      db.prepare('SELECT COUNT(*) AS n FROM users').get()
    );
    assert.equal(count.n, 1);
  });
});
