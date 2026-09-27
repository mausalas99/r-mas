#!/usr/bin/env node
/* global document, getComputedStyle */
/**
 * E2E: in-app «Guía» / «Nuevo» hints (public/js/feature-hints.mjs), driven
 * through the real Electron app on a fresh profile with synthetic DEMO patients.
 *
 * Ways it can go wrong (each one is a check below):
 *   - a fresh install still pops the Learn Hub open
 *   - a hint does not open by itself, or more than one opens at a time
 *   - a click on the real control does not move the flow on
 *   - an action step does not advance on the user's own click
 *   - a step whose target is missing blocks the flow instead of being skipped
 *   - the bubble covers the page with an overlay (anything besides the bubble)
 *   - a finished flow is not remembered, or comes back after a restart
 *   - a user updating from a version without hints (registered, no done list) skips the «Guía»
 *   - × does not end the flow for good
 *   - a hint never opens on its screen, or a step is skipped while its target exists
 *   - a bubble sits on top of the control it points at
 *   - an uncaught page error
 *
 * Artifact: e2e-artifacts/feature-hints/<run-id>/ (report.json + screenshots).
 *
 *   npm run e2e:feature-hints
 */
import { createRun, onboardLocalOnly, pasteAndSave, openPatient, closeToasts, until } from './harness.mjs';
import { fullLabs, header } from './some-fixtures.mjs';
import { activeHints } from '../../public/js/feature-hints.mjs';

const P = { exp: '7000911-1', name: 'DEMO GUIA UNO', room: '611' };
const P2 = { exp: '7000912-2', name: 'DEMO GUIA DOS', room: '612' };
const r = createRun('feature-hints');
const { check, shot } = r;

const ALL = activeHints().map((h) => h.id);
const pad = (n) => String(n).padStart(2, '0');
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const someWhen = (off) => { const d = new Date(Date.now() + off * 86400000); return `${MON[d.getMonth()]} ${d.getDate()} ${d.getFullYear()} 7:00AM`; };
const URO = 'BACTERIOLOGIA\nUROCULTIVO POR SONDA\nPRODUCTO\t\n*\nMICROORGANISMO\t\n*\nKlebsiella pneumoniae\n' +
  'CUENTA DE KASS\t\n*\n25,000 UFC/mL\nANTIBIOGRAMA\t\n*\nCEFTRIAXONA\n>32\tR\nAMIKACINA\n<=2\tS\n';
/** SOME indicaciones two days old: an antibiotic with SOME days (→ day modal) and an agua inyectable order R+ cannot read (→ review). */
const d2 = new Date(Date.now() - 2 * 86400000);
const row = (t, ...c) => [`${pad(d2.getDate())}/${pad(d2.getMonth() + 1)}/${d2.getFullYear()} 08:${t} a.m.`, ...c, 'NW'].join('\t');
const SOME = [
  row('10:02', 'DIETAS', 'BLANDA PICADA ALTA EN FIBRA', '1500 KCAL + 60 GR DE PROTEINA'),
  row('10:07', 'MEDICAMENTOS', 'CEFTRIAXONA 1 G SOL INY (*)', 'VIA INTRAVENOSA', '1 G // *DIA# 3*', 'CADA 24 HORAS'),
  row('10:09', 'MEDICAMENTOS', 'LOSARTAN 50 MG COMPRIMIDO (*)', 'VIA ORAL', '50 MG //', 'CADA 24 HORAS'),
  row('10:10', 'MEDICAMENTOS', 'PARACETAMOL 1 G SOL INY 100 ML (*)', 'VIA INTRAVENOSA', '1 G //', 'CADA 8 HORAS'),
  row('10:11', 'MEDICAMENTOS', 'AGUA INYECTABLE SOL INY 10 ML', 'VIA INTRAVENOSA', '1 ML // SEMAGLUTIDA SUBCUTANEA SEMANAL', 'CADA 24 HORAS'),
].join('\n');

/** Bubble text, target, whether the bubble box overlaps the target box, and the done list. */
const hintState = (page) => page.evaluate(() => {
  const b = document.querySelector('.fh-bubble:not([hidden])');
  const t = document.querySelector('.fh-target');
  let covers = false;
  if (b && t) {
    const tr = t.getBoundingClientRect();
    const br = b.getBoundingClientRect();
    covers = !(br.right < tr.left || br.left > tr.right || br.bottom < tr.top || br.top > tr.bottom);
  }
  return { bubble: b ? b.innerText.replace(/\s+/g, ' ') : '', covers, hint: b ? b.dataset.hint : '',
    done: JSON.parse(globalThis.localStorage.getItem('rpc-feature-hints-done') || '[]') };
});

