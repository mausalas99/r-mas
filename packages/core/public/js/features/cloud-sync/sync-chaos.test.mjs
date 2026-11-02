/**
 * Nube sync chaos + ledger. Two (+1 fresh) synthetic devices talk to the REAL Worker
 * (handleSync on SQLite) and apply pulls with the REAL pull-apply code. Faults: partial
 * payloads, dropped requests, dropped acks, replays, late (out-of-order) pull responses.
 *
 * Rules checked after the network settles (seeded, so every failure replays):
 *   1. devices equal each other, the server and a fresh catch-up device
 *   2. note / indicaciones == the newest edit (nothing blanked by a payload that lacked it)
 *   3. ledger: count + checksum of notes and lab sets match on every side
 *
 * Replay one failure: CHAOS_SEED=123 npm run test:one -- public/js/features/cloud-sync/sync-chaos.test.mjs
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { handleSync } from '../../../../cloud/sync-worker/src/sync.js';
import { sqliteD1, seedUser } from '../../../../cloud/sync-worker/src/test-sqlite-d1.mjs';
import {
  getPatients, getNotes, getIndicaciones, getLabHistory,
} from '../../app-state.mjs';
import { resetLabHistoryCacheForTests } from '../../lab-history-cache.mjs';
import { configurePatientEntries, orphanLabSetsForTests } from '../sync-apply/patient-entries.mjs';
import { applyCloudOps, applyCloudState } from './pull-apply.mjs';
import { pushCensusFieldsOp, buildLabSidecarOpsForPatient, cloudOp } from './mutate-bridge-ops.mjs';
import { buildPatientAdmitOpsForCloud } from './cloud-census-sala-push.mjs';
import { chunkCloudOps } from './cloud-push-direct.mjs';

const KEY = 'cd'.repeat(32);
// CHAOS_SEEDS=200 for a long soak; default stays quick for CI.
const SEEDS = process.env.CHAOS_SEED
  ? [Number(process.env.CHAOS_SEED)]
  : Array.from({ length: Number(process.env.CHAOS_SEEDS) || 12 }, (_, i) => i + 1);

/** Small seeded PRNG (mulberry32). */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One fake clock for the whole run. The app stamps repushes with Date.now(); real wall time
// would sit far ahead of the fake edit clocks and win every later last-write-wins race.
let nowTick = 0;
const realNow = Date.now;
const iso = (tick) => new Date(Date.UTC(2026, 9, 1) + tick * 1000).toISOString();
const sha = (s) => createHash('sha256').update(s).digest('hex');
const stable = (v) => JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1))) : x));

/* ---------- device = a saved copy of the renderer globals ---------- */

function swapIn(dev) {
  getPatients().length = 0;
  getPatients().push(...structuredClone(dev.s.patients));
  for (const [get, key] of [[getNotes, 'notes'], [getIndicaciones, 'ind'], [getLabHistory, 'labs']]) {
    const live = get();
    for (const k of Object.keys(live)) delete live[k];
    Object.assign(live, structuredClone(dev.s[key]));
  }
  resetLabHistoryCacheForTests();
  orphanLabSetsForTests().clear();
  for (const [k, v] of dev.s.orphans) orphanLabSetsForTests().set(k, structuredClone(v));
}
function swapOut(dev) {
  dev.s = {
    patients: structuredClone(getPatients()),
    notes: structuredClone(getNotes()),
    ind: structuredClone(getIndicaciones()),
    labs: structuredClone(getLabHistory()),
    orphans: structuredClone([...orphanLabSetsForTests()]),
  };
}
async function onDevice(dev, fn) {
  swapIn(dev);
  try {
    return await fn();
  } finally {
    swapOut(dev);
  }
}
const newDevice = (name) => ({ name, rev: 0, queue: [], s: { patients: [], notes: {}, ind: {}, labs: {}, orphans: [] }, seq: 0, lastPulls: [], known: new Map() });

configurePatientEntries({
  ensureUniquePatientName: (n) => String(n || 'PACIENTE'),
  applyImportEntry: (e) => String(e?.patient?.id || 'x'),
  findPatientByRegistro: (reg) => getPatients().find((p) => p.registro === reg) || null,
});

/* ---------- room ---------- */

