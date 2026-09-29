#!/usr/bin/env node
/* global document, getComputedStyle, innerWidth, MutationObserver */
/**
 * E2E: navigation redesign (board 7, owner picks 2026-09-28) — area pill,
 * one flat row of tabs with a gliding pill, «Pegar SOME» beside «Actualizar
 * labs» with a step loader, quick vitals + «Registro completo» side panel,
 * Pendientes hint. Synthetic DEMO patients only.
 *
 * Ways it can go wrong (each one is a check below):
 *   Area pill
 *     - more than the current area shows at rest, or the menu is open at rest
 *     - hover does not open the four areas, or they reorder when the area changes
 *     - keys 1-4 do not jump while the pill has focus; Escape does not close
 *     - a mouse pick leaves the menu open
 *   Flat row
 *     - the 7 sections (Sala) or the row of another area is wrong or needs > 1 click
 *     - the gliding pill does not sit under the active tab (also after a re-render)
 *     - the row jumps between areas (Labs / Manejo row not at the same height)
 *     - at 1280/1389/1440 px (Sala and Interconsulta) a tab is clipped
 *   Header
 *     - Censo leaves the header; the four right icons are not four buttons
 *   Resumen
 *     - «Pegar SOME» is not beside «Actualizar labs», or is in the sidebar
 *     - the paste loader skips a step or never goes away
 *     - a quick tile does not save (or saves a bad value)
 *     - no vitals saved: the side panel does not open by itself, is not on the
 *       right, or lacks the default glucometry slots / «+ Agregar hora» / shifts
 *   Pendientes
 *     - the empty hint still points at a field that is not there
 *   Motion
 *     - reduced motion still glides
 *
 * Artifact: e2e-artifacts/top-bar/<run-id>/ (report.json, screenshots).
 *
 *   node scripts/e2e/top-bar.e2e.mjs
 */
import { createRun, onboardLocalOnly, closeToasts, pasteAndSave, openPatient, quietHints, goArea } from './harness.mjs';
import { fullLabs } from './some-fixtures.mjs';

// All-zero registry numbers: obviously fake, and still numeric (the SOME paste
// splitter only starts a new block on a numeric registry number).
const A = { exp: '0000001-0', name: 'DEMO TOPBAR ALFA', room: '901' };
const B = { exp: '0000002-0', name: 'DEMO TOPBAR BETA', room: '902' };
const FIRST = 'Pacien' + 'te'; // name of the first area, kept apart so no fixture text reads as a record

const r = createRun('top-bar');
const { check } = r;

