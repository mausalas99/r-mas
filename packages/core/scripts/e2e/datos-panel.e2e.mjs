#!/usr/bin/env node
/* global document, getComputedStyle */
/**
 * E2E: «Datos del paciente» (Sala › Resumen › patient name) — board «Ajustes +
 * Perfil», variant Datos B: a summary card first, then Censo / Cama e ingreso /
 * Identidad. DEMO patients only.
 *
 * Ways it can go wrong (each one is a check below):
 *   Summary card
 *     - it does not show the patient's name, bed, age/sex, day of stay and Equipo
 *     - editing a field below does not update it
 *   Tabs
 *     - they are not Censo, Cama e ingreso, Identidad (in that order)
 *     - more than one section shows at a time
 *   Censo
 *     - diagnósticos are not on the left and antibióticos/meds on the right
 *     - antibióticos and meds are not chips
 *     - «+ Agregar» does not add a medication
 *   Throughout
 *     - the window scrolls sideways
 *     - an uncaught page error
 */
import { createRun, onboardLocalOnly, closeToasts, pasteAndSave, openPatient, goArea } from './harness.mjs';
import { fullLabs } from './some-fixtures.mjs';

const P = { exp: '7000601-1', name: 'DEMO DATOS UNO', room: '204' };
const MED = 'OMEPRAZOL 40 MG IV';

const r = createRun('datos-panel');
const { check } = r;

const MODAL = '#exp-datos-modal-backdrop.open';
const tab = (page, id) => page.locator(`${MODAL} [data-datos-tab="${id}"]`);
const visiblePanes = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('#exp-datos-modal-mount [data-datos-pane]')]
      .filter((el) => el.getBoundingClientRect().height > 0)
      .map((el) => el.getAttribute('data-datos-pane')));
const sideScroll = (page) =>
  page.evaluate(() => {
    const el = document.getElementById('exp-datos-modal-mount');
    return el ? el.scrollWidth - el.clientWidth : -1;
  });

await r.finish('Datos del paciente B: summary, tabs, Censo chips', async () => {
  const A = await r.launch({ profile: 'a' });
  await onboardLocalOnly(A.page);
  await closeToasts(A.page);
  await pasteAndSave(A.page, fullLabs(P, 'Sep 24 2026 8:00AM'));
  await openPatient(A.page, P);
  await goArea(A.page, 'nota');
  await A.page.locator('.dash-name:visible').first().click();
  await A.page.locator(MODAL).waitFor({ timeout: 8000 });
  await A.page.waitForTimeout(400);
  await r.shot(A.page, 'datos-open');

  // ── Summary card ───────────────────────────────────────────────────
  const sum = A.page.locator(`${MODAL} [data-datos-summary]`);
  const sumText = await sum.innerText().catch(() => '');
  check('summary card shows the name', sumText.includes(P.name), sumText);
  check('summary card shows the bed', sumText.includes(P.room), sumText);
  check('summary card shows the day of stay', /Día \d+|Sin fecha de ingreso/.test(sumText), sumText);
  check('Equipo sits in the summary card', (await sum.locator('.patient-team-assign-block').count()) === 1);

  // ── Tabs ───────────────────────────────────────────────────────────
  const tabs = await A.page.locator(`${MODAL} [data-datos-tab]`).allInnerTexts();
  check('tabs: Censo, Cama e ingreso, Identidad', tabs.map((t) => t.trim()).join('|') === 'Censo|Cama e ingreso|Identidad', tabs);
  check('Censo opens first, alone', (await visiblePanes(A.page)).join() === 'censo', await visiblePanes(A.page));

  // ── Censo: two columns, chips ──────────────────────────────────────
  const cols = await A.page.evaluate(() => {
    const dx = document.getElementById('patient-dx-list')?.getBoundingClientRect();
    const atb = document.getElementById('patient-censo-atb')?.getBoundingClientRect();
    const meds = document.getElementById('patient-censo-meds')?.getBoundingClientRect();
    return dx && atb && meds ? { dxRight: dx.right, atbLeft: atb.left, medsLeft: meds.left, atbTop: atb.top, medsTop: meds.top } : null;
  });
  check('Diagnósticos left, Antibióticos and Medicamentos stacked on the right',
    !!cols && cols.dxRight <= cols.atbLeft && Math.abs(cols.atbLeft - cols.medsLeft) < 2 && cols.medsTop > cols.atbTop, cols);
  await A.page.locator(`${MODAL} [data-onclick="addCensoLine"][data-onclick-args='["meds"]']`).click();
  const medInput = A.page.locator('#patient-censo-meds input');
  await medInput.fill(MED);
  await medInput.press('Enter');
  await A.page.keyboard.press('Escape');
  await A.page.waitForTimeout(300);
  const chips = await A.page.locator('#patient-censo-meds .exp-datos-line').allInnerTexts();
  const chipShape = await A.page.locator('#patient-censo-meds li').first().evaluate((el) => getComputedStyle(el).borderRadius);
  check('«+ Agregar» adds the medication', chips.some((c) => c.includes(MED)), chips);
  check('medications show as chips', parseFloat(chipShape) >= 12, chipShape);
  check('the modal stays open after Escape inside a chip editor', await A.page.locator(MODAL).isVisible());
  await r.shot(A.page, 'datos-censo');

  // ── Cama e ingreso, Identidad ──────────────────────────────────────
  await tab(A.page, 'cama').click();
  check('Cama e ingreso shows alone', (await visiblePanes(A.page)).join() === 'cama', await visiblePanes(A.page));
  // FIMI three days ago → «Día 4». The date picker keeps a real <input type=date>.
  const fimi = await A.page.evaluate(() => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    const iso = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
    const el = document.querySelector(`#exp-datos-modal-mount [data-oninput-args='["fimiFecha"]']`);
    if (!el) return null;
    el.value = iso;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return iso;
  });
  await A.page.waitForTimeout(300);
  check('a FIMI date three days ago shows «Día 4» in the summary', !!fimi && /Día 4/.test(await sum.innerText()), { fimi, text: await sum.innerText() });
  await r.shot(A.page, 'datos-cama');
  await tab(A.page, 'identidad').click();
  check('Identidad shows alone', (await visiblePanes(A.page)).join() === 'identidad', await visiblePanes(A.page));
  const edad = A.page.locator(`#exp-datos-modal-mount [data-datos-pane="identidad"] [data-oninput-args='["edad"]']`);
  await edad.fill('68');
  await A.page.waitForTimeout(200);
  check('editing Edad updates the summary card', /68 a/.test(await sum.innerText()), await sum.innerText());
  await r.shot(A.page, 'datos-identidad');
  check('no sideways scroll', (await sideScroll(A.page)) <= 0, await sideScroll(A.page));

  await A.page.evaluate(() => document.documentElement.classList.add('dark'));
  await tab(A.page, 'censo').click();
  await A.page.waitForTimeout(250);
  await r.shot(A.page, 'datos-dark');

  check('no uncaught page errors', !A.pageErrors.length, A.pageErrors.slice(0, 5));
  await A.app.close();
});