const onlyUnfinished = (page, id) =>
  page.evaluate(([a, keep]) => globalThis.localStorage.setItem('rpc-feature-hints-done', JSON.stringify(a.filter((x) => x !== keep))), [ALL, id]);
const bubbleOf = (page, id) => page.locator(`.fh-bubble[data-hint="${id}"]:not([hidden])`);

/** Leave only hint `id` unfinished; it must open by itself. Walk every step like a user. Checks step count, no cover, done. */
async function walkHint(page, id, steps) {
  await onlyUnfinished(page, id);
  if (!(await bubbleOf(page, id).waitFor({ state: 'visible', timeout: 6000 }).then(() => true, () => false))) {
    await shot(page, `${id}-noopen`);
    check(`${id}: opens by itself on its screen`, false);
    return;
  }
  const seen = [];
  for (let n = 0; n < 10; n++) {
    await until(async () => { const s = await hintState(page); return s.bubble || s.done.includes(id); }, 4000, 100);
    const s = await hintState(page);
    if (!s.bubble) break;
    // Same step still open (the click landed during a re-render): click again, do not count it twice.
    if (seen.at(-1)?.bubble !== s.bubble) {
      seen.push(s);
      await shot(page, `${id}-${seen.length}`);
    }
    const next = page.locator('.fh-bubble .fh-next');
    if (await next.count()) await next.click();
    else await page.locator('.fh-target').first().click();
    await until(async () => (await hintState(page)).bubble !== s.bubble, 4000, 100);
  }
  const s = await hintState(page);
  check(`${id}: opens by itself, ${steps} step(s) walked, bubble never covers its target, remembered`,
    seen.length === steps && seen.every((x) => !x.covers) && s.done.includes(id),
    seen.map((x) => x.bubble.slice(0, 40) + (x.covers ? ' [COVERS]' : '')));
}

const bubbleText = (page) => page.locator('.fh-bubble:not([hidden])').innerText().catch(() => '');
const done = (page) => page.evaluate(() => JSON.parse(globalThis.localStorage.getItem('rpc-feature-hints-done') || '[]'));
/** Wait (short poll) until the open bubble text matches re; returns that text. */
const bubbleMatch = async (page, re) => (await until(async () => re.test(await bubbleText(page)), 5000, 100), bubbleText(page));
/** Header mode switch: 'sala' | 'interconsulta' (same as nota-evolucion.e2e.mjs). */
async function setMode(page, mode) {
  await closeToasts(page);
  await page.locator('#header-mode-seg').hover();
  const btn = page.locator(`#header-mode-seg button[data-mode="${mode}"]`);
  await btn.waitFor({ state: 'visible' });
  await page.waitForTimeout(400); // expand animation
  await btn.click();
  await page.waitForTimeout(600);
  await closeToasts(page);
}
const visible = (loc, timeout = 5000) => loc.waitFor({ state: 'visible', timeout }).then(() => true, () => false);