let roomSeq = 0;
async function makeRoom(userCount) {
  const d1 = sqliteD1();
  const roomId = `room-chaos-${++roomSeq}`; // the push budget is per room id
  const env = { DB: d1, WORKER_DATA_KEY: KEY };
  for (let i = 0; i < userCount; i += 1) await seedUser(d1, { env, id: `u${i}`, token: `tok-u${i}`, roomId });
  return { d1, roomId, env };
}
const hdr = (i) => ({ Authorization: `Bearer tok-u${i}`, 'Content-Type': 'application/json' });
async function serverPush(room, i, body) {
  const req = new Request(`https://x/api/sync/v1/rooms/${room.roomId}/mutations`, { method: 'POST', headers: hdr(i), body: JSON.stringify(body) });
  return (await handleSync(req, room.env, room.roomId, 'mutations')).json();
}
async function serverPull(room, i, since) {
  const req = new Request(`https://x/api/sync/v1/rooms/${room.roomId}/pull?since=${since}`, { headers: hdr(i) });
  return (await handleSync(req, room.env, room.roomId, 'pull')).json();
}

/* ---------- device actions (op shapes come from the app's own builders) ---------- */

async function applyPull(dev, res) {
  // Wire clocks this device now knows (same role as the app's echo guard).
  const fieldsOn = (o) => (o?.path?.endsWith('/fields') ? [[o.path.split('/')[1], o.value?.lanUpdatedAt]] : []);
  const wire = res.needSnapshot ? (res.state.entries || []).map((e) => [e.id, e.fields?.lanUpdatedAt]) : (res.ops || []).flatMap(fieldsOn);
  await onDevice(dev, async () => {
    if (res.needSnapshot) await applyCloudState(res.state);
    else if (res.ops?.length) await applyCloudOps(res.ops);
  });
  for (const [pid, at] of wire) if (at && at > (dev.known.get(pid) || '')) dev.known.set(pid, at);
  // The app re-pushes census fields it holds that the room lacks (censusRepushNeeded).
  const repush = [];
  for (const p of dev.s.patients) {
    if (!p.lanUpdatedAt || p.lanUpdatedAt <= (dev.known.get(p.id) || '')) continue;
    pushCensusFieldsOp(repush, p.id, p, `u${dev.name}`);
    dev.known.set(p.id, p.lanUpdatedAt);
  }
  if (repush.length) dev.queue.push({ mid: `${dev.name}-${dev.seq++}`, ops: repush });
  dev.rev = Math.max(dev.rev, res.revision);
}

async function doPull(room, dev, idx, faults) {
  const res = await serverPull(room, idx, dev.rev);
  dev.lastPulls.push(res);
  if (faults.drop) return; // response lost: device keeps its old revision
  await applyPull(dev, res);
  if (faults.replay) await applyPull(dev, res);
  // A late copy of an OLDER response arrives after a newer one.
  if (faults.late && dev.lastPulls.length > 1) await applyPull(dev, dev.lastPulls[dev.lastPulls.length - 2]);
}

async function doPush(room, dev, idx, pick, faults) {
  if (!dev.queue.length) return;
  const at = pick ? Math.floor(pick * dev.queue.length) : 0; // out-of-order when pick given
  const batch = dev.queue[at];
  if (faults.dropBefore) return; // request lost: nothing reached the server
  await serverPush(room, idx, { clientMutationId: batch.mid, baseRevision: dev.rev, ops: batch.ops });
  if (faults.dupe) await serverPush(room, idx, { clientMutationId: batch.mid, baseRevision: dev.rev, ops: batch.ops });
  if (faults.dropAck) return; // server has it, device does not know: it will resend (replay)
  dev.queue.splice(at, 1);
}

