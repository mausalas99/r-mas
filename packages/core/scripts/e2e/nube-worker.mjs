/**
 * Shared Nube pieces for multi-device E2E runs: a LOCAL copy of the real sync
 * Worker (`wrangler dev --local`, fresh D1 + Durable Object state per run,
 * never the real Cloudflare Worker) and the Nube sign-up walk.
 *
 * Importing this module points the app at the local Worker
 * (R_PLUS_CLOUD_SYNC_URL) and applies the D1 migrations.
 */
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { repoRoot, until } from './harness.mjs';
export { until };

const WORKER_DIR = path.join(repoRoot, 'packages/core/cloud/sync-worker');
const WRANGLER = path.join(WORKER_DIR, 'node_modules/.bin/wrangler');
const PORT = 8790 + Math.floor(Math.random() * 60);
export const BASE = `http://127.0.0.1:${PORT}`;
const API = `${BASE}/api/sync/v1`;
export const PASSWORD = 'Demo-e2e-Pass-2026!';

export const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rplus-e2e-nube-'));
const wEnv = { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: '1' };
let worker = null;
export const workerLog = [];

export function startWorker() {
  worker = spawn(
    WRANGLER,
    ['dev', '--local', '--persist-to', stateDir, '--port', String(PORT), '--ip', '127.0.0.1',
      '--var', 'SYNC_ADMIN_KEY:e2e-admin-key', '--var', 'WORKER_DATA_KEY:' + 'ab'.repeat(32)],
    // Own process group: wrangler runs workerd as grandchildren, so kill the whole group.
    { cwd: WORKER_DIR, env: wEnv, stdio: ['ignore', 'pipe', 'pipe'], detached: true },
  );
  for (const s of [worker.stdout, worker.stderr]) s.on('data', (b) => workerLog.push(...String(b).split('\n').filter((l) => /\] (GET|POST|PUT|DELETE)|rror/.test(l))));
  return until(() => fetch(`${API}/ping`).then((res) => res.ok), 60000);
}
function killGroup(w, sig) {
  try { process.kill(-w.pid, sig); } catch { /* already gone */ }
}
export function stopWorker() {
  if (!worker) return Promise.resolve();
  const w = worker;
  worker = null;
  return new Promise((res) => {
    w.once('exit', () => setTimeout(res, 500));
    killGroup(w, 'SIGTERM');
    setTimeout(() => { killGroup(w, 'SIGKILL'); res(); }, 8000);
  });
}
/** Read-only look at the Worker's D1, straight from the local sqlite file. */
export function d1Query(sql) {
  const out = execFileSync(WRANGLER, ['d1', 'execute', 'rplus-sync', '--local', '--persist-to', stateDir, '--json',
    '--command', sql], { cwd: WORKER_DIR, env: wEnv, maxBuffer: 64 << 20 });
  return String(out);
}

/**
 * r.launch with each device's renderer console kept for diagnosis; on exit the
 * consoles + Worker log land in <artifactDir>/console.json and the Worker dies.
 */
export function nubeDevices(r) {
  const consoleLogs = {};
  process.on('exit', () => {
    fs.writeFileSync(path.join(r.artifactDir, 'console.json'), JSON.stringify({ ...consoleLogs, worker: workerLog }, null, 1));
    if (worker) killGroup(worker, 'SIGKILL');
    fs.rmSync(stateDir, { recursive: true, force: true });
  });
  return async function launchDevice(profile, lanPort) {
    const d = await r.launch({ profile, lanPort });
    const log = (consoleLogs[profile] ||= []);
    d.page.on('console', (m) => {
      if (m.type() !== 'debug' && !/\[perf\]/.test(m.text())) log.push(m.type() + ' ' + m.text().replace(/access_token=[^&\s]+/g, 'access_token=…').slice(0, 400));
    });
    return d;
  };
}

/** Fresh install → Nube → @usuario, name, rank, Sala 1, password → recovery code → app. */
export async function onboardNube(page, user) {
  await page.locator('[data-sync-mode="nube"]').click();
  await page.locator('#onboard-username').fill(user.username);
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.locator('#onboard-clinical-name').fill(user.name);
  await page.getByRole('button', { name: 'Siguiente' }).click();
  await page.locator('#onboard-rank').selectOption(user.rank || 'R2');
  await page.locator('#onboard-sala').selectOption('Sala 1');
  await page.locator('#onboard-nube-password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Guardar perfil' }).click();
  const cont = page.locator('button:visible', { hasText: /^Continuar/ });
  await cont.waitFor({ timeout: 20000 });
  const recovery = flat(await page.locator('body').innerText());
  const lockedBeforeCheck = await cont.isDisabled();
  await page.getByText('Lo guardé en un lugar seguro').click();
  await cont.click();
  await page.getByRole('button', { name: 'Ejemplo Modelo casoba' }).waitFor({ timeout: 15000 });
  const done = flat(await page.locator('body').innerText());
  return { recovery, lockedBeforeCheck, done };
}

export const roomMeta = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('rpc-cloud-sync-room-meta') || 'null'));
export const patientVisible = (page, p) =>
  page.locator(`.p-name[title*="${p.exp}"]`).evaluateAll((els) => els.some((e) => e.getBoundingClientRect().width > 0));

process.env.R_PLUS_CLOUD_SYNC_URL = BASE;
execFileSync(WRANGLER, ['d1', 'migrations', 'apply', 'rplus-sync', '--local', '--persist-to', stateDir],
  { cwd: WORKER_DIR, env: wEnv, stdio: 'ignore' });
