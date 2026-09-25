/**
 * Shared E2E harness: launch the real R+ Electron app on a throwaway userData,
 * stub the outside world (hospital lab repository, native dialogs, Downloads),
 * record named checks, and write the run artifact.
 *
 * Artifact: e2e-artifacts/<name>/<run-id>/ with report.json + screenshots.
 */
import { _electron as electron } from 'playwright';
import electronPath from 'electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

/** Poll fn until it returns truthy or the timeout passes; returns the last value. */
export const until = async (fn, timeout = 30000, step = 500) => {
  const end = Date.now() + timeout;
  for (;;) {
    const v = await fn().catch(() => false);
    if (v || Date.now() > end) return v;
    await new Promise((res) => setTimeout(res, step));
  }
};

export function createRun(name) {
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const artifactDir = path.join(repoRoot, 'e2e-artifacts', name, runId);
  // One throwaway userData per profile: a second profile is a second device (Nube sync runs).
  const userDataDirs = {};
  const userDataFor = (profile) =>
    (userDataDirs[profile] ||= fs.mkdtempSync(path.join(os.tmpdir(), 'rplus-e2e-ud-')));
  const downloadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rplus-e2e-dl-'));
  fs.mkdirSync(artifactDir, { recursive: true });
  const checks = [];
  let shotN = 0;
  let lastPage = null;

  function check(label, ok, detail) {
    checks.push({ name: label, ok: !!ok, detail: detail === undefined ? null : detail });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail !== undefined ? '  — ' + JSON.stringify(detail) : ''}`);
  }

  async function shot(page, label) {
    shotN += 1;
    await page.screenshot({ path: path.join(artifactDir, `${String(shotN).padStart(2, '0')}-${label}.png`) });
  }

  async function launch({ profile = 'a', lanPort = 3791, fakePortal = false } = {}) {
    const userDataDir = userDataFor(profile);
    const app = await electron.launch({
      executablePath: electronPath,
      args: [repoRoot, `--user-data-dir=${userDataDir}`],
      cwd: repoRoot,
      env: {
        ...process.env,
        R_PLUS_VERIFY_MODE: '1',
        R_PLUS_USER_DATA: userDataDir,
        R_PLUS_LAN_HTTP_PORT: String(lanPort),
      },
      timeout: 60000,
    });
    // Offline and deterministic: no hospital repository lookups, no native
    // dialogs, exported files land in a temp "Downloads" dir. fakePortal keeps
    // the real 'lab-repo-fetch' handler and lets setPortalScript() stub
    // main-process globalThis.fetch instead, for lib/lab-repo/* coverage.
    await app.evaluate(({ app: a, ipcMain, dialog }, cfg) => {
      a.setPath('downloads', cfg.dl);
      // repoReplies: queued answers for the next lab-repo-fetch calls (default: nothing found).
      globalThis.__e2e = { repoCalls: [], repoReplies: [], dialogs: [], portalCalls: [] };
      if (!cfg.fakePortal) {
        ipcMain.removeHandler('lab-repo-fetch');
        ipcMain.handle('lab-repo-fetch', (_e, p) => {
          globalThis.__e2e.repoCalls.push(p || null);
          return globalThis.__e2e.repoReplies.shift() || { studies: [] };
        });
      }
      dialog.showOpenDialog = async () => {
        globalThis.__e2e.dialogs.push('open');
        return { canceled: false, filePaths: [cfg.dl] };
      };
      dialog.showSaveDialog = async () => {
        globalThis.__e2e.dialogs.push('save');
        return { canceled: true };
      };
    }, { dl: downloadsDir, fakePortal });
    const page = await app.firstWindow();
    // Sala opens in the card view by default; these scenarios drive the sidebar.
    await page.waitForLoadState('domcontentloaded');
    const salaCards = await page.evaluate(() => { globalThis.localStorage.setItem('rplus-sala-view', 'bar'); return !!globalThis.document.body.dataset.salaView; });
    if (salaCards) await page.reload();
    lastPage = page;
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    return { app, page, pageErrors };
  }

  /** Run the scenario, then always write report.json and clean temp dirs. Exits the process. */
  async function finish(scenario, run) {
    try {
      await run();
    } catch (err) {
      if (lastPage) await shot(lastPage, 'crash').catch(() => {});
      check('scenario ran to the end', false, String((err && err.stack) || err).split('\n').slice(0, 6).join('\n'));
    }
    const passed = checks.filter((c) => c.ok).length;
    const report = { scenario, runId, passed, failed: checks.length - passed, checks };
    fs.writeFileSync(path.join(artifactDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    for (const dir of Object.values(userDataDirs)) fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(downloadsDir, { recursive: true, force: true });
    console.log(`\n${passed}/${checks.length} checks passed. Artifact: ${path.relative(repoRoot, artifactDir)}`);
    process.exit(report.failed === 0 ? 0 : 1);
  }

  return { artifactDir, downloadsDir, check, shot, launch, finish };
}

/** Fresh install → "Solo este equipo" → app ready, help sheet closed. */
export async function onboardLocalOnly(page) {
  await page.locator('[data-sync-mode="local"]').click();
  await page.locator('#clinical-onboard-local-confirm-btn').click();
  await page.locator('#apptab-lab').waitFor({ state: 'visible' });
  await dismissLearnHub(page);
}

/** The first-run help sheet can open a moment after boot. Close it like a user. */
export async function dismissLearnHub(page) {
  const hub = page.locator('#learn-hub-backdrop.open');
  await hub.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
  if (await hub.count()) {
    await page.keyboard.press('Escape');
    await hub.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
  }
}

/**
 * Dismiss toasts without a real mouse click: toasts slide while others close,
 * and a positional click can land on the header mode switch under them.
 */
export async function closeToasts(page) {
  for (const btn of await page.locator('.toast-close').all()) await btn.dispatchEvent('click').catch(() => {});
}

export async function visiblePatientCount(page) {
  return page.locator('.p-name').evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().width > 0).length);
}

/** Open the "Pegar SOME" box if needed, paste, press Procesar. */
export async function pasteAndProcess(page, text) {
  await closeToasts(page);
  // #btn-lab-paste lives on the Laboratorio tab, not the Paciente tab (left
  // active by a prior labsCard()-style read) — switch tabs first.
  const labTab = page.locator('#apptab-lab');
  if ((await labTab.count()) && !(await page.locator('#btn-lab-paste').isVisible().catch(() => false))) {
    await labTab.click();
  }
  if (!(await page.locator('#lab-input').isVisible())) {
    await page.locator('#btn-lab-paste').click();
    await page.locator('#lab-input').waitFor({ state: 'visible' });
  }
  await page.locator('#lab-input').fill(text);
  await page.locator('#btn-procesar').click();
}

/** Paste, confirm the preview if one opens, wait for the save toast. Returns the preview + toast text. */
export async function pasteAndSave(page, text) {
  await closeToasts(page);
  await pasteAndProcess(page, text);
  const confirm = page.locator('#lab-bulk-preview-confirm');
  const saved = page.locator('.toast', { hasText: /guardad/i });
  await Promise.race([
    confirm.waitFor({ state: 'visible', timeout: 8000 }),
    saved.waitFor({ state: 'visible', timeout: 8000 }),
  ]).catch(() => {});
  let preview = '';
  if (await confirm.isVisible()) {
    preview = await page.locator('.modal-backdrop.open', { has: confirm }).innerText();
    await confirm.click();
    await saved.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
  }
  await page.waitForTimeout(300);
  return preview + '\n' + (await page.locator('.toast').allInnerTexts()).join('\n');
}

/**
 * Fake the hospital lab-repository portal at the main-process `fetch` level
 * (launch the app with `{ fakePortal: true }` first, which keeps the real
 * 'lab-repo-fetch' IPC handler). Each call to the stubbed `fetch` consumes
 * the next step in order (the last step repeats once exhausted).
 * @param {{ text?: string, base64?: string, contentType?: string, status?: number, ok?: boolean, setCookie?: string }[]} steps
 */
export async function setPortalScript(app, steps) {
  await app.evaluate((_e, portalSteps) => {
    let i = 0;
    globalThis.__e2e.portalCalls = [];
    globalThis.fetch = async (url, init) => {
      const opts = init || {};
      const step = portalSteps[Math.min(i, portalSteps.length - 1)];
      i += 1;
      globalThis.__e2e.portalCalls.push({
        url: String(url),
        method: opts.method || 'GET',
        body: opts.body || '',
        headers: opts.headers || {},
      });
      const body = step.base64
        ? Buffer.from(step.base64, 'base64')
        : Buffer.from(String(step.text || ''), 'utf8');
      const contentType = step.contentType || 'text/html';
      return {
        ok: step.ok !== false,
        status: step.status || 200,
        headers: {
          get: (name) => {
            const n = String(name).toLowerCase();
            if (n === 'content-type') return contentType;
            if (n === 'set-cookie') return step.setCookie || null;
            return null;
          },
          getSetCookie: () => (step.setCookie ? [step.setCookie] : []),
        },
        text: async () => body.toString('utf8'),
        arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
      };
    };
  }, steps);
}

/** Click patient p ({ exp, room }) in the list; fill "Completar ingreso" the first time. */
export async function openPatient(page, p) {
  await closeToasts(page);
  // A refused paste leaves the paste box open over the list: close it like a user.
  if (await page.locator('#lab-input').isVisible()) {
    await page.keyboard.press('Escape');
    await page.locator('#lab-input').waitFor({ state: 'hidden', timeout: 5000 });
  }
  await page.locator(`.p-name[title*="${p.exp}"]`).locator('visible=true').first().click();
  const servicio = page.locator('#m-servicio');
  await servicio.waitFor({ state: 'visible', timeout: 1500 }).catch(() => {});
  if (await servicio.isVisible()) {
    await servicio.fill('MEDICINA INTERNA');
    await page.locator('#m-cuarto').fill(p.room || '301');
    await page.locator('#m-cama').fill('01');
    await page.getByRole('button', { name: 'Agregar Paciente' }).click();
    await servicio.waitFor({ state: 'hidden' });
  }
}
