#!/usr/bin/env node
/* global process, console, fetch, performance, setTimeout */
/**
 * Local load check for the per-patient room split (PATIENT_SHARD_WRITE).
 * Starts a LOCAL wrangler dev worker (fresh D1, never touches Cloudflare),
 * pushes N synthetic patients, deletes M of them the way the admin bulk delete
 * does, and prints wall time and the final room state.
 *
 *   node scripts/bulk-delete-load.mjs 0     # fat core (flag off)
 *   node scripts/bulk-delete-load.mjs 1     # per-patient rows (flag on)
 *   node scripts/bulk-delete-load.mjs 1 150 74
 *
 * Synthetic data only. Local D1 cannot reproduce Cloudflare's "overloaded"
 * error; this checks correctness and relative write cost, not the production
 * queue. Run the flag-on case against a staging Worker for that.
 */
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FLAG = process.argv[2] === '1' ? '1' : '0';
const PATIENTS = Number(process.argv[3] || 150);
const DELETES = Number(process.argv[4] || 74);
const PORT = 8790 + Number(FLAG);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORKER_DIR = path.join(HERE, '..');
const WRANGLER = path.join(WORKER_DIR, 'node_modules/.bin/wrangler');
const BASE = `http://127.0.0.1:${PORT}/api/sync/v1`;
const stateDir = mkdtempSync(path.join(tmpdir(), 'bulk-delete-load-'));
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

async function waitForPing() {
  for (let i = 0; i < 120; i += 1) {
    try {
      if ((await fetch(BASE + '/ping')).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('worker did not start');
}

async function main() {
  execFileSync(WRANGLER, ['d1', 'migrations', 'apply', 'rplus-sync', '--local', '--persist-to', stateDir], {
    cwd: WORKER_DIR,
    stdio: 'ignore',
  });
  const worker = spawn(
    WRANGLER,
    [
      'dev', '--local', '--persist-to', stateDir, '--port', String(PORT), '--ip', '127.0.0.1',
      '--var', 'SYNC_ADMIN_KEY:load-admin-key', '--var', 'WORKER_DATA_KEY:' + 'ab'.repeat(32),
      '--var', `PATIENT_SHARD_WRITE:${FLAG}`,
    ],
    { cwd: WORKER_DIR, stdio: 'ignore', detached: true }
  );
  try {
    await waitForPing();
    const username = `load_${Date.now().toString(36)}`;
    const reg = await api('/auth/register', {
      method: 'POST',
      body: { username, password: 'Demo-e2e-Pass-2026!', displayName: 'Demo Load', appVersion: '9.9.9' },
    });
    const token = reg.token;
    const { room } = await api('/rooms', { method: 'POST', token, body: { name: 'Sala 2 load', sala: 'Sala 2' } });
    let rev = 0;
    const push = async (ops, label) => {
      const t0 = performance.now();
      const res = await api(`/rooms/${room.id}/mutations`, {
        method: 'POST',
        token,
        body: { clientMutationId: `${label}-${Math.random()}`, ops, baseRevision: rev },
      });
      rev = res.revision;
      return performance.now() - t0;
    };

    const note = 'Nota sintetica de prueba. '.repeat(160);
    const ids = Array.from({ length: PATIENTS }, (_, i) => `demo-${String(i).padStart(3, '0')}`);
    const tSeed0 = performance.now();
    for (let i = 0; i < ids.length; i += 8) {
      const ops = [];
      for (const id of ids.slice(i, i + 8)) {
        ops.push({ path: `entries/${id}/fields`, value: { nombre: `PACIENTE DEMO ${id}`, cama: id }, updatedAt: nowIso(), actorId: 'load' });
        ops.push({ path: `entries/${id}/note`, value: note, updatedAt: nowIso(), actorId: 'load' });
      }
      await push(ops, 'seed');
    }
    const seedMs = performance.now() - tSeed0;

    const victims = ids.slice(0, DELETES);
    const editTimes = [];
    for (const id of ids.slice(DELETES, DELETES + 5)) {
      editTimes.push(await push([{ path: `entries/${id}/note`, value: note + ' editada', updatedAt: nowIso(), actorId: 'load' }], 'edit'));
    }
    const delTimes = [];
    const tDel0 = performance.now();
    for (let i = 0; i < victims.length; i += 64) {
      const ops = victims.slice(i, i + 64).map((id) => ({
        path: `tombstones/${id}`,
        value: { deletedAt: nowIso() },
        updatedAt: nowIso(),
        actorId: 'load',
      }));
      delTimes.push(await push(ops, 'del'));
    }
    const delMs = performance.now() - tDel0;

    const pull = await api(`/rooms/${room.id}/pull?since=0`, { token });
    const state = pull.state;
    const rows = JSON.parse(
      execFileSync(WRANGLER, ['d1', 'execute', 'rplus-sync', '--local', '--persist-to', stateDir, '--json',
        '--command', 'SELECT COUNT(*) AS n FROM room_state_patients'], { cwd: WORKER_DIR })
    );
    const avg = (a) => (a.reduce((x, y) => x + y, 0) / (a.length || 1)).toFixed(0);
    console.log(
      JSON.stringify(
        {
          flag: FLAG,
          patientsSeeded: PATIENTS,
          seedMs: Math.round(seedMs),
          avgEditPushMs: avg(editTimes),
          deletePushes: delTimes.length,
          deleteTotalMs: Math.round(delMs),
          patientRows: rows?.[0]?.results?.[0]?.n,
          finalEntries: state.entries.length,
          finalTombstones: Object.keys(state.tombstones || {}).length,
          noteKept: state.entries.every((e) => String(e.note || '').startsWith('Nota sintetica')),
          expectedEntries: PATIENTS - DELETES,
        },
        null,
        2
      )
    );
  } finally {
    try {
      process.kill(-worker.pid, 'SIGKILL');
    } catch {
      /* already gone */
    }
    rmSync(stateDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
