#!/usr/bin/env node
/**
 * E2E: the owner's sala gets its own key on any online moment — no sign-in
 * through ⇄ needed. The owner onboards (which creates the monthly sala), adds
 * a patient, keeps working; the sala must end up keyed, the patient stored
 * encrypted for the server, and a second member must still see the patient.
 * DEMO users and patients only.
 *
 * Ways it can go wrong (each one is a check below):
 *   - the sala created at onboarding never gets a key (the 8.4.1 behaviour)
 *   - it gets a key but the chart number stays readable to the server
 *     (name, bed and service stay readable by design: the Interno board and
 *     the admin census read them server-side)
 *   - a member who joins afterwards gets the patient without its chart
 *     number (the first pull ran before the key and was never re-sent)
 *   - a Mac holding the key never does its one full re-download (the
 *     recovery for Macs that already lost fields that way)
 */
import { createRun, dismissLearnHub, closeToasts, pasteAndSave } from './harness.mjs';
import { startWorker, d1Query, nubeDevices, onboardNube, patientVisible, until, BASE } from './nube-worker.mjs';
import { fullLabs } from './some-fixtures.mjs';

globalThis.__RPC_CLOUD_MOBILE_APP_VERSION__ = '8.4.2';
const { createCloudSyncApi } = await import('../../public/js/features/cloud-sync/api-client.mjs');

const tag = Date.now().toString(36).slice(-6);
const OWNER = { username: `demo_own_${tag}`, name: 'Dra. Demo Dueña', rank: 'R4' };
const MEMBER = { username: `demo_mem_${tag}`, name: 'Dr. Demo Miembro', rank: 'R4' }; // R4: no team gate before the list
const P = { exp: '7000701-1', name: 'DEMO LLAVE UNO', room: '301' };

const r = createRun('nube-owner-key');
const { check } = r;
const launchDevice = nubeDevices(r);

const hasKey = (roomId) => /"k":\s*1/.test(d1Query(`SELECT wrapped_dek_ct IS NOT NULL AS k FROM rooms WHERE id = '${roomId}'`));

await r.finish('Owner sala keyed on any online moment', async () => {
  check('local Worker answers /ping', await startWorker());
  const A = await launchDevice('a', 3793);
  await onboardNube(A.page, OWNER);
  await dismissLearnHub(A.page);
  const snap = await A.page.evaluate(() => JSON.parse(globalThis.localStorage.getItem('rpc-cloud-sync-room-meta') || 'null'));
  check('the device remembers it owns the sala', snap?.role === 'owner', snap);

  await A.page.waitForTimeout(1500);
  await dismissLearnHub(A.page); // it can open a moment after onboarding
  await pasteAndSave(A.page, fullLabs(P, 'Sep 26 2026 8:00AM'));
  await closeToasts(A.page);
  // No ⇄ panel, no sign-in: only the app's own sync cycles.
  const keyed = await until(async () => hasKey(snap.id), 60000, 1000);
  check('the sala gets a key without signing in again', keyed);

  const token = await A.page.evaluate(() => globalThis.localStorage.getItem('rpc-cloud-sync-token') || globalThis.sessionStorage.getItem('rpc-cloud-sync-token'));
  const serverView = createCloudSyncApi({ getBaseUrl: () => BASE, getToken: () => token, getRoomDek: () => null });
  const sealed = await until(async () => {
    const data = await serverView.pull(snap.id, 0);
    return !JSON.stringify(data).includes(P.exp);
  }, 60000, 2000);
  check('the server no longer holds the chart number in the clear', sealed);

  const B = await launchDevice('b', 3794);
  await onboardNube(B.page, MEMBER);
  await dismissLearnHub(B.page);
  await B.page.waitForTimeout(1500);
  await dismissLearnHub(B.page);
  const seen = await until(async () => patientVisible(B.page, P), 60000, 1000);
  await r.shot(B.page, 'member-sees-patient');
  check('a member who joins afterwards gets the patient with its chart number', seen);

  // Recovery for Macs hit by the 8.4.1 onboarding drop: one full re-pull per
  // keyed sala, remembered so it never repeats.
  const repulled = async (dev) => until(async () => (await dev.page.evaluate(() => globalThis.localStorage.getItem('rpc-cloud-keyed-repull-v1') || '')).includes(snap.id), 30000, 1000);
  check('the owner’s Mac re-downloads the keyed sala once', await repulled(A));
  check('the member’s Mac re-downloads the keyed sala once', await repulled(B));

  check('no uncaught page errors', !A.pageErrors.length && !B.pageErrors.length, [...A.pageErrors, ...B.pageErrors].slice(0, 5));
  await B.app.close();
  await A.app.close();
});
