#!/usr/bin/env node
/* global document, getComputedStyle, innerWidth */
/**
 * E2E: the 48 px top bar (Nav-G / E2) — area tabs and the active area's
 * level-2 bar share one header row. Synthetic DEMO patients only.
 *
 * Ways it can go wrong (each one is a check below):
 *   Layout
 *     - the header is not 48 px, or the area tabs stay out of it
 *     - at 1280/1389/1440 px (Sala and Interconsulta, Estado actual open) a
 *       bar item is clipped or the pill row overflows
 *   Area pill (owner pick «Una pastilla»)
 *     - more than the active area shows at rest
 *     - hover does not grow it in place (covers the row instead of pushing it)
 *     - keyboard Tab does not open it, or an arrow key loses focus
 *     - it stays open after a mouse pick
 *   Room
 *     - Atajos / Aprender R+ show as their own icons, or the «?» Ayuda menu
 *       does not open them
 *     - Censo stays in the header while the patient list shows, or the
 *       Sala/IC/Guardia switcher leaves the header
 *     - a short label loses its full name (aria-label + tooltip)
 *     - a header button has no accessible name
 *     - the old tab row, the date or the context path still show
 *     - two level-2 bars show at once, or the wrong one for the area
 *     - a patient switch brings back the wrong level-2 bar
 *   Clínico pill
 *     - it is open at rest on Resumen (crowds the bar)
 *     - the «Clínico» name shows while one of its sections is active
 *     - an open group name uses another font (caps, 10 px) than the pills
 *     - it does not open on hover or on keyboard focus
 *     - it closes while one of its sections (Eventualidades) is active
 *   Reach
 *     - a section (Resumen, Estado actual, Eventualidades, Medicamentos,
 *       Salida, Pendientes) needs more than 1 click
 *     - Tendencias (Laboratorio) or Perfil histórico (Manejo) needs more than 1 click
 *   Actions
 *     - the Drive icon shows outside Clínico
 *     - the Datos icon does not open the datos dialog
 *   Look
 *     - the Pendientes dot is not amber
 *     - dark theme: bar is not dark, or the active pill is unreadable
 *
 * Artifact: e2e-artifacts/top-bar/<run-id>/ (report.json, screenshots).
 *
 *   node scripts/e2e/top-bar.e2e.mjs
 */
import { createRun, onboardLocalOnly, closeToasts, pasteAndSave, openPatient, quietHints, goArea } from './harness.mjs';
import { fullLabs } from './some-fixtures.mjs';

// All-zero expedientes: obviously fake, and still numeric (the SOME paste
// splitter only starts a new patient block on a numeric expediente, and
// matching ignores the digit after the dash).
const A = { exp: '0000001-0', name: 'DEMO TOPBAR ALFA', room: '901' };
const B = { exp: '0000002-0', name: 'DEMO TOPBAR BETA', room: '902' };

const r = createRun('top-bar');
const { check } = r;

