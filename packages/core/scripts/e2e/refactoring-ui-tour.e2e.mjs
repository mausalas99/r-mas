#!/usr/bin/env node
/* global document, getComputedStyle */
/**
 * Visual tour for the Refactoring UI R1 build (board "R+ · Refactoring UI",
 * 2026-10-09). Screenshots every rebuilt screen in light and dark on a
 * throwaway profile with DEMO patients only. Checks the shared rules:
 * no card borders, no uppercase section titles, one filled button.
 *
 * Artifact: e2e-artifacts/refactoring-ui-tour/<run-id>/ (screenshots + report.json).
 */
import { createRun, onboardLocalOnly, closeToasts, pasteAndSave, openPatient, goArea } from './harness.mjs';
import { fullLabs } from './some-fixtures.mjs';

const P = { exp: '7000901-1', name: 'DEMO TOUR UNO', room: '204' };
const r = createRun('refactoring-ui-tour');
const { check } = r;

const setTheme = (page, dark) =>
  page.evaluate((d) => document.documentElement.classList.toggle('dark', d), dark);
const escape = (page) => page.keyboard.press('Escape').catch(() => {});
const borderOf = (page, sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el || !el.getBoundingClientRect().height) return null;
    const cs = getComputedStyle(el);
    return [cs.borderTopWidth, cs.borderLeftWidth, cs.borderBottomWidth].join(' ');
  }, sel);
const upperOf = (page, sel) =>
  page.evaluate((s) => [...document.querySelectorAll(s)]
    .filter((el) => el.getBoundingClientRect().height)
    .map((el) => getComputedStyle(el).textTransform), sel);

async function tour(page, theme) {
  const t = (label) => `${theme}-${label}`;
  await setTheme(page, theme === 'dark');
  await page.waitForTimeout(300);

  await goArea(page, 'nota');
  await page.waitForTimeout(400);
  await r.shot(page, t('resumen'));
  const cardB = await borderOf(page, '.patient-dash .card');
  check(`${theme}: Resumen card has no border`, cardB === null || /^0px 0px 0px$/.test(cardB), cardB);
  check(`${theme}: Resumen titles not uppercase`, (await upperOf(page, '.patient-dash .card-h')).every((x) => x !== 'uppercase'));
  const pcB = await borderOf(page, '.patient-card.active');
  check(`${theme}: active patient card has no border or stripe`, pcB === null || /^0px 0px 0px$/.test(pcB), pcB);
  check(`${theme}: sidebar group titles not uppercase`, (await upperOf(page, '.patient-list-section-label')).every((x) => x !== 'uppercase'));

  await page.locator('.dash-name:visible').first().click().catch(() => {});
  await page.waitForTimeout(500);
  await r.shot(page, t('datos'));
  await escape(page);
  await page.waitForTimeout(300);

  await goArea(page, 'lab');
  await page.waitForTimeout(500);
  await r.shot(page, t('labs'));

  await goArea(page, 'med');
  await page.waitForTimeout(400);
  await r.shot(page, t('manejo'));

  await goArea(page, 'agenda');
  await page.waitForTimeout(400);
  await r.shot(page, t('agenda'));
  const filled = await page.evaluate(() =>
    [...document.querySelectorAll('#appcontent-agenda button')]
      .filter((b) => b.getBoundingClientRect().height && getComputedStyle(b).backgroundColor !== 'rgba(0, 0, 0, 0)').length);
  check(`${theme}: Agenda has at most one filled button`, filled <= 1, filled);

  await page.locator('#btn-header-cmdk').click().catch(() => {});
  await page.waitForTimeout(400);
  await r.shot(page, t('cmdk'));
  await escape(page);

  await page.locator('#btn-open-settings').click().catch(() => {});
  await page.waitForTimeout(500);
  await r.shot(page, t('ajustes'));
  check(`${theme}: Ajustes titles not uppercase`, (await upperOf(page, '.settings-section-label')).every((x) => x !== 'uppercase'));
  await escape(page);
  await page.locator('#btn-settings-dropdown-close').click().catch(() => {});
  await page.waitForTimeout(300);

  await page.locator('#profile-toggle-btn').click().catch(() => {});
  await page.waitForTimeout(500);
  await r.shot(page, t('perfil'));
  await escape(page);
  await page.waitForTimeout(300);

  await page.locator('#btn-header-team-sync').click().catch(() => {});
  await page.waitForTimeout(400);
  await page.locator('[data-nube-pop="open-panel"]').click().catch(() => {});
  await page.waitForTimeout(600);
  await r.shot(page, t('nube'));
  await escape(page);
  await page.waitForTimeout(300);
}

await r.finish('Refactoring UI R1 tour: light + dark', async () => {
  const A = await r.launch({ profile: 'a' });
  const page = A.page;
  await onboardLocalOnly(page);
  await closeToasts(page);
  await pasteAndSave(page, fullLabs(P, 'Oct 08 2026 8:00AM'));
  await openPatient(page, P);

  await tour(page, 'light');
  await tour(page, 'dark');

  // Nota de evolución lives in Interconsulta mode.
  const setMode = async (mode) => {
    await closeToasts(page);
    await page.locator('#header-mode-seg').hover();
    const btn = page.locator(`#header-mode-seg button[data-mode="${mode}"]`);
    await btn.waitFor({ state: 'visible' });
    await page.waitForTimeout(400);
    await btn.click();
    await page.waitForTimeout(500);
    await closeToasts(page);
  };
  await setMode('interconsulta');
  await goArea(page, 'nota');
  await page.waitForTimeout(500);
  const icCard = page.locator('.ic-card .sv-name', { hasText: P.name }).locator('visible=true').first();
  if (await icCard.isVisible().catch(() => false)) await icCard.click();
  await page.locator('.exp-group-pill[data-group="clinico"]').hover({ timeout: 5000 }).catch(() => {});
  await page.locator('.exp-group-section[data-section="notas"]').click().catch(() => {});
  const nota = await page.locator('.nota-fit-grid').waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false);
  check('Nota de evolución form is visible', nota);
  for (const dark of [false, true]) {
    await setTheme(page, dark);
    await page.waitForTimeout(300);
    await r.shot(page, `${dark ? 'dark' : 'light'}-nota`);
  }
  await setMode('sala');

  // Labs vacío: delete this patient's labs, then look at the empty state.
  await setTheme(page, false);
  await goArea(page, 'lab');
  await page.locator('#lab-bar-more > summary').click();
  await page.locator('[data-onclick-2="deleteAllLabHistorySets"]').click();
  await page.locator('[data-wb-confirm-ok]').click();
  await page.waitForTimeout(800);
  const probe = await page.evaluate(() => {
    const el = document.getElementById('lab-empty-labs');
    if (!el) return 'missing';
    const anc = [];
    for (let n = el; n; n = n.parentElement) if (getComputedStyle(n).display === 'none') anc.push(n.id || n.className);
    return { hidden: el.hidden, noneChain: anc };
  });
  const empty = await page.locator('.lab-empty-labs-title').innerText().catch(() => '');
  if (!empty) console.log('labs-vacio probe', JSON.stringify(probe));
  check('Labs vacío shows the designed empty state', /Todavía no hay labs/.test(empty), empty);
  await r.shot(page, 'light-labs-vacio');
  await setTheme(page, true);
  await page.waitForTimeout(300);
  await r.shot(page, 'dark-labs-vacio');

  check('no uncaught page errors', A.pageErrors.length === 0, A.pageErrors.slice(0, 3));
});
