#!/usr/bin/env node
/* global document, getComputedStyle */
/**
 * E2E: Labs page bar (8.4.4): Actualizar labs is the one loud button, the ⋯ menu holds
 * Pegar SOME / Diagramas / Tablas / Copiar varios días / Vista / delete, the search box
 * finds a study across days, the amber late line, «Copiar varios días» (quick picks,
 * counts) and the Tablas tabs. Synthetic DEMO patient, made-up expediente.
 * (File name kept from the earlier-days round: no earlier-day blocks exist any more.)
 *
 * Ways it can go wrong (each one is a check below):
 *   - Actualizar labs is not the main button, or a Copiar button is still in the bar
 *   - Consolidar / Reprocesar are still in the menu, or Pegar SOME is not in it
 *   - Pegar SOME in the menu does not open the paste box
 *   - a Vista switch does not save its pref
 *   - Copiar varios días: a quick pick marks the wrong days, the footer count is wrong,
 *     or the copy holds the wrong days
 *   - Tablas: tabs missing, a tab does not switch section, «Solo alterados» keeps normal rows
 *   - the search box jumps to the wrong day, counts wrong, steps the wrong way, or leaves marks behind
 *   - the amber «Aún no hay labs de hoy» line is missing when the last labs are old,
 *     names the wrong last day, or stays after labs from today arrive
 *
 * Artifact: e2e-artifacts/lab-prev-days/<run-id>/ (report.json + screenshots).
 *
 *   npm run e2e:lab-prev-days
 */
import { createRun, onboardLocalOnly, closeToasts, pasteAndSave, openPatient, goArea, quietHints } from './harness.mjs';
import { TABLE, header, gas } from './some-fixtures.mjs';

const P = { exp: '7000004-4', name: 'DEMO GARCIA LUIS', room: '501' };

/** A blood count with a distinct WBC per report, so a copy can be traced to its day. */
function cbc(p, when, wbc) {
  return (
    header(p, when) +
    'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE +
    'HGB\t\t*\t13.10\tg/dL\t12.20 - 18.10\n' +
    `WBC\t\tA\t${wbc}\tK/uL\t4.00 - 11.00\n` +
    'PLT\t\t*\t251\tK/uL\t142.00 - 424.00\n'
  );
}

/** Real SOME layout: one cell per line (the Tablas parser reads this, not the one-line rows above). */
const vrow = (name, flag, val, unit, ref) => `${name}\t\n${flag}\n${val}\n${unit}\t${ref}\n`;
function tableReport(p, when) {
  return (
    header(p, when) +
    'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE +
    vrow('HGB', 'B', '11.85', 'g/dL', '12.20 - 18.10') +
    vrow('WBC', '*', '6.12', 'K/uL', '4.00 - 11.00') +
    vrow('PLT', '*', '248', 'K/uL', '142.00 - 424.00') +
    '\nQUIMICA CLINICA\nQUIMICA SANGUINEA\n' + TABLE +
    vrow('CREATININA', '*', '0.9', 'mg/dL', '0.6 - 1.2') +
    '&\nDr. Ejemplo Sintetico Responsable Sanitario\nel Laboratorio.\nSistema SOME MOP-XX-000\n2600000000\n'
  );
}

const r = createRun('lab-prev-days');
const { check } = r;

