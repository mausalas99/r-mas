/* global document */
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
import { createRequire } from 'node:module';
import { FEATURE_HINTS } from '../../public/js/feature-hints.mjs';

/** App under test. E2E_APP_ROOT=packages/hf (or packages/neumo) runs a spec against a companion app. */
export const repoRoot = process.env.E2E_APP_ROOT
  ? path.resolve(process.env.E2E_APP_ROOT)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

/** Poll fn until it returns truthy or the timeout passes; returns the last value. */
export const until = async (fn, timeout = 30000, step = 500) => {
  const end = Date.now() + timeout;
  for (;;) {
    const v = await fn().catch(() => false);
    if (v || Date.now() > end) return v;
    await new Promise((res) => setTimeout(res, step));
  }
};

/**
 * hints: keep the «Guía»/«Nuevo» hint bubbles (per run, or per launch()).
 * Off by default: a bubble over a control swallows the scenario's click on it.
 */
export function createRun(name, { hints: runHints = false } = {}) {
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const artifactDir = path.join(repoRoot, 'e2e-artifacts', name, runId);
  // One throwaway userData per profile: a second profile is a second device (Nube sync runs).
  const userDataDirs = {};
  const userDataFor = (profile) =>
    (userDataDirs[profile] ||= fs.mkdtempSync(path.join(os.tmpdir(), 'rplus-e2e-ud-')));
  const downloadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rplus-e2e-dl-'));
  fs.mkdirSync(artifactDir, { recursive: true });
  const checks = [];
  // Speed numbers a scenario records (name → ms); printed and saved in report.json.
  const timings = {};
  let shotN = 0;
  let lastPage = null;

  function check(label, ok, detail) {
    checks.push({ name: label, ok: !!ok, detail: detail === undefined ? null : detail });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail !== undefined ? '  — ' + JSON.stringify(detail) : ''}`);
  }

  // One accessibility scan per screenshot (see a11y.mjs).
  const a11y = createA11yRecorder(name);

  async function shot(page, label) {
    shotN += 1;
    await page.screenshot({ path: path.join(artifactDir, `${String(shotN).padStart(2, '0')}-${label}.png`) });
    await a11y.scan(page, label);
  }

  async function launch({ profile = 'a', lanPort = 3791, fakePortal = false, hints = runHints } = {}) {
    const userDataDir = userDataFor(profile);
    const app = await electron.launch({
      executablePath: electronPath,
      args: [repoRoot, `--user-data-dir=${userDataDir}`],
      cwd: repoRoot,
      env: {
        ...process.env,
        R_PLUS_VERIFY_MODE: '1',
        R_PLUS_USER_DATA: userDataDir,
        // run-all.mjs gives each parallel slot its own port block.
        R_PLUS_LAN_HTTP_PORT: String(lanPort + (Number(process.env.E2E_PORT_OFFSET) || 0)),
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
    const salaCards = await page.evaluate((hintIds) => {
      globalThis.localStorage.setItem('rplus-sala-view', 'bar');
      // The full-record side panel opens by itself for a patient with no vitals; specs keep it closed.
      globalThis.localStorage.setItem('rpc-registro-autoopen', 'off');
      if (hintIds) globalThis.localStorage.setItem('rpc-feature-hints-done', JSON.stringify(hintIds));
      // The 8.4.5 choice modal asks once; specs answer it up front (hints on only when a spec wants them).
      globalThis.localStorage.setItem('rpc-feature-hints-enabled', hintIds ? '0' : '1');
      return !!globalThis.document.body.dataset.salaView;
    }, hints ? null : FEATURE_HINTS.map((h) => h.id));
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
    const a11yCheck = a11y.verdict();
    if (a11yCheck) check(a11yCheck.name, a11yCheck.ok, a11yCheck.detail);
    const passed = checks.filter((c) => c.ok).length;
    const report = { scenario, runId, passed, failed: checks.length - passed, checks, timings, a11y: a11y.screens };
    fs.writeFileSync(path.join(artifactDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    for (const dir of Object.values(userDataDirs)) fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync(downloadsDir, { recursive: true, force: true });
    if (Object.keys(timings).length) {
      console.log('\nTimings (ms):');
      console.table(timings);
    }
    console.log(`\n${passed}/${checks.length} checks passed. Artifact: ${path.relative(repoRoot, artifactDir)}`);
    process.exit(report.failed === 0 ? 0 : 1);
  }

  return { artifactDir, downloadsDir, check, shot, launch, finish, timings };
}

/**
 * Mark every in-app «Guía» / «Nuevo» hint as seen, so no hint bubble covers a
 * control the scenario clicks. Call right after launch(); it survives restarts.
 */
export async function quietHints(page) {
  const { activeHints } = await import('../../public/js/feature-hints.mjs');
  const ids = activeHints().map((h) => h.id);
  await page.evaluate((a) => globalThis.localStorage.setItem('rpc-feature-hints-done', JSON.stringify(a)), ids);
  // Hints answered "off" up front, so the first-run «Nuevo: pistas en pantalla» choice never covers the page.
  await page.evaluate(() => globalThis.localStorage.setItem('rpc-feature-hints-enabled', '0'));
  // The full-record side panel opens by itself for a patient with no vitals; specs that are not about it keep it closed.
  await page.evaluate(() => globalThis.localStorage.setItem('rpc-registro-autoopen', 'off'));
}

/**
 * Switch the main area (Paciente, Laboratorio, Manejo, Agenda). The top bar
 * folds the areas into one pill that shows the active one: hover it first.
 */
export async function goArea(page, id) {
  const tab = page.locator(`#apptab-${id}`);
  if (await tab.evaluate((el) => el.classList.contains('active'))) return;
  await page.locator('.topbar-area-btn').hover();
  await tab.click();
}