/** One fresh edit on the device's own copy; returns the batches it queues. Records the oracle in `ledger`. */
const EDITS = {
  admit(dev, p, { pid, at, actorId, rand, ledger }) {
    if (p) return [];
    const patient = { id: pid, nombre: `PAC ${pid}`, registro: `R${pid}`, cama: '1', lanUpdatedAt: at };
    getPatients().unshift(patient);
    dev.known.set(pid, at);
    const ops = buildPatientAdmitOpsForCloud(patient, actorId);
    // partial payload: sometimes only the root op, sometimes only fields
    const cut = rand();
    const sent = cut < 0.33 ? ops.slice(0, 1) : cut < 0.66 ? ops.slice(-1) : ops;
    ledger.admitted.add(pid);
    if (sent.some((o) => o.path.endsWith('/fields'))) ledger.named.add(pid); // a real name left this device
    return [sent];
  },
  doc(kind) {
    return (dev, p, { pid, at, actorId, tick, ledger }) => {
      if (!p) return [];
      const store = kind === 'note' ? getNotes() : getIndicaciones();
      const text = `${kind}-${pid}-${tick}`;
      store[pid] = { ...(store[pid] || {}), evolucion: text, updatedAt: at };
      ledger.docs.push({ pid, kind, at, actorId, text });
      return [[cloudOp({ path: `entries/${pid}/${kind === 'note' ? 'note' : 'indicaciones'}`, value: store[pid], updatedAt: at, actorId })]];
    };
  },
  fields(dev, p, { pid, at, actorId, rand, ledger }) {
    if (!p) return [];
    p.cama = String(1 + Math.floor(rand() * 40));
    p.lanUpdatedAt = at;
    dev.known.set(pid, at);
    const ops = [];
    pushCensusFieldsOp(ops, pid, p, actorId);
    if (!/SIN NOMBRE/.test(p.nombre)) ledger.named.add(pid);
    return [ops];
  },
  lab(dev, p, { pid, at, actorId, tick, ledger }) {
    if (!p) return [];
    const set = { id: `lab-${pid}-${tick}`, fecha: at.slice(0, 10), hora: at.slice(11, 16), updatedAt: at, resLabs: [`Na ${100 + tick}`] }; // unique values: identical sets are deduped on purpose
    (getLabHistory()[pid] ||= []).push(set);
    ledger.labs.set(`${pid}/${set.id}`, set);
    return [buildLabSidecarOpsForPatient(pid, [set], { actorId, updatedAt: at })];
  },
};
EDITS.note = EDITS.doc('note');
EDITS.ind = EDITS.doc('ind');

async function edit(dev, kind, pid, tick, rand, ledger) {
  const ctx = { pid, tick, rand, ledger, actorId: `u${dev.name}`, at: iso(tick) };
  const ops = await onDevice(dev, async () => EDITS[kind](dev, getPatients().find((x) => x.id === pid), ctx));
  for (const batch of ops) dev.queue.push({ mid: `${dev.name}-${dev.seq++}`, ops: batch });
}

/* ---------- settle + snapshot ---------- */

async function settle(room, devs) {
  for (let round = 0; round < 12; round += 1) {
    for (const [i, dev] of devs.entries()) {
      while (dev.queue.length) await doPush(room, dev, i, 0, {});
      await doPull(room, dev, i, {});
    }
  }
}

/** Normalised view of one device, for equality + ledger. */
function view(dev) {
  const s = dev.s;
  const patients = Object.fromEntries(
    s.patients.map((p) => [p.id, { nombre: p.nombre, registro: p.registro, cama: p.cama }])
  );
  const notes = Object.fromEntries(Object.entries(s.notes).filter(([, v]) => v && v.evolucion).map(([k, v]) => [k, v.evolucion]));
  const ind = Object.fromEntries(Object.entries(s.ind).filter(([, v]) => v && v.evolucion).map(([k, v]) => [k, v.evolucion]));
  const labs = Object.fromEntries(Object.entries(s.labs).filter(([, v]) => v.length).map(([k, v]) => [k, v.map((x) => `${x.id}:${stable(x.resLabs)}`).sort()]));
  return { patients, notes, ind, labs };
}
const ledgerOf = (v) => ({
  notes: Object.keys(v.notes).length,
  ind: Object.keys(v.ind).length,
  labs: Object.values(v.labs).reduce((n, l) => n + l.length, 0),
  sum: sha(stable([v.notes, v.ind, v.labs])),
});

function expectedDocs(ledger, kind) {
  const win = new Map();
  for (const d of ledger.docs.filter((x) => x.kind === kind)) {
    const cur = win.get(d.pid);
    // same rule as the Worker: newer updatedAt wins, actorId breaks a tie
    if (!cur || d.at > cur.at || (d.at === cur.at && d.actorId > cur.actorId)) win.set(d.pid, d);
  }
  return Object.fromEntries([...win].map(([pid, d]) => [pid, d.text]));
}

/* ---------- the run ---------- */