await r.finish('Feature hints: open by themselves, flows in place, remembered', async () => {
  let { app, page, pageErrors } = await r.launch();
  await onboardLocalOnly(page);
  // Fresh install: the first «Guía» hint opens by itself on the Laboratorio tab, no click needed.
  check('g-labs opens by itself on the Laboratorio tab', await visible(bubbleOf(page, 'g-labs'), 8000) &&
    (await page.locator('#apptab-lab.fh-target').count()) === 1);
  check('fresh install does not pop the Learn Hub open', (await page.locator('#learn-hub-backdrop.open').count()) === 0);
  check('exactly one bubble shows', (await page.locator('.fh-bubble:not([hidden])').count()) === 1);
  await shot(page, 'fresh-open');

  // Pegar laboratorios: the user clicks the real Laboratorio tab.
  await page.locator('#apptab-lab').click();
  check('real-control click moves the flow to step 2', /GUÍA · 2\/3/.test(await bubbleMatch(page, /2\/3/)), await bubbleText(page));
  check('step 2 teaches the paste-anywhere shortcut', /⌘V.*cualquier parte/.test(await bubbleText(page)), await bubbleText(page));
  check('no overlay: only the bubble in the layer', (await page.locator('.fh-layer > :not(.fh-bubble)').count()) === 0);
  await shot(page, 'labs-step2');
  if (!(await page.locator('#lab-input').isVisible())) await page.locator('#btn-lab-paste').click();
  check('action step advances on the user click', /3\/3/.test(await bubbleMatch(page, /3\/3/)), await bubbleText(page));
  check('step 3 points at Procesar', (await page.locator('#btn-procesar.fh-target').count()) === 1);
  // The bubble must never sit over the control the user has to press next.
  const procHit = await page.evaluate(() => {
    const r = document.querySelector('#btn-procesar').getBoundingClientRect();
    return !!document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('#btn-procesar');
  });
  check('bubble leaves Procesar clickable', procHit);
  await shot(page, 'labs-step3');
  await page.locator('.fh-close').click();
  check('× ends the flow and remembers it', (await done(page)).includes('g-labs'), await done(page));

  // A step with no target on screen is skipped, not stuck: Tendencias with one lab has no Gráfica button.
  await pasteAndSave(page, fullLabs(P, 'Sep 25 2026 8:00AM'));
  await openPatient(page, P);
  await page.locator('#apptab-lab').click();
  await onlyUnfinished(page, 'g-tendencias');
  check('Tendencias opens by itself once the others are done', await visible(bubbleOf(page, 'g-tendencias')));
  await page.locator('#lab-inner-tend-btn').click();
  const tendChart = () => page.locator('#tendencias-container .tend-section-chart-btn').count();
  const tendDone = async () => (await done(page)).includes('g-tendencias');
  // Missing targets → each step is skipped after its 2.5 s wait and the flow ends; present → bubble 2/7.
  await until(async () => (await tendDone()) || /2\/7/.test(await bubbleText(page)), 20000, 150);
  check('missing-target steps are skipped (flow ends) or shown', (await tendChart()) ? /2\/7/.test(await bubbleText(page)) : await tendDone(),
    { tendChart: await tendChart(), tendDone: await tendDone() });
  await shot(page, 'tendencias');
  // Leave the other guides unfinished so one of them opens after the restart.
  await page.evaluate(() => globalThis.localStorage.setItem('rpc-feature-hints-done', JSON.stringify(['g-labs', 'g-tendencias'])));

  await app.close();
  ({ app, page, pageErrors } = await r.launch());
  await page.locator('#apptab-lab').waitFor({ state: 'visible' });
  const after = await done(page);
  check('finished hints survive a restart', after.includes('g-labs'), after);
  // The hint layer is live once any hint opens; g-labs must never be the one.
  check('hint layer is live after restart', await visible(page.locator('.fh-bubble:not([hidden])'), 8000), await hintState(page));
  await shot(page, 'after-restart');
  check('a finished hint never opens again', (await bubbleOf(page, 'g-labs').count()) === 0);
  // Update from 8.4.1: a registered user with no done list gets the «Guía» too, not only «Nuevo».
  await page.evaluate(() => globalThis.localStorage.removeItem('rpc-feature-hints-done'));
  await app.close();
  ({ app, page, pageErrors } = await r.launch({ fakePortal: true })); // real lab-repo-fetch: the no-address path below
  // Sample the first seconds of boot: a bubble never floats over «Preparando R+».
  let overBoot = 0;
  for (let i = 0; i < 60; i++) {
    overBoot += await page.evaluate(() => {
      const shown = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
      return shown(document.querySelector('.clinical-onboarding-stage')) && shown(document.querySelector('.fh-bubble:not([hidden])')) ? 1 : 0;
    }).catch(() => 0);
    await page.waitForTimeout(100);
  }
  check('no hint bubble over the «Preparando R+» boot screen', overBoot === 0, { samplesOverBoot: overBoot });
  await page.locator('#apptab-lab').click();
  check('updating user (registered, no done list) gets the «Guía» hints',
    await visible(bubbleOf(page, 'g-labs'), 8000), await hintState(page));
  await shot(page, 'updating-user-guia');
  await page.evaluate(([a]) => globalThis.localStorage.setItem('rpc-feature-hints-done', JSON.stringify(a)), [ALL]);
  await page.locator('.fh-close').click().catch(() => {});

  // ── Every other hint on its own screen, with a busy synthetic patient ──
  const go = async (sel) => { await closeToasts(page); await page.locator(sel).click(); };
  await pasteAndSave(page, fullLabs(P, someWhen(-3)));
  // A second patient, so a card is still in sala after one is archived.
  await pasteAndSave(page, fullLabs(P2, someWhen(-1)));
  await pasteAndSave(page, header(P, someWhen(-2)) + URO);
  await openPatient(page, P);
  // A one-step hint is done once the user uses the real control it points at (⌘K palette opens, then closes).
  await onlyUnfinished(page, 'g-buscar');
  await visible(bubbleOf(page, 'g-buscar'));
  await page.locator('#btn-header-cmdk').click();
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1500);
  check('using the real control of a one-step hint ends it for good',
    (await done(page)).includes('g-buscar') && (await bubbleOf(page, 'g-buscar').count()) === 0, await done(page));
  await walkHint(page, 'g-buscar', 1);
  // Two lab sets on different days now (Sep 25 + 3 days ago): Tendencias has its Gráfica step.
  await go('#apptab-lab');
  // Tendencias › Gráfica window: range, hide a series, Tabla, hide a row, copy.
  await walkHint(page, 'g-tendencias', 7);
  await page.keyboard.press('Escape');
  await go('#apptab-lab'); await go('#lab-inner-cult-btn');
  await walkHint(page, 'cultivos-842', 1);
  await go('#apptab-med'); await go('#med-itab-receta');
  await walkHint(page, 'g-manejo', 1);
  // agua-iny: set it up first, the review opens in the middle of Procesar receta.
  await page.evaluate(([a]) => globalThis.localStorage.setItem('rpc-feature-hints-done', JSON.stringify(a.filter((x) => x !== 'agua-iny-842'))), [ALL]);
  await go('#med-import-open-btn');
  await page.locator('#med-input').fill(SOME);
  await page.getByRole('button', { name: 'Procesar receta' }).click();
  await walkHint(page, 'agua-iny-842', 1);
  await page.locator('.agua-iny-modal [data-save]').click();
  const abxCancel = page.locator('[data-abx-dia-modal] button', { hasText: 'Cancelar' });
  if (await visible(abxCancel, 3000)) await abxCancel.click();
  await go('#apptab-med'); await go('#med-itab-receta');
  await walkHint(page, 'abx-dia-842', 2);
  if (await abxCancel.isVisible()) await abxCancel.click();
  // Estado actual with alto flujo, so the soporte hover step has a target.
  await go('#apptab-nota');
  await page.locator('.exp-group-pill[data-group="clinico"]').hover();
  await page.locator('.exp-group-section', { hasText: 'Estado actual' }).click();
  await page.locator('#ea-snapshot').waitFor({ state: 'visible' });
  await page.locator('[data-ea-ec="dieta"]').fill('BLANDA PICADA');
  await page.locator('[data-ea-ec="dieta"]').press('Tab');
  await page.locator('[data-ea-ec="soporte"]').selectOption('Alto flujo');
  await walkHint(page, 'estado-actual-842', 2);
  await go('#apptab-nota');
  await page.locator('.exp-group-pill', { hasText: 'Resumen' }).first().click();
  await walkHint(page, 'resumen-842', 2);
  await walkHint(page, 'actualizar-labs-842', 1);
  // Actualizar labs with no portal address (a fresh profile never has one): R+ stops
  // before the network, opens Ajustes → Laboratorio, and the hint explains the field.
  await onlyUnfinished(page, 'portal-url-842');
  await closeToasts(page);
  await page.locator('#patient-dashboard-mount [data-dash-action="actualizar-labs"]').click();
  await page.locator('#lab-repo-batch-confirm').click();
  check('Actualizar labs with no address says so',
    await visible(page.locator('.toast', { hasText: /Falta la dirección del portal de laboratorio/ })));
  check('… and opens Ajustes on the empty address field', await visible(page.locator('#settings-lab-portal-url')));
  await walkHint(page, 'portal-url-842', 1);
  // With an address saved the hint has nothing to explain: it stays closed.
  await onlyUnfinished(page, 'portal-url-842');
  await page.locator('#settings-lab-portal-url').fill('http://portal.invalid/laboratorio/index.aspx');
  await page.waitForTimeout(2000);
  check('with an address in the field the portal hint does not open', (await bubbleOf(page, 'portal-url-842').count()) === 0);
  await page.locator('#settings-lab-portal-url').fill('');
  await page.locator('#settings-lab-portal-url').blur();
  await page.evaluate(([a]) => globalThis.localStorage.setItem('rpc-feature-hints-done', JSON.stringify(a)), [ALL]);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  // Fill the census meds from the receta first, so Datos has a med line to explain removing.
  await page.locator('#btn-exp-datos-open:visible, #patient-dashboard-mount .dash-name:visible').first().click();
  await page.locator('[data-onclick="censoTomarDeMedicamentos"]').click();
  const medLine = page.locator('#patient-censo-meds .exp-datos-line:not(.exp-datos-line--empty)').first();
  check('Tomar de lista fills the census meds', await visible(medLine));
  await page.keyboard.press('Escape');
  await page.locator('.exp-datos-col--censo').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  await walkHint(page, 'datos-842', 4);
  await page.keyboard.press('Escape');
  await go('#apptab-nota');
  await page.locator('.exp-group-pill', { hasText: 'Pendientes' }).first().click();
  await walkHint(page, 'g-pendientes', 2);
  // g-pendientes leaves the add box open: add one due tomorrow so Próximos exists.
  const m = page.locator('.wb-todo-add-modal');
  await m.locator('.wb-todo-add-text').fill('ECO RENAL');
  await m.locator('.todo-due-toggle').click();
  const t = new Date(Date.now() + 86400000);
  await page.locator('#todo-due-modal-datetime').fill(`${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}T09:00`);
  await page.locator('#todo-due-modal-save').click();
  await m.locator('[data-wb-todo-add-ok]').click();
  await m.waitFor({ state: 'detached' });
  await walkHint(page, 'proximos-842', 1);
  await go('#btn-sala-view-cards');
  await page.locator('#sala-view-home .sv-grid').waitFor({ timeout: 5000 });
  // Archivar: the user archives from the card, then «Archivados» is pointed out.
  const restore = async () => {
    await go('#sala-view-home [data-sv-arch]');
    await go('#sala-view-home .sv-card-restore');
    await page.locator('#sala-view-home .sv-card-archive').first().waitFor({ timeout: 5000 });
  };
  // Step 2 (Archivados) has no target while nothing is archived: skipped. Step 3 opens a card.
  await walkHint(page, 'sala-archivo-842', 2);
  await go('[data-sv-home]:visible');
  await page.locator('#sala-view-home .sv-grid').waitFor({ timeout: 5000 });
  await onlyUnfinished(page, 'sala-archivo-842');
  await visible(bubbleOf(page, 'sala-archivo-842'));
  await page.locator('#sala-view-home .sv-card-archive').first().click();
  check('archiving from a card (real control) points at «Archivados»',
    /2\/3/.test(await bubbleMatch(page, /2\/3/)) && (await page.locator('#sala-view-home [data-sv-arch].fh-target').count()) === 1, await bubbleText(page));
  await shot(page, 'archivados-after-archive');
  await page.locator('.fh-bubble .fh-next').click();
  check('then a patient card is pointed out',
    /3\/3/.test(await bubbleMatch(page, /3\/3/)) && (await page.locator('#sala-view-home .sv-card.fh-target').count()) === 1, await bubbleText(page));
  await shot(page, 'card-after-archivados');
  await page.locator('.fh-close').click();
  await restore();
  // Interconsultas: the team board.
  await setMode(page, 'interconsulta');
  await walkHint(page, 'g-interconsultas', 3);
  await setMode(page, 'sala');
  await walkHint(page, 'censo-842', 4);

  check('no page errors', pageErrors.length === 0, pageErrors);
  await app.close();

  // ── Ventana Conexión needs a Nube room: a LOCAL copy of the sync Worker, never the real one ──
  const nube = await import('./nube-worker.mjs');
  check('local Worker answers /ping', await nube.startWorker(), nube.BASE);
  const n = await r.launch({ profile: 'nube', lanPort: 3793 });
  await nube.onboardNube(n.page, { username: `demo_fh_${Date.now().toString(36).slice(-6)}`, name: 'Dra. Demo Guia', rank: 'R4' });
  check('Nube user joined a ward room', !!(await until(() => nube.roomMeta(n.page), 15000)));
  await closeToasts(n.page);
  // Local-only users never get the Conexión button, so this «Guía» only shows with Nube.
  // A fresh profile opens g-labs first (priority order): finish it, then walk g-sync.
  await n.page.evaluate(([a]) => globalThis.localStorage.setItem('rpc-feature-hints-done', JSON.stringify(a)), [ALL]);
  await n.page.locator('.fh-close').click({ timeout: 3000 }).catch(() => {});
  await walkHint(n.page, 'g-sync', 1);
  await n.page.locator('#btn-header-team-sync').click();
  await n.page.locator('.cloud-sync-conexion [data-cloud-room-code]').waitFor({ timeout: 10000 });
  // Chip, code, Opciones (the user opens it), then Equipo, iPad / R+ Móvil, Diagnóstico Nube inside.
  await walkHint(n.page, 'g-conexion', 6);
  check('no page errors (Nube)', n.pageErrors.length === 0, n.pageErrors);
  await n.app.close();
  await nube.stopWorker();
});