/**
 * Fresh install → "Solo este equipo" → app ready, help sheet closed. An app
 * that opens without onboarding (R+ Neumo) goes straight to the ready check.
 */
export async function onboardLocalOnly(page) {
  const local = page.locator('[data-sync-mode="local"]');
  await local.or(page.locator('.topbar-area-btn')).first().waitFor({ state: 'visible' });
  if (await local.isVisible()) {
    await local.click();
    await page.locator('#clinical-onboard-local-confirm-btn').click();
  }
  await page.locator('.topbar-area-btn').waitFor({ state: 'visible' });
  await dismissLearnHub(page);
}

/**
 * Close the Learn Hub like a user if it is open. Nothing opens it on its own
 * any more (in-app hint dots replaced the first-run pop-up), so no wait.
 */
export async function dismissLearnHub(page) {
  const hub = page.locator('#learn-hub-backdrop.open');
  if (await hub.count()) {
    await page.keyboard.press('Escape');
    await hub.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
  }
}

/**
 * A SOME list whose antibiotics carry a DIA# that R+ has no record of opens
 * «Días de antibiótico sin registro» (8.4.2): keep SOME's day, like a user
 * who checks it and presses Guardar. No dialog → returns after `timeout`.
 */
export async function acceptAbxDias(page, timeout = 1500) {
  const ok = page.locator('[data-abx-dia-ok]');
  if (await ok.waitFor({ state: 'visible', timeout }).then(() => true, () => false)) {
    await ok.click();
    await ok.waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
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
  return page.locator('.p-name, .ic-card .sv-name').evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().width > 0).length);
}