async function runChaos(seed, steps = 140) {
  const rand = rng(seed);
  const room = await makeRoom(3);
  const A = newDevice('0');
  const B = newDevice('1');
  const C = newDevice('2'); // fresh device: only ever pulls
  const devs = [A, B, C];
  const pids = ['p1', 'p2', 'p3', 'p4', 'p5'];
  const ledger = { admitted: new Set(), named: new Set(), docs: [], labs: new Map() };
  let tick = 1;
  const kinds = ['admit', 'note', 'note', 'ind', 'fields', 'lab', 'lab'];

  for (let n = 0; n < steps; n += 1) {
    const r = rand();
    const dev = rand() < 0.5 ? A : B;
    const idx = devs.indexOf(dev);
    tick += 1 + Math.floor(rand() * 3);
    nowTick = tick * 2 + 0.5; // between the two devices' edit clocks
    if (r < 0.4) {
      await edit(dev, kinds[Math.floor(rand() * kinds.length)], pids[Math.floor(rand() * pids.length)], tick * 2 + (dev === B ? 1 : 0), rand, ledger);
    } else if (r < 0.7) {
      await doPush(room, dev, idx, rand() < 0.4 ? rand() : 0, { dropBefore: rand() < 0.15, dropAck: rand() < 0.15, dupe: rand() < 0.1 });
    } else {
      const target = steps <= 300 && rand() < 0.2 ? C : dev; // long runs: C stays far behind, so its first pull is a snapshot
      await doPull(room, target, devs.indexOf(target), { drop: rand() < 0.15, replay: rand() < 0.1, late: rand() < 0.1 });
    }
  }
  await settle(room, devs);
  return { A, B, C, ledger, room };
}

