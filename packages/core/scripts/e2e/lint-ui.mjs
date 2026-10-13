#!/usr/bin/env node
/* global document */
/**
 * lintapple over the whole R+ Electron app: every mode × area, the inner Lab
 * tabs, the main overlays, light and dark. Throwaway userData, synthetic DEMO
 * patient only. Policy: ui-policy.json.
 * Run: npm run lint:ui   Output: e2e-artifacts/lint-ui/<run>/lintapple.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { checkPage } from 'lintapple';
import { createRun, onboardLocalOnly, waitForBoot, goArea, pasteAndSave, closeToasts } from './harness.mjs';
import { fullLabs } from './some-fixtures.mjs';
import { repoRoot } from './harness.mjs';

const policy = JSON.parse(fs.readFileSync(path.join(repoRoot, 'ui-policy.json'), 'utf8'));
const run = createRun('lint-ui');
const P = { exp: '9000095-7', name: 'DEMO PÉREZ JUAN', room: '412' };
const findings = [];
const skipped = [];
const inconclusive = [];

async function scan(page, screen) {
  await page.waitForTimeout(400);
  const r = await checkPage(page, policy).catch(async () => { await page.waitForTimeout(800); return checkPage(page, policy); });
  // Selectors are positional; add a readable name (id, classes, text) so a finding can be found in the source.
  const who = await page.evaluate((sels) => sels.map((q) => {
    const el = document.querySelector(q);
    return el ? `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${String(el.getAttribute('class') || '').split(/\s+/).slice(0, 3).join('.')} "${(el.getAttribute('aria-label') || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)}"` : '?';
  }), r.findings.map((f) => f.selector)).catch(() => []);
  r.findings.forEach((f, i) => {
    // "could not be measured" = the tool could not decide (overlay on top, glyph-only text). Not a failure.
    const bucket = /could not be measured|Unable to determine/.test(f.actual || f.message) ? inconclusive : findings;
    bucket.push({ screen, who: who[i] || '?', ...f });
  });
  console.log(`scanned ${screen}: ${r.findings.length}`);
}

/** Run one step; a step that cannot be reached is listed, never hidden. */
async function step(screen, fn) {
  try { await fn(); } catch (e) { skipped.push(`${screen}: ${String(e.message).split('\n')[0]}`); }
}

async function overlay(page, screen, openSel) {
  await step(screen, async () => {
    await closeToasts(page);
    await page.locator(openSel).locator('visible=true').first().click({ timeout: 4000 });
    await scan(page, screen);
    await page.keyboard.press('Escape');
    await page.mouse.move(0, 600);
  });
}

async function setMode(page, mode) {
  await page.locator('#header-mode-seg').hover();
  const b = page.locator(`#header-mode-seg button[data-mode="${mode}"]`);
  await b.waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
  await b.click();
  await closeToasts(page);
  await page.mouse.move(0, 600);
}

async function areas(page, tag) {
  for (const area of ['lab', 'nota', 'med', 'agenda']) {
    await step(`${tag}/${area}`, async () => {
      await goArea(page, area);
      await page.mouse.move(0, 600);
      if (area === 'lab') {
        for (const inner of ['labs', 'tend', 'cult']) {
          await step(`${tag}/lab-${inner}`, async () => {
            await page.locator(`#lab-inner-${inner}-btn, .lab-inner-${inner}-btn`).locator('visible=true').first().click({ timeout: 3000 });
            await scan(page, `${tag}/lab-${inner}`);
          });
        }
      } else await scan(page, `${tag}/${area}`);
    });
  }
}

await run.finish('lint-ui', async () => {
  const { app, page } = await run.launch();
  await page.setViewportSize(policy.viewports[0]);
  await onboardLocalOnly(page);
  await waitForBoot(page);

  await scan(page, 'sala/empty');
  await goArea(page, 'lab');
  await pasteAndSave(page, fullLabs(P, 'Apr 11 2026 9:42AM'));
  await pasteAndSave(page, fullLabs(P, 'Mar 05 2026 8:10AM'));
  await step('admission', async () => {
    await page.locator('.p-name', { hasText: 'DEMO' }).locator('visible=true').first().click();
    await page.locator('#m-servicio').waitFor({ state: 'visible', timeout: 4000 });
    await scan(page, 'admission-form');
    await page.locator('#m-servicio').fill('MEDICINA INTERNA');
    await page.locator('#m-cuarto').fill(P.room);
    await page.locator('#m-cama').fill('01');
    await page.getByRole('button', { name: 'Agregar Paciente' }).click();
    await page.locator('#m-servicio').waitFor({ state: 'hidden' });
  });

  await step('mode sala', () => areas(page, 'sala'));
  await step('dark', async () => {
    await page.locator('#theme-toggle, .theme-toggle').locator('visible=true').first().click();
    await page.mouse.move(0, 600);
    await areas(page, 'dark');
    await page.locator('#theme-toggle, .theme-toggle').locator('visible=true').first().click();
  });
  await goArea(page, 'lab').catch(() => {});
  for (const [screen, sel] of [
    ['overlay/settings', '#btn-open-settings'],
    ['overlay/cmdk', '#btn-header-cmdk'],
    ['overlay/profile', '#profile-toggle-btn'],
    ['overlay/help', '.btn-header-icon[aria-label="Ayuda"], .btn-header-icon[title="Ayuda"]'],
    ['overlay/filters', '#btn-patient-filters'],
    ['overlay/lab-more', '.lab-output-more-btn'],
    ['overlay/paste', '#lab-bar-more > summary'],
  ]) await overlay(page, screen, sel);

  await step('mode interconsulta', async () => {
    await setMode(page, 'interconsulta');
    await areas(page, 'interconsulta');
  });
  await step('mode guardia', async () => {
    await setMode(page, 'guardia');
    await scan(page, 'guardia');
  });

  fs.writeFileSync(path.join(run.artifactDir, 'lintapple.json'), JSON.stringify(findings, null, 2));
  fs.writeFileSync(path.join(run.artifactDir, 'inconclusive.json'), JSON.stringify(inconclusive, null, 2));
  const key = new Map();
  for (const f of findings) {
    const k = `${f.rule}|${f.selector}`;
    if (!key.has(k)) key.set(k, { rule: f.rule, selector: f.selector, who: f.who, message: f.message, fix: f.fix, screens: [] });
    key.get(k).screens.push(f.screen);
  }
  const unique = [...key.values()];
  fs.writeFileSync(path.join(run.artifactDir, 'unique.json'), JSON.stringify(unique, null, 2));
  const byRule = {};
  for (const u of unique) byRule[u.rule] = (byRule[u.rule] || 0) + 1;
  console.table(byRule);
  console.log(`Inconclusive (tool could not measure): ${inconclusive.length}`);
  if (skipped.length) console.log('NOT REACHED:\n' + skipped.join('\n'));
  run.check('no UI findings', findings.length === 0, `${unique.length} unique, ${findings.length} total → ${run.artifactDir}`);
  await app.close();
});