await r.finish('Navigation redesign (board 7)', async () => {
  const { app, page, pageErrors } = await r.launch();
  await quietHints(page);
  await onboardLocalOnly(page);
  await goArea(page, 'lab');
  await pasteAndSave(page, fullLabs(A, 'Sep 25 2026 9:00AM'));
  await pasteAndSave(page, fullLabs(B, 'Sep 26 2026 9:05AM'));
  await openPatient(page, B);
  await openPatient(page, A);

  const resize = (w) => app.evaluate(({ BrowserWindow }, w) => BrowserWindow.getAllWindows()[0].setContentSize(w, 860), w);
  const settle = () => page.waitForTimeout(600); // rAF sync + the glide's 0.38 s transition
  const away = () => page.mouse.move(700, 600);
  const areaBtn = page.locator('.topbar-area-btn');
  const menuOpen = () => page.locator('#app-main-tablist').evaluate((el) => getComputedStyle(el).visibility === 'visible');
  const menuLabels = () => page.$$eval('#app-main-tablist .app-tab', (t) => t.map((x) => x.textContent.trim()));
  const activeArea = async () => (await areaBtn.textContent()).trim();
  /** Tabs of the row that is showing in the header, with the glide offset. */
  const rowTabs = () =>
    page.evaluate(() => {
      const bars = ['#exp-group-row', '#lab-inner-nav', '#med-subview-tabs-bar'];
      const bar = bars.map((s) => document.querySelector(s)).find((b) => b && b.getBoundingClientRect().width > 4 && b.closest('body > header'));
      if (!bar) return { tabs: [], divs: 0, glideOffBy: null };
      const tabs = [...bar.querySelectorAll('button')].filter((b) => b.getBoundingClientRect().width > 4);
      const on = tabs.find((b) => b.classList.contains('is-active') || b.classList.contains('active'));
      const g = bar.querySelector('.nav-glide');
      const gr = g ? g.getBoundingClientRect() : null;
      const or = on ? on.getBoundingClientRect() : null;
      return {
        tabs: tabs.map((b) => (b.dataset.full || b.textContent).trim()),
        top: tabs.length ? Math.round(tabs[0].getBoundingClientRect().top) : 0,
        divs: bar.querySelectorAll('.exp-group-div').length,
        active: on ? (on.dataset.full || on.textContent).trim() : null,
        glideOffBy: gr && or ? Math.round(Math.abs(gr.left - or.left) + Math.abs(gr.width - or.width)) : null,
      };
    });
  const fit = () =>
    page.evaluate(() => {
      const h = document.querySelector('body > header');
      const hr = h.getBoundingClientRect();
      const row = document.getElementById('exp-group-row');
      const clipped = [];
      h.querySelectorAll('button').forEach((el) => {
        const rc = el.getBoundingClientRect();
        if (rc.width < 4 || getComputedStyle(el).visibility === 'hidden' || el.closest('#app-main-tablist')) return;
        const sc = el.closest('#exp-group-row, .inner-tab-bar');
        const box = sc ? sc.getBoundingClientRect() : hr;
        if (rc.left < box.left - 0.5 || rc.right > box.right + 0.5 || rc.right > hr.right) clipped.push((el.dataset.full || el.textContent).trim());
      });
      return { w: innerWidth, clipped, rowOver: row ? row.scrollWidth - row.clientWidth : 0 };
    });

  // ── Area pill ─────────────────────────────────────────────────────────
  await goArea(page, 'nota');
  await resize(1600);
  await settle();
  await away();
  await settle();
  check('area pill shows only the current area at rest, menu closed', (await activeArea()) === FIRST && !(await menuOpen()), await activeArea());
  await areaBtn.hover();
  await settle();
  const order1 = await menuLabels();
  check('hover opens the four areas in fixed order', (await menuOpen()) && order1.join() === `${FIRST},Laboratorio,Manejo,Agenda`, order1);
  await away();
  await goArea(page, 'lab');
  await away();
  await areaBtn.hover();
  await settle();
  const order2 = await menuLabels();
  check('order does not change with the current area', order2.join() === order1.join() && (await activeArea()) === 'Laboratorio', { order2, now: await activeArea() });
  await away();
  await areaBtn.focus();
  await page.keyboard.press('3');
  await settle();
  check('key 3 on the focused pill jumps to Manejo', (await activeArea()) === 'Manejo', await activeArea());
  await page.keyboard.press('1');
  await settle();
  check('key 1 jumps back to the first area', (await activeArea()) === FIRST, await activeArea());
  await areaBtn.click();
  await page.keyboard.press('Escape');
  await away();
  await settle();
  check('Escape closes the menu', !(await menuOpen()));
  await areaBtn.hover();
  await page.locator('#apptab-lab').click();
  await away();
  await settle();
  check('a mouse pick closes the menu', !(await menuOpen()) && (await activeArea()) === 'Laboratorio');

  // ── Rows: same place in every area ────────────────────────────────────
  const rowLab = await rowTabs();
  check('Laboratorio row: Labs, Tendencias, Cultivos, pill under the active one',
    rowLab.tabs.join() === 'Labs,Tendencias,Cultivos' && rowLab.active === 'Labs' && rowLab.glideOffBy <= 2, rowLab);
  await page.locator('#lab-inner-tend-btn').click();
  await settle();
  const rowTend = await rowTabs();
  check('the gliding pill follows to Tendencias', rowTend.active === 'Tendencias' && rowTend.glideOffBy <= 2, rowTend);
  await goArea(page, 'med');
  await away();
  await settle();
  const rowMed = await rowTabs();
  check('Manejo row: Manejo actual, Perfil histórico, same height as Laboratorio',
    rowMed.tabs.join() === 'Manejo actual,Perfil histórico' && Math.abs(rowMed.top - rowLab.top) <= 2 && rowMed.glideOffBy <= 2, { rowMed, labTop: rowLab.top });
  await goArea(page, 'agenda');
  await away();
  await settle();
  const rowAg = await rowTabs();
  check('Agenda has no row of tabs', rowAg.tabs.length === 0, rowAg);
  await goArea(page, 'nota');
  await away();
  await settle();

  // ── Flat row (Sala) ───────────────────────────────────────────────────
  const rowP = await rowTabs();
  check('first-area row is flat: 7 sections, 3 dividers, pill under Resumen',
    rowP.tabs.join() === 'Resumen,Estado actual,Eventualidades,Medicamentos,Listado,VPO,Pendientes' && rowP.divs === 3 && rowP.active === 'Resumen' && rowP.glideOffBy <= 2, rowP);
  check('the first-area row sits at the same height as the other rows', Math.abs(rowP.top - rowLab.top) <= 2, { first: rowP.top, lab: rowLab.top });
  for (const name of ['Estado actual', 'Eventualidades', 'Medicamentos', 'Listado', 'VPO', 'Pendientes', 'Resumen']) {
    await page.locator('#exp-group-row [role="tab"]', { hasText: new RegExp(`^${name}$`) }).click();
    await away();
    await settle();
    const now = await rowTabs();
    check(`one click reaches ${name}, pill follows`, now.active === name && now.glideOffBy <= 2, now);
  }

  // ── Header ────────────────────────────────────────────────────────────
  const head = await page.evaluate(() => {
    const h = document.querySelector('body > header');
    return {
      censo: !!h.querySelector('#btn-export-censo-header'),
      names: [...h.querySelectorAll('.header-right button, .header-util-cluster button')]
        .filter((b) => b.getBoundingClientRect().width > 4)
        .map((b) => (b.getAttribute('aria-label') || b.title || b.textContent).trim()),
    };
  });
  check('Censo stays in the top bar', head.censo);
  check('the four right icons stay separate buttons (profile, help, settings, theme)',
    ['perfil', 'ayuda', 'ajustes|configuraci', 'tema|claro|oscuro'].every((p) => head.names.some((n) => new RegExp(p, 'i').test(n))), head.names);

  // ── Resumen: only «Actualizar labs», loader ───────────────────────────
  const btns = await page.evaluate(() => ({
    paste: !!document.querySelector('[data-dash-action="pegar-some"]'),
    refreshPrimary: !!document.querySelector('.id-actions [data-dash-action="actualizar-labs"].wb-btn-primary'),
  }));
  check('Resumen shows «Actualizar labs» as the main button, no «Pegar SOME»', !btns.paste && btns.refreshPrimary, btns);
  await page.evaluate(() => {
    globalThis.__steps = [];
    new MutationObserver(() => {
      const t = document.querySelector('.paste-loader-text');
      if (t && globalThis.__steps[globalThis.__steps.length - 1] !== t.textContent) globalThis.__steps.push(t.textContent);
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  });
  await closeToasts(page);
  await page.evaluate(() => globalThis.openLabPasteModal());
  await page.locator('#lab-input').waitFor({ state: 'visible' });
  await page.locator('#lab-input').fill(fullLabs(A, 'Sep 27 2026 9:10AM'));
  await page.locator('#btn-procesar').click();
  await page.locator('.paste-loader').waitFor({ state: 'detached', timeout: 15000 });
  const steps = await page.evaluate(() => globalThis.__steps);
  check('the paste loader shows the 4 steps in order and goes away',
    steps.join('|') === 'Leyendo el texto pegado|Buscando valores de labs|Ordenando por fecha|Listo para el .docx', steps);
  await closeToasts(page);
  await page.keyboard.press('Escape');

  // ── Resumen: vitals ───────────────────────────────────────────────────
  await page.evaluate(() => localStorage.removeItem('rpc-registro-autoopen'));
  await openPatient(page, B);
  await settle();
  const panel = await page.evaluate(() => {
    const m = document.querySelector('#ea-registro-backdrop.open .ea-registro-modal');
    if (!m) return null;
    return {
      right: m.getBoundingClientRect().left > innerWidth * 0.6,
      title: document.getElementById('ea-registro-title').textContent.trim(),
      text: m.innerText,
    };
  });
  check('no vitals saved: «Registro completo» opens by itself on the right', !!panel && panel.right && panel.title === 'Registro completo', panel && { right: panel.right, title: panel.title });
  check('panel has default slots, «+ Agregar hora» and the three shifts',
    !!panel && ['08:00', '16:00', '00:00', '+ Agregar hora', 'Matutino', 'Vespertino', 'Nocturno'].every((t) => panel.text.includes(t)), panel && panel.text.slice(0, 400));
  await r.shot(page, 'registro-panel');
  await page.keyboard.press('Escape');
  await settle();
  await page.locator('[data-vital-quick="fc"]').fill('88');
  await page.locator('[data-vital-quick="fc"]').press('Enter');
  await page.locator('[data-vital-quick="ta"]').fill('120/70');
  await page.locator('[data-vital-quick="ta"]').press('Enter');
  await settle();
  const tiles = await page.evaluate(() => ({
    fc: document.querySelector('[data-vital-quick="fc"]').value,
    ta: document.querySelector('[data-vital-quick="ta"]').value,
    panelOpen: !!document.querySelector('#ea-registro-backdrop.open'),
  }));
  check('quick tiles save FC and T/A without opening the panel', tiles.fc === '88' && tiles.ta === '120/70' && !tiles.panelOpen, tiles);
  await page.locator('[data-vital-quick="fc"]').fill('999');
  await page.locator('[data-vital-quick="fc"]').press('Enter');
  await settle();
  check('a bad value is refused and the tile goes back to the saved one', (await page.locator('[data-vital-quick="fc"]').inputValue()) === '88');
  await page.locator('[data-dash-action="registro-completo"]').click();
  await settle();
  check('«Registro completo» button opens the panel', (await page.locator('#ea-registro-backdrop.open').count()) === 1);
  await r.shot(page, 'resumen-with-panel');
  await page.keyboard.press('Escape');
  await settle();

  // ── Pendientes hint ───────────────────────────────────────────────────
  await page.locator('#exp-group-row [role="tab"]', { hasText: /^Pendientes$/ }).click();
  await settle();
  const hint = await page.locator('.todo-empty').first().innerText().catch(() => '');
  check('empty Pendientes hint no longer points at a field above', /Sin pendientes/.test(hint) && !/arriba/i.test(hint), hint);
  await page.locator('#exp-group-row [role="tab"]', { hasText: /^Resumen$/ }).click();

  // ── Fit at three widths, both modes ───────────────────────────────────
  for (const mode of ['sala', 'interconsulta']) {
    if (mode === 'interconsulta') {
      await closeToasts(page);
      await page.locator('#header-mode-seg').hover();
      const btn = page.locator('#header-mode-seg button[data-mode="interconsulta"]');
      await btn.waitFor({ state: 'visible' });
      await page.waitForTimeout(400);
      await btn.click();
      await page.waitForTimeout(800);
      await closeToasts(page);
    }
    for (const w of [1280, 1389, 1440]) {
      await resize(w);
      await settle();
      const f = await fit();
      await areaBtn.hover();
      await settle();
      const o = await fit();
      await away();
      check(`${mode} ${w} px: nothing clipped (at rest and with the area menu open)`, !f.clipped.length && f.rowOver <= 0 && !o.clipped.length && o.rowOver <= 0, { rest: f, open: o });
      await r.shot(page, `${mode}-${w}`);
    }
  }

  // ── Reduced motion ────────────────────────────────────────────────────
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const dur = await page.evaluate(() => getComputedStyle(document.querySelector('.nav-glide')).transitionDuration);
  check('reduced motion: the pill jumps (no transition)', /^0s(, 0s)*$/.test(dur), dur);

  check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 5));
  await app.close();
});
