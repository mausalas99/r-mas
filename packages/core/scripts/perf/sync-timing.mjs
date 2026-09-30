/* global process, console, fetch, performance, setTimeout */
/**
 * Nube push/pull timing harness (synthetic data only). Temporary: sync-speed step 1.
 *
 *   cd packages/core/cloud/sync-worker && echo SYNC_TIMING=1 >> .dev.vars
 *   npm run db:migrate:local && npx wrangler dev
 *   node scripts/perf/sync-timing.mjs [runs=20] [base=http://127.0.0.1:8787]
 *
 * Per run: push 1 op, push 16 ops, drain 64 ops, drain 319 ops (16-op chunks,
 * 125-250 ms gap like createDrainPacer), with a device-B pull after each.
 * Server steps come from the flag-gated Server-Timing header in sync.js.
 * Room is padded past 100 revisions first so the prune DELETE runs.
 */
const RUNS = Number(process.argv[2] || 20);
const BASE = `${process.argv[3] || 'http://127.0.0.1:8787'}/api/sync/v1`;
const CHUNK = 16; // quotas.js maxOpsPerMutation / CLOUD_CWND_MAX_OPS
const GAP_MS = 250; // CLOUD_CHUNK_GAP_MIN_MS, jittered to 125-250
const PATIENTS = 40;
const RATE_MAX = 115; // under mutation-guard.mjs 120 pushes / 60 s / room

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const parseTiming = (h) =>
  Object.fromEntries(
    String(h || '').split(',').filter(Boolean).map((p) => {
      const [name, dur] = p.trim().split(';dur=');
      return [name, Number(dur)];
    })
  );

async function api(pathname, { method = 'GET', body, token } = {}) {
  const t0 = performance.now();
  const res = await fetch(BASE + pathname, {
    method,
    headers: { 'content-type': 'application/json', 'x-app-version': '9.9.9', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  const ms = performance.now() - t0;
  if (!res.ok) throw new Error(`${method} ${pathname} -> ${res.status} ${JSON.stringify(data).slice(0, 300)}`);
  return { data, ms, st: parseTiming(res.headers.get('server-timing')) };
}

const register = async (tag) =>
  (await api('/auth/register', {
    method: 'POST',
    body: { username: `perf_${tag}_${Date.now().toString(36)}`, password: 'Demo-e2e-Pass-2026!', displayName: `Perf ${tag}`, appVersion: '9.9.9' },
  })).data.token;

const A = await register('a');
const B = await register('b');
const { room } = (await api('/rooms', { method: 'POST', token: A, body: { name: 'Sala 2 perf', sala: 'Sala 2' } })).data;
await api('/rooms/join', { method: 'POST', token: B, body: { code: room.code } });

let rev = 0;
let clock = Date.now();
const nextIso = () => new Date((clock = Math.max(clock + 1, Date.now()))).toISOString();
const note = 'Nota sintetica de prueba. '.repeat(40);
let opSeq = 0;
const makeOps = (n) =>
  Array.from({ length: n }, () => {
    const k = opSeq++;
    const id = `demo-${String(k % PATIENTS).padStart(3, '0')}`;
    return Math.floor(k / PATIENTS) % 2
      ? { path: `entries/${id}/note`, value: `${note}${k}`, updatedAt: nextIso(), actorId: 'perf' }
      : { path: `entries/${id}/fields`, value: { nombre: `PACIENTE DEMO ${id}`, cama: id, v: k }, updatedAt: nextIso(), actorId: 'perf' };
  });

// Local mirror of the room push budget so the harness never trips 429.
let winStart = Date.now();
let winCount = 0;
async function reserve(n) {
  if (Date.now() - winStart > 61_000) { winStart = Date.now(); winCount = 0; }
  if (winCount + n > RATE_MAX) {
    await sleep(Math.max(0, winStart + 61_000 - Date.now()));
    winStart = Date.now();
    winCount = 0;
  }
  winCount += n;
}

async function push(ops) {
  const r = await api(`/rooms/${room.id}/mutations`, {
    method: 'POST', token: A, body: { clientMutationId: `perf-${Math.random()}`, ops, baseRevision: rev },
  });
  rev = r.data.revision;
  return r;
}

/** Client-style drain: 16-op chunks, jittered gap between chunks. */
async function drain(n) {
  const ops = makeOps(n);
  const pushes = [];
  const t0 = performance.now();
  for (let i = 0; i < ops.length; i += CHUNK) {
    pushes.push(await push(ops.slice(i, i + CHUNK)));
    if (i + CHUNK < ops.length) await sleep(GAP_MS / 2 + Math.random() * (GAP_MS / 2));
  }
  return { wall: performance.now() - t0, pushes };
}

const pullB = (since) => api(`/rooms/${room.id}/pull?since=${since}`, { token: B });

// Setup: seed patients, then pad past 100 revisions so prune runs on every push.
for (let i = 0; i < PATIENTS * 2; i += CHUNK) {
  const ops = [];
  for (let p = i / 2; p < Math.min(PATIENTS, (i + CHUNK) / 2); p++) {
    const id = `demo-${String(p).padStart(3, '0')}`;
    ops.push({ path: `entries/${id}/fields`, value: { nombre: `PACIENTE DEMO ${id}`, cama: id }, updatedAt: nextIso(), actorId: 'perf' });
    ops.push({ path: `entries/${id}/note`, value: note, updatedAt: nextIso(), actorId: 'perf' });
  }
  await reserve(1);
  await push(ops);
}
while (rev < 105) { await reserve(1); await push(makeOps(1)); }
console.error(`setup done: room ${room.id} rev ${rev}; waiting for rate window`);
await sleep(61_000); winStart = Date.now(); winCount = 0;

/** @type {Record<string, { wall: number[], steps: Record<string, number[]> }>} */
const S = {};
const rec = (key, r, wall = r.ms) => {
  const s = (S[key] ||= { wall: [], steps: {} });
  s.wall.push(wall);
  for (const [k, v] of Object.entries(r.st || {})) (s.steps[k] ||= []).push(v);
};

for (let run = 0; run < RUNS; run++) {
  for (const n of [1, 16]) {
    await reserve(1);
    const before = rev;
    rec(`push ${n}`, await push(makeOps(n)));
    rec(`pull after push ${n}`, await pullB(before));
  }
  for (const n of [64, 319]) {
    await reserve(Math.ceil(n / CHUNK));
    const before = rev;
    const d = await drain(n);
    rec(`drain ${n} (wall incl. gaps)`, { st: {} }, d.wall);
    for (const p of d.pushes) rec(`push chunk in ${n}-drain`, p);
    rec(`pull after drain ${n}`, await pullB(before));
  }
  rec('pull idle (no change)', await pullB(rev));
  rec('pull snapshot (since=0)', await pullB(0));
  console.error(`run ${run + 1}/${RUNS} rev ${rev}`);
}

const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const f = (v) => (v == null ? '-' : v.toFixed(1));
console.log(`room revision at end: ${rev}; runs ${RUNS}; patients ${PATIENTS}`);
console.log('| step | n | client wall median ms | p90 | server steps median/mean ms |');
console.log('|---|---|---|---|---|');
for (const [key, s] of Object.entries(S)) {
  const steps = Object.entries(s.steps).map(([k, v]) => `${k} ${f(q(v, 0.5))}/${f(mean(v))}`).join(', ');
  console.log(`| ${key} | ${s.wall.length} | ${f(q(s.wall, 0.5))} | ${f(q(s.wall, 0.9))} | ${steps || '-'} |`);
}