await r.finish('Top bar (Nav-G)', async () => {
  const { app, page, pageErrors } = await r.launch();
  await quietHints(page);
  await onboardLocalOnly(page);
  await goArea(page, 'lab');
  await pasteAndSave(page, fullLabs(A, 'Sep 25 2026 9:00AM'));
  await pasteAndSave(page, fullLabs(B, 'Sep 26 2026 9:05AM'));
  // Complete both admissions first: an incomplete patient drops out of the
  // sidebar once another one is completed.
  await openPatient(page, B);
  await openPatient(page, A);

  const area = async (id) => {
    await goArea(page, id);
    await page.mouse.move(600, 500);
  };
  /** Area tabs with a real width (folded ones are 0 px wide). */
  const shownAreas = () =>
    page.$$eval('#app-main-tablist .app-tab', (tabs) =>
      tabs.filter((t) => t.getBoundingClientRect().width > 4).map((t) => t.id.replace('apptab-', '')));
  /** Header items cut off by the window or by their scroll row; row overflow. */
  const fit = () =>
    page.evaluate(() => {
      const h = document.querySelector('body > header');
      const hr = h.getBoundingClientRect();
      const row = document.getElementById('exp-group-row');
      const clipped = [];
      h.querySelectorAll('button').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width < 4 || getComputedStyle(el).opacity === '0') return;
        const sc = el.closest('#exp-group-row, .inner-tab-bar');
        const box = sc ? sc.getBoundingClientRect() : hr;
        if (r.left < box.left - 0.5 || r.right > box.right + 0.5 || r.right > hr.right) clipped.push((el.dataset.full || el.textContent || el.id).trim());
      });
      return { w: innerWidth, clipped, rowOver: row ? row.scrollWidth - row.clientWidth : 0, rowLeft: row ? Math.round(row.getBoundingClientRect().left) : 0 };
    });
  const resize = (w) => app.evaluate(({ BrowserWindow }, w) => BrowserWindow.getAllWindows()[0].setContentSize(w, 860), w);
  const settle = () => page.waitForTimeout(450); // rAF sync + grid-template-columns transition
  /** Which level-2 bars are shown (not display:none) inside the header. */
  const shownBars = () =>
    page.evaluate(() => {
      const bars = { paciente: '.topbar-l2 > .exp-expediente-nav', lab: '#lab-inner-nav', med: '#med-subview-tabs-bar' };
      return Object.keys(bars).filter((k) => {
        const el = document.querySelector(bars[k]);
        return el && el.closest('body > header') && getComputedStyle(el).display !== 'none';
      });
    });
  const pill = (g) => page.locator(`.exp-group-pill[data-group="${g}"]`);
  /** Width of a pill's section strip: ~0 when closed. */
  const sectionsWidth = (g) => pill(g).locator('.exp-group-sections').evaluate((el) => el.getBoundingClientRect().width);
  const sectionOn = (s) => page.locator(`.exp-group-section[data-section="${s}"]`).getAttribute('aria-pressed');
  const groupOn = (g) => pill(g).evaluate((el) => el.classList.contains('is-active'));
  const awayMouse = () => page.mouse.move(600, 500);
  const blur = () => page.evaluate(() => document.activeElement && document.activeElement.blur());

  // ── Layout ────────────────────────────────────────────────────────────
  await area('nota');
  await settle();
  const header = await page.evaluate(() => {
    const h = document.querySelector('body > header');
    return {
      height: Math.round(h.getBoundingClientRect().height),
      tablistInside: !!h.querySelector('#app-main-tablist'),
      topbar: document.documentElement.classList.contains('rpc-topbar'),
    };
  });
  check('header is 48 px tall', header.height === 48, header.height);
  check('area tablist lives inside the header', header.tablistInside && header.topbar, header);
  check('old tab row, date and context path are hidden',
    !(await page.locator('.app-tabs-row').isVisible()) &&
      !(await page.locator('#today-date').isVisible()) &&
      !(await page.locator('#header-context-path').isVisible()));
  check('Paciente: only the expediente bar shows', JSON.stringify(await shownBars()) === '["paciente"]', await shownBars());
  await r.shot(page, 'paciente');

  // ── Area pill ─────────────────────────────────────────────────────────
  await awayMouse();
  await settle();
  check('area pill: only the active area shows at rest', JSON.stringify(await shownAreas()) === '["nota"]', await shownAreas());
  const before = await fit();
  await page.locator('#app-main-tablist').hover();
  await settle();
  const opened = await fit();
  check('hover grows the pill in place: 4 areas, active first, row pushed right',
    JSON.stringify(await shownAreas()) === '["nota","lab","med","agenda"]' && opened.rowLeft > before.rowLeft + 100 && opened.clipped.length === 0,
    { areas: await shownAreas(), before: before.rowLeft, after: opened.rowLeft, clipped: opened.clipped });
  await r.shot(page, 'area-pill-open');
  await page.locator('#apptab-lab').click();
  await awayMouse();
  await settle();
  check('a mouse pick folds the pill again', JSON.stringify(await shownAreas()) === '["lab"]', await shownAreas());
  // Shift+Tab from the first level-2 tab lands on the pill (the active area is the one Tab stop).
  await page.locator('#lab-inner-labs-btn').focus();
  await page.keyboard.press('Shift+Tab');
  await settle();
  const kbIn = await page.evaluate(() => document.activeElement.id);
  check('keyboard Tab reaches the pill and opens it', kbIn === 'apptab-lab' && (await shownAreas()).length === 4, { kbIn, areas: await shownAreas() });
  await page.keyboard.press('ArrowLeft');
  await settle();
  const kb = await page.evaluate(() => ({ id: document.activeElement.id, w: document.activeElement.getBoundingClientRect().width }));
  check('ArrowLeft switches area and keeps focus on a shown tab', kb.id === 'apptab-nota' && kb.w > 4, kb);
  await blur();

  // ── Room: Ayuda menu, Censo and the mode switcher out of the header ───
  check('Atajos and Aprender R+ are folded into Ayuda',
    !(await page.locator('#btn-header-shortcuts').isVisible()) && !(await page.locator('#btn-open-learn').isVisible()) && (await page.locator('.topbar-help-btn').isVisible()));
  await page.locator('.topbar-help-btn').click();
  const menu = await page.locator('.topbar-help-menu [role="menuitem"]').allTextContents();
  check('Ayuda menu lists Atajos de teclado and Aprender R+', JSON.stringify(menu) === '["Atajos de teclado","Aprender R+"]', menu);
  check('Ayuda button reports it is open', (await page.locator('.topbar-help-btn').getAttribute('aria-expanded')) === 'true');
  await page.keyboard.press('Escape');
  const moved = await page.evaluate(() => {
    const h = document.querySelector('body > header');
    return { censo: h.contains(document.getElementById('btn-export-censo-header')), seg: h.contains(document.getElementById('header-mode-seg')) };
  });
  check('Censo left the header, the mode switcher stayed (patient list on screen)', !moved.censo && moved.seg, moved);
  const unnamed = await page.$$eval('body > header button', (bs) =>
    bs.filter((b) => b.getClientRects().length && b.getBoundingClientRect().width > 4)
      .filter((b) => !(b.getAttribute('aria-label') || b.textContent.trim() || b.title)).map((b) => b.id || b.className));
  check('every header button has an accessible name', unnamed.length === 0, unnamed);

  await area('lab');
  await settle();
  check('Laboratorio: only the lab bar shows', JSON.stringify(await shownBars()) === '["lab"]', await shownBars());
  await page.locator('#lab-inner-tend-btn').click();
  await settle();
  check('Tendencias is 1 click from Laboratorio', (await page.locator('#lab-inner-tend-btn').getAttribute('aria-selected')) === 'true');
  await r.shot(page, 'laboratorio-tendencias');

  await area('med');
  await settle();
  check('Manejo: only the manejo bar shows', JSON.stringify(await shownBars()) === '["med"]', await shownBars());
  await page.locator('#med-itab-perfil').click();
  await settle();
  check('Perfil histórico is 1 click from Manejo', (await page.locator('#med-itab-perfil').getAttribute('aria-selected')) === 'true');
  await r.shot(page, 'manejo-perfil');
  await page.locator('#med-itab-receta').click();

  await openPatient(page, B);
  await settle();
  check('patient switch on Manejo keeps only the manejo bar', JSON.stringify(await shownBars()) === '["med"]', await shownBars());
  await area('nota');
  await settle();
  check('patient switch then Paciente: only the expediente bar', JSON.stringify(await shownBars()) === '["paciente"]', await shownBars());
  await area('lab');
  await settle();
  check('patient switch then Laboratorio: only the lab bar', JSON.stringify(await shownBars()) === '["lab"]', await shownBars());
  await area('nota');
  await settle();

  // ── Clínico pill ──────────────────────────────────────────────────────
  await pill('paciente').locator('.exp-group-name').click();
  await awayMouse();
  await blur();
  await settle();
  check('Clínico is closed at rest on Resumen', (await sectionsWidth('clinico')) < 2, await sectionsWidth('clinico'));
  await pill('clinico').locator('.exp-group-name').hover();
  await settle();
  check('Clínico opens on hover', (await sectionsWidth('clinico')) > 40, await sectionsWidth('clinico'));
  await awayMouse();
  await settle();
  await pill('clinico').locator('.exp-group-name').focus();
  await settle();
  check('Clínico opens on keyboard focus', (await sectionsWidth('clinico')) > 40, await sectionsWidth('clinico'));
  await blur();

  // ── Reach: every section is 1 click (hover is not a click) ────────────
  const clicks = {};
  await pill('clinico').locator('.exp-group-name').hover();
  await page.locator('.exp-group-section[data-section="eventualidades"]').click();
  clicks.eventualidades = (await sectionOn('eventualidades')) === 'true';
  await awayMouse();
  await blur();
  await settle();
  check('Clínico stays open while Eventualidades is active', (await sectionsWidth('clinico')) > 40, await sectionsWidth('clinico'));
  check('Drive icon shows in Clínico', await page.locator('#btn-drive-import').isVisible());
  await r.shot(page, 'clinico-eventualidades');

  const name = await pill('clinico').locator('.exp-group-name').evaluate((el) => getComputedStyle(el).display);
  check('the «Clínico» name hides while one of its sections is active', name === 'none', name);
  for (const s of ['estadoActual', 'medAdmin']) {
    await pill('clinico').hover();
    await page.locator(`.exp-group-section[data-section="${s}"]`).click();
    clicks[s] = (await sectionOn(s)) === 'true';
  }
  for (const g of ['salida', 'todo', 'paciente']) {
    await pill(g).locator('.exp-group-name').click();
    await settle();
    clicks[g] = await groupOn(g);
    if (g !== 'paciente') {
      check(`Drive icon hidden in ${g === 'todo' ? 'Pendientes' : 'Salida'}`, !(await page.locator('#btn-drive-import').isVisible()));
    }
  }
  check('Drive icon hidden on Resumen', !(await page.locator('#btn-drive-import').isVisible()));
  check('Resumen, Estado actual, Eventualidades, Medicamentos, Salida, Pendientes: 1 click each',
    Object.values(clicks).length === 6 && Object.values(clicks).every(Boolean), clicks);
  await pill('salida').hover();
  await settle();
  const font = await pill('salida').locator('.exp-group-name').evaluate((el) => {
    const cs = getComputedStyle(el);
    return { size: cs.fontSize, weight: cs.fontWeight, transform: cs.textTransform };
  });
  check('open group name keeps the pill font (13 px, 600, no caps)', font.size === '13px' && font.weight === '600' && font.transform === 'none', font);
  await awayMouse();

  // ── Actions ───────────────────────────────────────────────────────────
  await page.locator('#btn-exp-datos-open').click();
  const datos = page.locator('#exp-datos-modal-backdrop');
  check('Datos icon opens the datos dialog', await datos.evaluate((el) => el.classList.contains('open')));
  await page.keyboard.press('Escape');

  // ── Look: Pendientes dot, dark theme ──────────────────────────────────
  await pill('todo').locator('.exp-group-name').click();
  await page.locator('.todo-toolbar-add-btn:visible').click();
  const m = page.locator('.wb-todo-add-modal');
  await m.locator('.wb-todo-add-text').fill('Revisar placa de control');
  await m.locator('[data-wb-todo-add-ok]').click();
  await m.waitFor({ state: 'detached' });
  await closeToasts(page);
  await settle();
  const dot = await page.locator('#exp-pendientes-badge').evaluate((el) => {
    const bg = getComputedStyle(el).backgroundColor;
    const probe = document.createElement('span');
    probe.style.color = 'var(--todo-prio-media)';
    document.body.appendChild(probe);
    const amber = getComputedStyle(probe).color;
    probe.remove();
    return { hidden: el.hidden, bg, amber };
  });
  check('Pendientes dot shows and is amber', !dot.hidden && dot.bg === dot.amber, dot);
  await r.shot(page, 'pendientes-dot');

  await page.locator('#theme-toggle').click();
  await settle();
  const dark = await page.evaluate(() => {
    const lum = (c) => {
      const [r0, g0, b0] = (c.match(/[\d.]+/g) || [0, 0, 0]).map(Number);
      return (0.2126 * r0 + 0.7152 * g0 + 0.0722 * b0) / 255;
    };
    const h = document.querySelector('body > header');
    const tab = document.querySelector('#app-main-tablist .app-tab[aria-selected="true"] .app-tab-label');
    return {
      on: document.documentElement.classList.contains('dark'),
      headerLum: lum(getComputedStyle(h).backgroundColor),
      tabTextLum: lum(getComputedStyle(tab).color),
      height: Math.round(h.getBoundingClientRect().height),
    };
  });
  check('dark theme: header is dark, active tab text is light, still 48 px',
    dark.on && dark.headerLum < 0.3 && dark.tabTextLum > 0.5 && dark.height === 48, dark);
  await r.shot(page, 'dark');
  await page.locator('#theme-toggle').click();

  // ── Widths: Sala then Interconsulta, Estado actual open ───────────────
  const estado = async () => {
    await area('nota');
    await settle();
    const card = page.getByText(/^DEMO.*ALFA$/).locator('visible=true').first();
    if (await card.isVisible().catch(() => false)) await card.click();
    if (!(await page.locator('.exp-group-section.is-active[data-section="estadoActual"]').count())) {
      await pill('clinico').hover();
      await page.locator('.exp-group-section[data-section="estadoActual"]').click();
    }
    await awayMouse();
  };
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
    await estado();
    for (const w of [1280, 1389, 1440]) {
      await resize(w);
      await settle();
      const f = await fit();
      await page.locator('#app-main-tablist').hover();
      await settle();
      const o = await fit();
      await awayMouse();
      check(`${mode} ${w} px: nothing clipped, pill row fits (at rest and with the area pill open)`,
        !f.clipped.length && f.rowOver <= 0 && !o.clipped.length && o.rowOver <= 0, { rest: f, open: o });
      if (w === 1280 && mode === 'sala') {
        const short = await page.locator('.exp-group-section[data-section="eventualidades"]').evaluate((el) => ({ text: el.textContent, aria: el.getAttribute('aria-label'), title: el.title }));
        check('1280 px: short label keeps its full name', short.text === 'Eventual.' && short.aria === 'Eventualidades' && short.title === 'Eventualidades', short);
      }
      await r.shot(page, `${mode}-${w}`);
    }
  }

  check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 5));
  await app.close();
});
