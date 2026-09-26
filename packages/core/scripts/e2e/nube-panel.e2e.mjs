#!/usr/bin/env node
/* global document */
/**
 * E2E: the Nube panel (header ⇄) a signed-in R4 sees, against the local
 * sync Worker (nube-worker.mjs). DEMO users only.
 *
 * Layout: design board «Nube + Admin» — A (todo al día): a status hero with
 * one main button and the Internet → Sesión → Sala → En vivo chain, then
 * «Tu sala», your account, and two rows (Equipo y administración, Detalles
 * técnicos).
 *
 * Ways it can go wrong (each one is a check below):
 *   Status home
 *     - no hero, or the hero title does not say the state in words
 *     - more than one filled (primary) button
 *     - the chain is missing a step, or a step is not «ok» when all is well
 *     - «Tu sala» is missing the room name or the invite code
 *     - the account card is missing @usuario or «Cerrar sesión»
 *     - «Detalles técnicos» shows «—» instead of cola / rev. / pacientes
 *     - «Equipo y administración» does not open Opciones
 *     - the panel scrolls sideways, or the hero spills over «Tu sala»
 *   Live refresh
 *     - «Sincronizar ahora» throws or leaves the hero stuck on «Sincronizando…»
 *   Diagnóstico (board «Nube B»), Worker down
 *     - «Detalles técnicos» does not open it
 *     - the hero still says all is well, or offers no «Reintentar ahora»
 *     - no «Qué puedes hacer» steps, or no «Herramientas de reparación»
 *     - the home hero does not leave «Todo al día»
 *     - after the Worker is back, the hero does not return to «Todo al día»
 *   Throughout
 *     - an uncaught page error
 */
import { createRun, closeToasts, dismissLearnHub } from './harness.mjs';
import { startWorker, stopWorker, nubeDevices, onboardNube, until } from './nube-worker.mjs';

const tag = Date.now().toString(36).slice(-6);
const R4 = { username: `demo_r4_${tag}`, name: 'Dra. Demo Nube', rank: 'R4' };

const r = createRun('nube-panel');
const { check } = r;
const launchDevice = nubeDevices(r);

const HOME = '#connection-dropdown .cloud-sync-view[data-cloud-view="status"]';

/** Layout facts of the status home, read from the live DOM in one round trip. */
const readHome = (page) => page.evaluate((sel) => {
  const modal = document.getElementById('connection-dropdown');
  const home = document.querySelector(sel);
  const section = home?.closest('[data-cloud-nube-section]');
  const visible = (el) => !!el && el.getBoundingClientRect().width > 0;
  const q = (s) => section?.querySelector(s);
  return {
    heroTitle: q('.cloud-sync-hero-title')?.textContent.trim() || '',
    heroVisible: visible(q('[data-cloud-hero]')),
    primaries: [...(section?.querySelectorAll('.cloud-sync-btn--primary') || [])]
      .filter(visible).map((b) => b.textContent.trim()),
    chain: [...(section?.querySelectorAll('.cloud-sync-chain-step') || [])].map((s) => ({
      label: s.querySelector('.cloud-sync-chain-label')?.textContent.trim(),
      state: s.dataset.state,
    })),
    room: home?.querySelector('.cloud-sync-room')?.innerText || '',
    code: home?.querySelector('[data-cloud-room-code]')?.textContent.trim() || '',
    account: home?.querySelector('.cloud-sync-status-identity')?.innerText || '',
    tech: home?.querySelector('[data-cloud-tech-summary]')?.textContent.trim() || '',
    sideScroll: modal ? modal.scrollWidth - modal.clientWidth : -1,
    // The hero's head must end above «Tu sala» (a fixed-height head let it spill over).
    heroOverlap: (() => {
      const head = q('.cloud-sync-conexion-head')?.getBoundingClientRect();
      const room = home?.querySelector('.cloud-sync-room')?.getBoundingClientRect();
      return head && room ? Math.round(head.bottom - room.top) : null;
    })(),
  };
}, HOME);

