#!/usr/bin/env node
/* global process, console, fetch, performance */
/**
 * Two-device load check against a STAGING Worker (never pass the live URL).
 *
 *   STAGING_URL=https://rplus-sync-staging.<acct>.workers.dev node scripts/staging-load.mjs [patients] [deletes]
 *
 * Device A registers, makes a room, seeds N synthetic patients, deletes M of
 * them the way the admin bulk delete does. Device B joins the room and pulls
 * from 0 and again incrementally. Prints timings and whether B sees the same
 * patients as A. Synthetic data only.
 */
const URL_BASE = String(process.env.STAGING_URL || '').replace(/\/$/, '');
if (!/staging/i.test(URL_BASE)) {
  console.error('Set STAGING_URL to the staging Worker (its host must contain "staging").');
  process.exit(1);
}
const PATIENTS = Number(process.argv[2] || 300);
const DELETES = Number(process.argv[3] || 74);
const BASE = `${URL_BASE}/api/sync/v1`;
const nowIso = () => new Date().toISOString();

async function api(pathname, { method = 'GET', body, token } = {}) {
  const res = await fetch(BASE + pathname, {
    method,
    headers: { 'content-type': 'application/json', 'x-app-version': '9.9.9', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${pathname} -> ${res.status} ${JSON.stringify(data)}`);
  return data;
}

const register = async (tag) =>
  (await api('/auth/register', {
    method: 'POST',
    body: { username: `load_${tag}_${Date.now().toString(36)}`, password: 'Demo-e2e-Pass-2026!', displayName: `Demo ${tag}`, appVersion: '9.9.9' },
  })).token;

const A = await register('a');
const B = await register('b');
const { room } = await api('/rooms', { method: 'POST', token: A, body: { name: 'Sala 2 load', sala: 'Sala 2' } });
await api('/rooms/join', { method: 'POST', token: B, body: { code: room.code } });

let rev = 0;
const timed = async (fn) => { const t = performance.now(); const r = await fn(); return [r, Math.round(performance.now() - t)]; };
const push = async (ops, label) => {
  const [res, ms] = await timed(() => api(`/rooms/${room.id}/mutations`, {
    method: 'POST', token: A, body: { clientMutationId: `${label}-${Math.random()}`, ops, baseRevision: rev },
  }));
  rev = res.revision;
  return ms;
};

const note = 'Nota sintetica de prueba. '.repeat(160);
const ids = Array.from({ length: PATIENTS }, (_, i) => `demo-${String(i).padStart(3, '0')}`);
const seedTimes = [];
for (let i = 0; i < ids.length; i += 8) {
  const ops = [];
  for (const id of ids.slice(i, i + 8)) {
    ops.push({ path: `entries/${id}/fields`, value: { nombre: `PACIENTE DEMO ${id}`, cama: id }, updatedAt: nowIso(), actorId: 'load' });
    ops.push({ path: `entries/${id}/note`, value: note, updatedAt: nowIso(), actorId: 'load' });
  }
  seedTimes.push(await push(ops, 'seed'));
}

const [pullB0, pullB0Ms] = await timed(() => api(`/rooms/${room.id}/pull?since=0`, { token: B }));
const bRev = pullB0.revision;

const victims = ids.slice(0, DELETES);
const delTimes = [];
let errors = 0;
for (let i = 0; i < victims.length; i += 64) {
  const ops = victims.slice(i, i + 64).map((id) => ({ path: `tombstones/${id}`, value: { deletedAt: nowIso() }, updatedAt: nowIso(), actorId: 'load' }));
  try { delTimes.push(await push(ops, 'del')); } catch (e) { errors += 1; console.error(String(e.message).slice(0, 300)); }
}

const [pullB1, pullB1Ms] = await timed(() => api(`/rooms/${room.id}/pull?since=${bRev}`, { token: B }));
const [pullA, ] = await timed(() => api(`/rooms/${room.id}/pull?since=0`, { token: A }));
const idsOf = (s) => (s?.entries || []).map((e) => e.id).sort().join(',');
const bEntries = pullB1.state ? idsOf(pullB1.state) : null;
const max = (a) => Math.max(0, ...a);
console.log(JSON.stringify({
  patientsSeeded: PATIENTS,
  seedPushes: seedTimes.length, seedMaxMs: max(seedTimes),
  deletePushes: delTimes.length, deleteMaxMs: max(delTimes), deleteErrors: errors,
  deviceBFirstPullMs: pullB0Ms, deviceBFirstPullEntries: pullB0.state?.entries?.length,
  deviceBAfterDeleteMs: pullB1Ms, deviceBGotOps: Array.isArray(pullB1.ops) ? pullB1.ops.length : null, deviceBGotSnapshot: !!pullB1.needSnapshot,
  deviceAEntries: pullA.state?.entries?.length, expectedEntries: PATIENTS - DELETES,
  deviceBMatchesA: bEntries == null ? 'n/a (B got ops, not a snapshot)' : bEntries === idsOf(pullA.state),
}, null, 2));