await r.finish('Lab bar', async () => {
  const { app, page } = await r.launch();
  await quietHints(page);
  await onboardLocalOnly(page);
  await goArea(page, 'lab');

  // One report for a new expediente saves it as a new patient; the rest go to that patient.
  await pasteAndSave(page, cbc(P, 'Jan 1 2026 8:00AM', '11.11'));
  await openPatient(page, P);
  await goArea(page, 'lab');
  await pasteAndSave(
    page,
    [
      cbc(P, 'Jan 2 2026 8:00AM', '12.22'),
      gas(P, 'Jan 2 2026 9:00AM', '7.35'),
      cbc(P, 'Jan 3 2026 8:00AM', '13.33'),
      cbc(P, 'Jan 4 2026 8:00AM', '14.44'),
      cbc(P, 'Jan 4 2026 3:00PM', '15.55'),
    ].join('\n\n')
  );
  await openPatient(page, P);
  if (!(await page.locator('#lab-history-date-select').isVisible())) await goArea(page, 'lab');

  const pick = async (date) => {
    await page.locator('#lab-history-date-select').selectOption(`day:${date}`);
    await page.waitForTimeout(500);
  };
  const clip = () => app.evaluate(({ clipboard }) => clipboard.readText());
  const menu = page.locator('#lab-bar-more');
  const openMenu = async () => {
    if (!(await menu.evaluate((el) => el.open))) await menu.locator('> summary').click();
  };

  await pick('04/01/2026');
  await r.shot(page, 'bar-latest-day');
  const box = await page.locator('#lab-output-box').innerText();
  check('selected day box has its own values', /15\.55/.test(box) && !/13\.33|12\.22/.test(box), box.slice(0, 200));
  check('no Copiar button in the bar, no earlier-day blocks', (await page.locator('.lab-output-copy-btn, #lab-prev-days').count()) === 0);

  // ⋯ menu content.
  await openMenu();
  await r.shot(page, 'bar-menu-open');
  const items = await menu.locator('.lab-bar-menu > :not([hidden])').allInnerTexts();
  const flat = items.map((t) => t.trim()).filter(Boolean).map((t) => (t === 'VISTA' ? 'Vista' : t === 'DATOS' ? 'Datos' : t));
  check('menu has Pegar SOME, Copiar varios días, Vista switches, both deletes',
    ['Pegar SOME', 'Copiar varios días…', 'Vista', 'BH extendida', 'Salida rápida', 'Eliminar este día', 'Eliminar todos los estudios'].every((t) => flat.includes(t)), flat);
  check('menu order: Pegar SOME before Copiar varios días before Vista before Eliminar',
    flat.indexOf('Pegar SOME') < flat.indexOf('Copiar varios días…') && flat.indexOf('Copiar varios días…') < flat.indexOf('Vista') && flat.indexOf('Vista') < flat.indexOf('Eliminar este día'), flat);
  check('no Consolidar / Reprocesar', !flat.some((t) => /Consolidar|Reprocesar/.test(t)), flat);
  check('Gasometría extendida switch stays hidden (feature paused)', !(await page.locator('#lab-menu-pref-gaso').isVisible()));

  // Vista switch saves its pref, and shows it again on the next open.
  const prefs = () => page.evaluate(() => JSON.parse(localStorage.getItem('rpc-lab-output-prefs-v1') || '{}'));
  await page.locator('label.rpc-switch:has(#lab-menu-pref-bh)').click();
  await page.waitForTimeout(300);
  check('Vista: BH extendida switch saves the pref', (await prefs()).showBhExtendedLine === true, await prefs());
  await page.locator('label.rpc-switch:has(#lab-menu-pref-bh)').click();
  await page.waitForTimeout(300);
  check('Vista: switching it off saves again', !(await prefs()).showBhExtendedLine, await prefs());

  // Esc closes the menu.
  await page.keyboard.press('Escape');
  check('Esc closes the menu', !(await menu.evaluate((el) => el.open)));

  // Pegar SOME from the menu opens the paste box.
  await openMenu();
  await page.locator('#btn-lab-paste').click();
  await page.locator('#lab-input').waitFor({ state: 'visible' });
  check('Pegar SOME (menu) opens the paste box, menu closed', !(await menu.evaluate((el) => el.open)));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // Diagramas from the menu opens the diagrams window.
  await openMenu();
  await page.locator('#lab-diagrams-btn').click();
  await page.waitForTimeout(400);
  check('Diagramas (menu) opens the diagrams window', (await page.locator('#lab-diagrams-backdrop.open').count()) === 1);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check('Esc closes the diagrams window', (await page.locator('#lab-diagrams-backdrop.open').count()) === 0);

  // Copiar varios días: quick picks + footer count + copy.
  await openMenu();
  await page.locator('.lab-bar-menu-h ~ button:has-text("Copiar varios días")').click();
  const dlg = page.locator('#lab-batch-copy-backdrop');
  await dlg.waitFor({ state: 'visible' });
  await r.shot(page, 'copydays-open');
  check('Copiar varios días: 4 day rows with weekday', (await dlg.locator('.lab-copydays-row').count()) === 4 && /^(lunes|martes|miércoles|jueves|viernes|sábado|domingo)$/.test((await dlg.locator('.lab-copydays-wd').first().innerText()).trim()));
  await dlg.locator('[data-pick="3"]').click();
  const cnt = () => dlg.locator('#lab-batch-copy-count').innerText();
  check('Últimos 3 → «3 días · 4 envíos»', (await cnt()) === '3 días · 4 envíos', await cnt());
  await dlg.locator('[data-pick="none"]').click();
  check('Ninguno → copy disabled', (await dlg.locator('#lab-batch-copy-ok').isDisabled()) && /Ningún/.test(await cnt()));
  await dlg.locator('[data-pick="3"]').click();
  await r.shot(page, 'copydays-last3');
  await closeToasts(page);
  await dlg.locator('#lab-batch-copy-ok').click();
  await page.waitForTimeout(500);
  const cDays = await clip();
  check('copy holds the 3 newest days, not the oldest', /15\.55/.test(cDays) && /13\.33/.test(cDays) && /12\.22/.test(cDays) && !/11\.11/.test(cDays), cDays.slice(0, 200));

  // Search box: «ph» exists on 02/01 only; «hb» exists on all 4 days.
  const search = page.locator('#lab-search-input');
  const count = page.locator('#lab-search-count');
  const picked = () => page.locator('#lab-history-date-select').inputValue();
  await search.fill('ph');
  await page.waitForTimeout(600);
  check('search «ph»: jumps to 02/01, count «1 de 1»', (await picked()) === 'day:02/01/2026' && (await count.textContent()) === '1 de 1', await picked());
  check('search «ph»: the study name is marked', (await page.locator('#lab-output-box mark.lab-hit').count()) > 0);
  await r.shot(page, 'search-ph');
  await search.fill('zzz');
  await page.waitForTimeout(400);
  check('search «zzz»: says «Sin resultados», no marks', (await count.textContent()) === 'Sin resultados' && (await page.locator('mark.lab-hit').count()) === 0);
  await search.fill('hb');
  await page.waitForTimeout(600);
  check('search «hb»: newest day first, «1 de 4»', (await picked()) === 'day:04/01/2026' && (await count.textContent()) === '1 de 4', await count.textContent());
  await page.locator('#lab-search-prev').click();
  await page.waitForTimeout(500);
  check('search: ‹ goes to the older match (03/01, «2 de 4»)', (await picked()) === 'day:03/01/2026' && (await count.textContent()) === '2 de 4', await picked());
  await search.press('Escape');
  await page.waitForTimeout(300);
  check('search: Esc clears the box, the count and the marks', (await search.inputValue()) === '' && (await count.textContent()) === '' && (await page.locator('mark.lab-hit').count()) === 0);

  await page.mouse.move(0, 0); // no hover state on the buttons
  const styles = await page.evaluate(() => {
    const bg = (el) => getComputedStyle(el).backgroundColor;
    const repo = document.querySelector('#btn-lab-repo-batch');
    const more = document.querySelector('#lab-bar-more > summary');
    return { repo: bg(repo), more: bg(more), radius: getComputedStyle(repo).borderTopLeftRadius };
  });
  check('Actualizar labs is filled (the one loud pill), ⋯ is not', styles.repo !== styles.more && styles.repo !== 'rgba(0, 0, 0, 0)', styles);
  await pick('04/01/2026');
  await r.shot(page, 'bar-final');

  // Late state: the last labs are from 04/01/2026, so the amber line names that day and hour.
  const late = page.locator('#lab-late-status');
  const lateText = ((await late.isVisible()) && (await late.innerText())) || '';
  check('late state: amber line names the last labs (04/01 · 15:00)', /Aún no hay labs de hoy · último 04\/01 · 15:00/.test(lateText), lateText);
  await r.shot(page, 'bar-late-state');
  const now = new Date();
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][now.getMonth()];
  await pasteAndSave(page, cbc(P, `${mon} ${now.getDate()} ${now.getFullYear()} 6:10AM`, '16.66'));
  await openPatient(page, P);
  if (!(await page.locator('#lab-history-date-select').isVisible())) await goArea(page, 'lab');
  check('late state: line is gone once labs from today exist', !(await late.isVisible()));

  // Tablas del reporte: tabs per section, red count, Solo alterados.
  await pasteAndSave(page, tableReport(P, 'Jan 5 2026 9:00AM'));
  await openPatient(page, P);
  if (!(await page.locator('#lab-history-date-select').isVisible())) await goArea(page, 'lab');
  await pick('05/01/2026');
  await openMenu();
  await page.locator('#lab-some-tables-btn').click();
  const tb = page.locator('#lab-some-tables-modal-body');
  await tb.locator('.lab-some-tab').first().waitFor({ state: 'visible' });
  await r.shot(page, 'tables-tabs');
  const tabs = await tb.locator('.lab-some-tab').count();
  check('Tablas: one tab per section, first one active, one section visible', tabs >= 1 && (await tb.locator('.lab-some-tab.is-active').count()) === 1 && (await tb.locator('.lab-some-dept:visible').count()) === 1, tabs);
  check('Tablas: an altered value shows a red count on its tab', (await tb.locator('.lab-some-tab-count').count()) >= 1);
  check('Tablas: the report footer is not a row', !/Responsable|Sistema SOME|Laboratorio\./.test(await tb.innerText()));
  const normalRows = () => tb.locator('.lab-some-dept:visible tbody tr:visible:not(.lab-some-row--abnormal)').count();
  const before = await normalRows();
  await tb.locator('.lab-some-only-abn').click();
  check('Solo alterados hides the normal rows', before > 0 && (await normalRows()) === 0, before);
  if (tabs > 1) {
    await tb.locator('.lab-some-tab').nth(1).click();
    check('second tab shows the second section only', (await tb.locator('.lab-some-dept:visible').count()) === 1 && (await tb.locator('.lab-some-dept').nth(1).isVisible()));
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
});
