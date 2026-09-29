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

/**
 * `wrangler dev`'s own dev proxy sometimes dies when a client connection drops
 * ("Error inside ProxyWorker … Network connection lost", exit code 1), taking
 * the local Worker down mid-scenario: every device then gets
 * ERR_CONNECTION_REFUSED. That is dev tooling, not R+, so an exit nobody asked
 * for (not stopWorker) restarts it on the same port and the same persisted
 * data — the outage the app already rides out in the "Worker down" steps.
 */
function spawnWorker() {
  const w = spawn(
    WRANGLER,
    ['dev', '--local', '--persist-to', stateDir, '--port', String(PORT), '--ip', '127.0.0.1',
      '--var', 'SYNC_ADMIN_KEY:e2e-admin-key', '--var', 'WORKER_DATA_KEY:' + 'ab'.repeat(32)],
    // Own process group: wrangler runs workerd as grandchildren, so kill the whole group.
    { cwd: WORKER_DIR, env: wEnv, stdio: ['ignore', 'pipe', 'pipe'], detached: true },
  );
  w.stdout.on('data', (b) => workerLog.push(...String(b).split('\n').filter((l) => /\] (GET|POST|PUT|DELETE)|rror/.test(l))));
  // stderr unfiltered + how it ended, for diagnosis.
  w.stderr.on('data', (b) => workerLog.push(...String(b).split('\n').filter((l) => l.trim())));
  w.on('exit', (code, signal) => {
    const unexpected = w === worker;
    workerLog.push(`[e2e] wrangler (pid ${w.pid}) exited code=${code} signal=${signal} at ${new Date().toISOString()}${unexpected ? ' — restarting' : ' (stopWorker)'}`);
    if (!unexpected) return;
    killGroup(w, 'SIGKILL'); // leftover workerd would keep the port
    worker = spawnWorker();
  });
  return w;
}
export function startWorker() {
  worker = spawnWorker();
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
    const force = setTimeout(() => { killGroup(w, 'SIGKILL'); res(); }, 8000);
    w.once('exit', () => { clearTimeout(force); setTimeout(res, 500); });
    killGroup(w, 'SIGTERM');
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
  // R4/admin skip the "join a team" gate and land in the app.
  const landing = user.rank === 'R4' ? page.locator('.topbar-area-btn') : page.getByRole('button', { name: 'Abrir Mi rotación' });
  await landing.waitFor({ timeout: 15000 });
  const done = flat(await page.locator('body').innerText());
  return { recovery, lockedBeforeCheck, done };
}

/**
 * Header ⇄ icon → the full Nube panel. Signed in with a sala, the icon first
 * opens the quick look (board «Nube C»); press its «Abrir panel».
 */
export async function openNubePanel(page) {
  await page.locator('#btn-header-team-sync').click();
  const openPanel = page.locator('#nube-popover [data-nube-pop="open-panel"]');
  const panel = page.locator('#connection-dropdown.open');
  await until(async () => (await openPanel.isVisible().catch(() => false)) || (await panel.isVisible().catch(() => false)), 5000);
  if (await openPanel.isVisible().catch(() => false)) await openPanel.click();
}

/** ⇄ → panel → Opciones → one sub-view (equipo/cuenta/mobile/admin/nube/advanced). */
export async function openNubeView(page, view) {
  await openNubePanel(page);
  const navOptions = page.locator('[data-cloud-action="nav-options"]');
  // The panel can still be rebuilding its home view (e.g. right after a join).
  if (await until(() => navOptions.isVisible().catch(() => false), 5000)) await navOptions.click();
  await page.locator(`.cloud-sync-view[data-cloud-view="options"] [data-cloud-action="nav-view"][data-cloud-view="${view}"]`).click();
}

export const roomMeta = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('rpc-cloud-sync-room-meta') || 'null'));
export const patientVisible = (page, p) =>
  page.locator(`.p-name[title*="${p.exp}"]`).evaluateAll((els) => els.some((e) => e.getBoundingClientRect().width > 0));

process.env.R_PLUS_CLOUD_SYNC_URL = BASE;
execFileSync(WRANGLER, ['d1', 'migrations', 'apply', 'rplus-sync', '--local', '--persist-to', stateDir],
  { cwd: WORKER_DIR, env: wEnv, stdio: 'ignore' });