describe('Nube sync chaos', () => {
  before(() => {
    Date.now = () => Date.UTC(2026, 9, 1) + nowTick * 1000;
    // Snapshot pulls touch the agenda store, which writes to the browser's localStorage.
    const mem = new Map();
    globalThis.localStorage ??= { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
  });
  after(() => { Date.now = realNow; });
  for (const seed of SEEDS) {
    it(`seed ${seed}: devices converge, nothing blanked, ledger matches`, async () => {
      const { A, B, C, ledger } = await runChaos(seed);
      const [va, vb, vc] = [A, B, C].map(view);
      const tag = `CHAOS_SEED=${seed}`;

      // 1. convergence
      assert.deepEqual(vb.notes, va.notes, `${tag} notes A/B`);
      assert.deepEqual(vb.ind, va.ind, `${tag} indicaciones A/B`);
      assert.deepEqual(vb.labs, va.labs, `${tag} labs A/B`);
      assert.deepEqual(vc.notes, va.notes, `${tag} notes fresh device`);
      assert.deepEqual(vc.ind, va.ind, `${tag} indicaciones fresh device`);
      assert.deepEqual(vc.labs, va.labs, `${tag} labs fresh device`);

      // 2. newest edit wins; no payload that lacked a field blanked it
      assert.deepEqual(va.notes, expectedDocs(ledger, 'note'), `${tag} note == newest edit`);
      assert.deepEqual(va.ind, expectedDocs(ledger, 'ind'), `${tag} indicaciones == newest edit`);
      for (const v of [va, vb, vc]) {
        for (const pid of ledger.admitted) {
          assert.ok(v.patients[pid], `${tag} patient ${pid} present`);
          assert.ok(v.patients[pid].registro, `${tag} registro of ${pid} not blanked`);
          assert.ok(!ledger.named.has(pid) || !/SIN NOMBRE/.test(v.patients[pid].nombre), `${tag} nombre of ${pid} not left as placeholder`);
        }
      }

      // 3. ledger: every lab set ever created is on every side, same checksum
      const expectLabs = {};
      for (const [k, set] of ledger.labs) {
        const [pid, id] = [k.slice(0, k.indexOf('/')), k.slice(k.indexOf('/') + 1)];
        (expectLabs[pid] ||= []).push(`${id}:${stable(set.resLabs)}`);
      }
      for (const k of Object.keys(expectLabs)) expectLabs[k].sort();
      assert.deepEqual(va.labs, expectLabs, `${tag} lab ledger`);
      assert.deepEqual(ledgerOf(vb), ledgerOf(va), `${tag} ledger A/B`);
      assert.deepEqual(ledgerOf(vc), ledgerOf(va), `${tag} ledger fresh device`);
    });
  }

  // 600 steps push the room well past the 100-revision window: pruned history, snapshot pulls.
  for (const seed of [101, 102, 103]) {
    it(`long run seed ${seed}: snapshots after pruned history keep the ledger`, async () => {
      const { A, B, C, ledger, room } = await runChaos(seed, 600);
      const rev = room.d1.sqlite.prepare('SELECT revision FROM rooms WHERE id = ?').get(room.roomId).revision;
      assert.ok(rev > 100, `CHAOS_SEED=${seed} run must cross the prune window (revision ${rev})`);
      const [va, vb, vc] = [A, B, C].map(view);
      assert.deepEqual(ledgerOf(vb), ledgerOf(va), `CHAOS_SEED=${seed} ledger A/B`);
      assert.deepEqual(ledgerOf(vc), ledgerOf(va), `CHAOS_SEED=${seed} ledger fresh device`);
      assert.deepEqual(va.notes, expectedDocs(ledger, 'note'));
      assert.deepEqual(va.ind, expectedDocs(ledger, 'ind'));
      assert.equal(ledgerOf(va).labs, ledger.labs.size, 'every lab set ever written is on every device');
    });
  }

  it('busy set: catch-up time + ledger (60 patients x 12 labs, note, indicaciones)', async () => {
    const room = await makeRoom(3);
    const A = newDevice('0');
    const patients = 60;
    const labsPer = 12;
    let t = 0;
    const ops = [];
    await onDevice(A, async () => {
      for (let n = 0; n < patients; n += 1) {
        const pid = `b${n}`;
        const at = iso((t += 1));
        const patient = { id: pid, nombre: `PAC ${pid}`, registro: `R${pid}`, cama: String(n), lanUpdatedAt: at };
        getPatients().push(patient);
        ops.push(...buildPatientAdmitOpsForCloud(patient, 'u0'));
        for (const kind of ['note', 'indicaciones']) {
          const doc = { evolucion: `${kind}-${pid}`, updatedAt: at };
          (kind === 'note' ? getNotes() : getIndicaciones())[pid] = doc;
          ops.push(cloudOp({ path: `entries/${pid}/${kind}`, value: doc, updatedAt: at, actorId: 'u0' }));
        }
        const sets = Array.from({ length: labsPer }, (_, k) => ({ id: `lab-${pid}-${k}`, fecha: '2026-10-01', hora: `${String(k).padStart(2, '0')}:00`, resLabs: [`Na ${100 + n + k}`] }));
        getLabHistory()[pid] = sets;
        ops.push(...buildLabSidecarOpsForPatient(pid, sets, { actorId: 'u0', updatedAt: at }));
      }
    });
    const chunks = chunkCloudOps(ops);
    for (const [i, chunk] of chunks.entries()) {
      nowTick += 1; // spread pushes over the fake clock, like the app's pacer
      const res = await serverPush(room, 0, { clientMutationId: `busy-${i}`, baseRevision: 0, ops: chunk });
      assert.deepEqual(res.rejected, [], 'busy push rejected nothing');
    }
    const before = ledgerOf(view(A));
    assert.equal(before.labs, patients * labsPer);

    // Fresh device: whole room as one snapshot.
    const C = newDevice('2');
    let t0 = performance.now();
    const snap = await serverPull(room, 2, 0);
    const tPull = performance.now() - t0;
    assert.equal(snap.needSnapshot, true, 'a gap over 100 revisions comes as a snapshot');
    t0 = performance.now();
    await applyPull(C, snap);
    const tApply = performance.now() - t0;
    assert.deepEqual(ledgerOf(view(C)), before, 'ledger before == after catch-up');

    // Device that is behind by under 100 revisions: ops catch-up.
    const rev = snap.revision;
    const D = newDevice('1');
    D.rev = rev - 30;
    const opsRes = await serverPull(room, 1, D.rev);
    assert.ok(!opsRes.needSnapshot && opsRes.ops.length > 0, 'a small gap comes as ops');
    t0 = performance.now();
    await applyPull(D, opsRes);
    const tOps = performance.now() - t0;

    const line = `catch-up ${patients} patients x ${labsPer} labs (${ops.length} ops, ${chunks.length} pushes, rev ${rev}): snapshot pull ${tPull.toFixed(0)} ms + apply ${tApply.toFixed(0)} ms; 30-revision ops catch-up apply ${tOps.toFixed(0)} ms`;
    console.log(`[sync-chaos] ${line}`);
    assert.ok(tPull + tApply < 20_000, `snapshot catch-up stays under 20 s: ${line}`);
  });
});