await r.finish('Nube panel: status home (board A)', async () => {
  check('local Worker answers /ping', await startWorker());

  const A = await launchDevice('a', 3791);
  await onboardNube(A.page, R4);
  await dismissLearnHub(A.page);
  await A.page.waitForTimeout(1500);
  await closeToasts(A.page);

  await A.page.locator('#btn-header-team-sync').click();
  check('⇄ opens the Nube status home', await until(() => A.page.locator(HOME).isVisible(), 8000));
  // Let the runtime settle into «al día» (first pull + WS connect).
  await until(async () => (await readHome(A.page)).heroTitle === 'Todo al día', 15000);
  await A.page.waitForTimeout(600);
  let h = await readHome(A.page);
  await r.shot(A.page, 'home');

  check('status hero is shown', h.heroVisible, h.heroTitle);
  check('hero says «Todo al día» once synced', h.heroTitle === 'Todo al día', h.heroTitle);
  check('one filled button: «Sincronizar ahora»', h.primaries.length === 1 && /Sincronizar ahora/.test(h.primaries[0]), h.primaries);
  check('chain is Internet → Sesión → Sala → En vivo',
    h.chain.map((s) => s.label).join(',') === 'Internet,Sesión,Sala,En vivo', h.chain);
  check('every chain step is ok', h.chain.length === 4 && h.chain.every((s) => s.state === 'ok'), h.chain);
  check('«Tu sala» names the room and shows the code', /Sala 1/.test(h.room) && /^[A-Z0-9]{4,}$/.test(h.code), { room: h.room, code: h.code });
  check('account card shows @usuario and Cerrar sesión',
    h.account.includes('@' + R4.username) && /Cerrar sesión/.test(h.account), h.account);
  check('«Detalles técnicos» shows cola / rev. / pacientes', /^Cola \d+ · Rev\. \d+ · \d+ pacientes locales$/.test(h.tech), h.tech);
  check('panel does not scroll sideways', h.sideScroll <= 0, h.sideScroll);
  check('hero ends above «Tu sala» (no overlap)', h.heroOverlap !== null && h.heroOverlap <= 0, h.heroOverlap);

  await A.page.locator('#connection-dropdown [data-cloud-action="sync-now"]').click();
  const settled = await until(async () => (await readHome(A.page)).heroTitle === 'Todo al día', 15000);
  check('«Sincronizar ahora» runs and the hero settles back to «Todo al día»', settled, (await readHome(A.page)).heroTitle);

  await A.page.locator(`${HOME} [data-cloud-action="nav-options"]`).click();
  const optionsOpen = await until(() => A.page.locator('#connection-dropdown .cloud-sync-view[data-cloud-view="options"]').isVisible(), 4000);
  check('«Equipo y administración» opens Opciones', optionsOpen);
  await r.shot(A.page, 'opciones');

  await A.page.locator('#btn-connection-dropdown-back').click();
  check('back returns to the status home', await until(() => A.page.locator(HOME).isVisible(), 4000));

  // ── Diagnóstico (board «Nube B»): take the Worker down ───────────────
  const DIAG = '#connection-dropdown .cloud-sync-view[data-cloud-view="nube"]';
  const readDiag = () => A.page.evaluate((sel) => {
    const v = document.querySelector(sel);
    return {
      level: v?.querySelector('.cloud-nube-dashboard')?.dataset.level || '',
      title: v?.querySelector('.cloud-sync-hero-title')?.textContent.trim() || '',
      action: v?.querySelector('.cloud-sync-hero-sync')?.textContent.trim() || '',
      steps: !!v?.querySelector('.cloud-nube-dash-steps'),
      tools: v?.querySelector('.cloud-nube-dash-tools')?.innerText || '',
      tech: v?.querySelector('.cloud-nube-dash-tech')?.textContent.trim() || '',
    };
  }, DIAG);
  await A.page.locator(`${HOME} [data-cloud-view="nube"]`).click();
  check('«Detalles técnicos» opens Diagnóstico', await until(() => A.page.locator(DIAG).isVisible(), 4000));
  await until(async () => (await readDiag()).level === 'ok', 8000);
  let dg = await readDiag();
  await r.shot(A.page, 'diagnostico-ok');
  check('Diagnóstico, all well: ok hero with «Sincronizar ahora», no steps',
    dg.level === 'ok' && dg.action === 'Sincronizar ahora' && !dg.steps, dg);
  check('Diagnóstico shows repair tools and the tech line',
    /Forzar sync/.test(dg.tools) && /Reenviar censo/.test(dg.tools) && /^Rev\. \d+ local · /.test(dg.tech), dg);

  await stopWorker();
  // Force a cycle so the runtime notices the Worker is gone.
  await A.page.locator(`${DIAG} [data-cloud-diag-action="sync"]`).click().catch(() => {});
  const wentBad = await until(async () => ['warn', 'error'].includes((await readDiag()).level), 45000);
  dg = await readDiag();
  await r.shot(A.page, 'diagnostico-falla');
  check('Worker down: Diagnóstico hero turns warn/error', wentBad, dg);
  check('Worker down: «Reintentar ahora» is the main button', dg.action === 'Reintentar ahora', dg.action);
  check('Worker down: «Qué puedes hacer» steps are shown', dg.steps);

  await A.page.locator('#btn-connection-dropdown-back').click();
  await A.page.locator('#btn-connection-dropdown-back').click().catch(() => {});
  await until(() => A.page.locator(HOME).isVisible(), 4000);
  h = await readHome(A.page);
  await r.shot(A.page, 'home-falla');
  check('Worker down: the home hero no longer says «Todo al día»', h.heroTitle !== 'Todo al día', h.heroTitle);
  const heroText = await A.page.locator('#connection-dropdown [data-cloud-hero]').innerText().catch(() => '');
  check('Worker down: the hero speaks plain Spanish, no raw net::ERR code', !/ERR_|net::/.test(heroText), heroText);

  check('Worker comes back', await startWorker());
  await A.page.locator('#connection-dropdown [data-cloud-action="sync-now"]').click().catch(() => {});
  const back = await until(async () => (await readHome(A.page)).heroTitle === 'Todo al día', 60000);
  check('after the Worker is back the hero returns to «Todo al día»', back, (await readHome(A.page)).heroTitle);

  // Dark theme: same screen, for a visual check.
  await A.page.evaluate(() => document.documentElement.classList.add('dark'));
  await A.page.waitForTimeout(300);
  h = await readHome(A.page);
  await r.shot(A.page, 'home-dark');
  check('dark theme: hero still shown', h.heroVisible);

  check('no uncaught page errors', !A.pageErrors.length, A.pageErrors.slice(0, 5));
  await A.app.close();
});