/** Open the "Pegar SOME" box if needed, paste, press Procesar. */
export async function pasteAndProcess(page, text) {
  await closeToasts(page);
  // #btn-lab-paste lives on the Laboratorio tab, not the Paciente tab (left
  // active by a prior labsCard()-style read) — switch tabs first.
  const labTab = page.locator('#apptab-lab');
  if ((await labTab.count()) && !(await page.locator('#btn-lab-repo-batch').isVisible().catch(() => false))) {
    await goArea(page, 'lab');
  }
  if (!(await page.locator('#lab-input').isVisible())) {
    await page.locator('#lab-bar-more > summary').click();
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
/** After a relaunch, wait out the «Preparando R+» boot screen that covers the app. */
/** Wait out the «Preparando R+» boot screen. It can appear a moment after
 * the census renders, so it must stay gone for 1.5 s. */
export async function waitForBoot(page) {
  await page.waitForFunction(() => {
    const d = globalThis.document;
    const now = Date.now();
    if (d.documentElement.classList.contains('clinical-onboarding-active') || d.querySelector('.clinical-onboard-boot-loader')) {
      globalThis.__e2eBootClearSince = 0;
      return false;
    }
    globalThis.__e2eBootClearSince ||= now;
    return now - globalThis.__e2eBootClearSince >= 1500;
  }, null, { timeout: 30000, polling: 100 });
}

export async function openPatient(page, p) {
  await closeToasts(page);
  // A refused paste leaves the paste box open over the list: close it like a user.
  if (await page.locator('#lab-input').isVisible()) {
    await page.keyboard.press('Escape');
    await page.locator('#lab-input').waitFor({ state: 'hidden', timeout: 5000 });
  }
  await page.locator(`.p-name[title*="${p.exp}"], .ic-card .sv-name[title*="${p.exp}"]`).locator('visible=true').first().click();
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

// ── Accessibility ratchet ────────────────────────────────────────────────
// Every screenshot a scenario takes also runs axe-core (WCAG 2.1 A/AA) on that
// screen. Only serious/critical issues count. Issues already recorded in
// a11y-baseline.json are tolerated; a new rule on a screen, or more elements
// failing a rule, fails the scenario's accessibility check. Fixing issues and
// re-recording lowers the baseline.
//   A11Y_UPDATE=1 npm run e2e -- <scenario>   re-record that scenario's baseline
//   E2E_A11Y=0 npm run e2e                    skip the scans
const A11Y_BASELINE_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'a11y-baseline.json');
const AXE_SOURCE = createRequire(import.meta.url)('axe-core').source;
const COUNTED_IMPACTS = new Set(['serious', 'critical']);

export const a11yEnabled = process.env.E2E_A11Y !== '0';

/**
 * Serious/critical axe violations on the current screen, as { ruleId: { count, help, sample } }.
 * page.evaluate runs outside the page's CSP, so axe can be injected into the app:// window.
 */
export async function scanA11y(page) {
  const violations = await page.evaluate(async (source) => {
    if (!globalThis.axe) (0, eval)(source);
    // A fade/settle still running blends colors with the page behind and reads as low contrast.
    // Users see the settled screen, so wait for finite animations (spinners never end: skipped).
    const finite = document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity);
    await Promise.race([Promise.all(finite.map((a) => a.finished.catch(() => {}))), new Promise((r) => setTimeout(r, 2000))]);
    // Toasts come and go with timing; scanning them would make counts flaky.
    const res = await globalThis.axe.run({ exclude: [['#toast-stack']] }, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      resultTypes: ['violations'],
    });
    return res.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      targets: v.nodes.map((n) => String(n.target[0])),
    }));
  }, AXE_SOURCE);
  const out = {};
  for (const v of violations) {
    if (!COUNTED_IMPACTS.has(v.impact)) continue;
    out[v.id] = { count: v.targets.length, help: v.help, sample: v.targets.slice(0, 3) };
  }
  return out;
}

function readBaseline() {
  try {
    return JSON.parse(fs.readFileSync(A11Y_BASELINE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Compare this run's scans with the baseline for `scenario`.
 * @param {string} scenario
 * @param {Record<string, Record<string, { count: number, help: string, sample: string[] }>>} screens
 * @returns {{ ok: boolean, detail: object }}
 */
export function a11yVerdict(scenario, screens) {
  const all = readBaseline();
  if (process.env.A11Y_UPDATE === '1') {
    all[scenario] = Object.fromEntries(
      Object.entries(screens).map(([screen, rules]) => [screen, Object.fromEntries(Object.entries(rules).map(([id, r]) => [id, r.count]))]),
    );
    const sorted = Object.fromEntries(Object.keys(all).sort().map((k) => [k, all[k]]));
    fs.writeFileSync(A11Y_BASELINE_FILE, JSON.stringify(sorted, null, 2) + '\n');
    return { ok: true, detail: { recorded: Object.keys(screens).length } };
  }
  const base = all[scenario] || {};
  const regressions = [];
  for (const [screen, rules] of Object.entries(screens)) {
    for (const [id, r] of Object.entries(rules)) {
      const allowed = base[screen]?.[id] ?? 0;
      if (r.count > allowed) regressions.push({ screen, rule: id, count: r.count, allowed, help: r.help, sample: r.sample });
    }
  }
  return { ok: regressions.length === 0, detail: regressions.length ? regressions : { screens: Object.keys(screens).length } };
}

/**
 * Per-run recorder: scan(page, label) after each screenshot, then verdict()
 * once at the end → { name, ok, detail } for the scenario's report, or null
 * when scans are off or nothing was captured.
 */
export function createA11yRecorder(scenario) {
  const screens = {};
  return {
    screens,
    async scan(page, label) {
      if (!a11yEnabled || label === 'crash') return;
      let screen = label;
      for (let i = 2; screen in screens; i += 1) screen = `${label}#${i}`;
      screens[screen] = await scanA11y(page).catch((err) => ({ 'axe-error': { count: 1, help: String(err).slice(0, 200), sample: [] } }));
    },
    verdict() {
      const n = Object.keys(screens).length;
      if (!a11yEnabled || !n) return null;
      const v = a11yVerdict(scenario, screens);
      return { name: `accessibility: no new serious/critical axe issues on the ${n} screens captured`, ok: v.ok, detail: v.detail };
    },
  };
}
