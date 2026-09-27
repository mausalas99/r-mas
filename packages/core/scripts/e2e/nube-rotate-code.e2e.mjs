#!/usr/bin/env node
/**
 * E2E (Node + the local sync Worker, no Electron): admin «Cambiar código» on a
 * sala whose content is encrypted. Drives the app's own API client and key
 * code (room-dek.mjs) against the real Worker and its D1. DEMO users only.
 *
 * Ways it can go wrong (each one is a check below):
 *   - the code changes but the sala's key stays locked under the old code
 *   - an admin who is NOT in the sala cannot change its code
 *   - an older app (no key in the request) can still change a locked sala's code
 *   - the new code does not let a member open the key; the old one still does
 *   - a sala without a key cannot get a new code
 */
import { createRun } from './harness.mjs';
import { startWorker, BASE, PASSWORD, d1Query } from './nube-worker.mjs';

globalThis.__RPC_CLOUD_MOBILE_APP_VERSION__ = '8.4.2';
const { createCloudSyncApi } = await import('../../public/js/features/cloud-sync/api-client.mjs');
const dekMod = await import('../../public/js/features/cloud-sync/room-dek.mjs');
const { encryptValue, decryptValue } = await import('../../public/js/features/cloud-sync/crypto.mjs');

const r = createRun('nube-rotate-code');
const { check } = r;
const tag = Date.now().toString(36).slice(-6);

const client = (token, adminKey = '') =>
  createCloudSyncApi({ getBaseUrl: () => BASE, getToken: () => token, getAdminKey: () => adminKey, getRoomDek: () => null });

async function account(username) {
  const res = await client('').register({ username, password: PASSWORD, displayName: 'Demo ' + username });
  return res.token;
}

await r.finish('Cambiar código keeps the sala key in step', async () => {
  check('local Worker answers /ping', await startWorker());

  // Owner: a sala with a key (as «Crear sala» makes it).
  const ownerToken = await account(`demo_own_${tag}`);
  const owner = client(ownerToken);
  const { room } = await owner.ensureTurn({ sala: 'Sala E', turnKey: '2099-01' });
  const dek = await dekMod.ensureRoomDek(owner, room.id, room.code);
  check('the sala has a key locked with its code', !!dek && /1/.test(d1Query(`SELECT wrapped_dek_ct IS NOT NULL AS k FROM rooms WHERE id = '${room.id}'`)));
  const sample = await encryptValue(dek, { dx: 'DEMO NAC' });

  // Admin on another Mac, not a member of that sala.
  dekMod.clearRoomDekCache();
  const adminToken = await account(`demo_adm_${tag}`);
  const admin = client(adminToken, 'e2e-admin-key');

  // An older app sends {} — refused, nothing changes.
  const oldApp = await admin.adminRotateCode(room.id, {}).then(() => null, (err) => err);
  const codeAfterOld = (await admin.adminRoom(room.id)).room.code;
  check('an older app cannot change a locked sala’s code', oldApp?.data?.error === 'dek_rewrap_required' && codeAfterOld === room.code, { err: oldApp?.data, codeAfterOld });

  const plan = await dekMod.planRoomCodeChange(admin, room.id);
  check('an admin outside the sala can open its key with the current code', plan.kind === 'key', plan.kind);
  const { code: newCode, relocked } = await dekMod.rotateRoomCodeAtomically(admin, room.id, plan);
  check('the code changes and the key is re-locked in the same step', relocked && newCode !== room.code, { newCode, old: room.code });
  check('the admin device did not keep that sala’s key', dekMod.getCachedRoomDek(room.id) === null);

  // A member opening the sala fresh: the new code works, the old one does not.
  dekMod.clearRoomDekCache();
  check('the old code no longer opens the key', (await dekMod.loadRoomDek(owner, room.id, room.code)) === null);
  dekMod.clearRoomDekCache();
  const reopened = await dekMod.loadRoomDek(owner, room.id, newCode);
  const read = reopened ? await decryptValue(reopened, sample).catch(() => null) : null;
  check('the new code opens the same key (old content still reads)', read?.dx === 'DEMO NAC', read);

  // A sala with no key just gets a new code.
  const { room: plain } = await owner.ensureTurn({ sala: 'Torre HU', turnKey: '2099-01' });
  const plainPlan = await dekMod.planRoomCodeChange(admin, plain.id);
  const plainRes = await dekMod.rotateRoomCodeAtomically(admin, plain.id, plainPlan);
  check('a sala with no key gets a new code, nothing to re-lock', plainPlan.kind === 'none' && !plainRes.relocked && plainRes.code !== plain.code, { plainPlan: plainPlan.kind, plainRes });
});
