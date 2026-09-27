#!/usr/bin/env node
/* global document, window */
/**
 * E2E: the Nube panel (header ⇄) a signed-in R4 sees, against the local
 * sync Worker (nube-worker.mjs). DEMO users only.
 *
 * Layout: design board «Nube + Admin» — A (todo al día): a status hero with
 * one main button and the Internet → Sesión → Sala → En vivo chain, then
 * your account, «Tu sala», and two rows (Equipo y administración, Detalles
 * técnicos).
 *
 * Ways it can go wrong (each one is a check below):
 *   Quick look (board «Nube C»)
 *     - the icon opens nothing, or the quick look lacks state, code or stats
 *     - it opens away from the icon, off-screen, or without keyboard focus
 *     - Escape leaves it open or drops focus; «Abrir panel» does not open the panel
 *     - with the Worker down, the icon stays green or the quick look says «al día»
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
import { startWorker, stopWorker, nubeDevices, onboardNube, until, PASSWORD } from './nube-worker.mjs';

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
    // The hero's head must end above the first card (a fixed-height head let it spill over).
    heroOverlap: (() => {
      const head = q('.cloud-sync-conexion-head')?.getBoundingClientRect();
      const first = home?.querySelector('.cloud-sync-status-identity')?.getBoundingClientRect();
      return head && first ? Math.round(head.bottom - first.top) : null;
    })(),
    accountAboveRoom: (() => {
      const acc = home?.querySelector('.cloud-sync-status-identity')?.getBoundingClientRect();
      const room = home?.querySelector('.cloud-sync-room')?.getBoundingClientRect();
      return acc && room ? acc.bottom <= room.top : null;
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

  // ── Quick look under the icon (board «Nube C») ───────────────────────
  const POP = '#nube-popover';
  await A.page.locator('#btn-header-team-sync').click();
  check('icon opens the quick look', await until(() => A.page.locator(POP).isVisible(), 5000));
  await until(async () => /Todo al día/.test(await A.page.locator(POP).innerText()), 15000);
  const pop = await A.page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const icon = document.getElementById('btn-header-team-sync').getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return {
      title: el.querySelector('.nube-pop-title')?.textContent || '',
      code: el.querySelector('.nube-pop-code')?.textContent || '',
      stats: [...el.querySelectorAll('.nube-pop-stat span')].map((s) => s.textContent),
      primaries: el.querySelectorAll('.cloud-sync-btn--primary').length,
      focus: document.activeElement?.getAttribute('data-nube-pop') || '',
      below: r.top >= icon.bottom && Math.abs(r.right - icon.right) < 16,
      inside: r.left >= 0 && r.right <= window.innerWidth,
      label: document.getElementById('btn-header-team-sync').getAttribute('aria-label') || '',
    };
  }, POP);
  await r.shot(A.page, 'quick-look');
  check('quick look says «Todo al día» and shows the sala code', pop.title === 'Todo al día' && /^[A-Z0-9]{4,}$/.test(pop.code), pop);
  check('quick look: En espera · Envío · Descarga, one filled button', pop.stats.join(',') === 'En espera,Envío,Descarga' && pop.primaries === 1, pop);
  check('quick look opens under the icon, inside the window, focus on «Sincronizar»', pop.below && pop.inside && pop.focus === 'sync', pop);
  check('icon names its state for screen readers', /^Nube: Todo al día/.test(pop.label), pop.label);
  await A.page.keyboard.press('Escape');
  const closed = await until(async () => !(await A.page.locator(POP).isVisible()), 2000);
  const focusBack = await A.page.evaluate(() => document.activeElement?.id);
  check('Escape closes the quick look and returns focus to the icon', closed && focusBack === 'btn-header-team-sync', focusBack);

  await A.page.locator('#btn-header-team-sync').click();
  await A.page.locator(`${POP} [data-nube-pop="open-panel"]`).click();
  check('«Abrir panel» opens the Nube status home', await until(() => A.page.locator(HOME).isVisible(), 8000));
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
  check('your account sits above «Tu sala»', h.accountAboveRoom === true, h.accountAboveRoom);
  check('«Detalles técnicos» shows cola / rev. / pacientes', /^Cola \d+ · Rev\. \d+ · \d+ pacientes locales$/.test(h.tech), h.tech);
  check('panel does not scroll sideways', h.sideScroll <= 0, h.sideScroll);
  check('hero ends above the first card (no overlap)', h.heroOverlap !== null && h.heroOverlap <= 0, h.heroOverlap);

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

  // Icon + quick look while the Worker is down.
  await A.page.locator('#btn-connection-dropdown-close').click();
  const iconMod = () => A.page.locator('#btn-header-team-sync').getAttribute('class').then((c) => (String(c).match(/btn-livesync-header--(\w+)/) || [])[1]);
  check('Worker down: the icon turns amber or the red square', /^(degraded|offline)$/.test((await iconMod()) || ''), await iconMod());
  await A.page.locator('#btn-header-team-sync').click();
  await until(() => A.page.locator(POP).isVisible(), 5000);
  const popDown = await A.page.locator(POP).innerText().catch(() => '');
  await r.shot(A.page, 'quick-look-falla');
  check('Worker down: the quick look no longer says «Todo al día»', !/Todo al día/.test(popDown), popDown);
  await A.page.locator(`${POP} [data-nube-pop="open-panel"]`).click();
  await until(() => A.page.locator(HOME).isVisible(), 8000);

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
  await A.page.evaluate(() => document.documentElement.classList.remove('dark'));

  // ── «Cerrar sesión» on purpose: no «expiró» banner, no stuck «Descargando» ─
  await A.page.locator('[data-cloud-action="logout"]').locator('visible=true').first().click();
  const OUT = '#connection-dropdown [data-cloud-signed-out]';
  await A.page.locator(`${OUT} [data-cloud-action="login"]`).waitFor({ state: 'visible', timeout: 10000 });
  await A.page.waitForTimeout(4000); // let requests sent with the old token come back
  const banner = await A.page.locator('#nube-session-banner').isVisible().catch(() => false);
  const listText = await A.page.locator('#patient-list').innerText().catch(() => '');
  await r.shot(A.page, 'signed-out');
  check('after «Cerrar sesión» there is no «Tu sesión de Nube expiró» banner', !banner);
  check('after «Cerrar sesión» the patient list is not stuck on «Descargando pacientes…»', !/Descargando pacientes/.test(listText), listText);

  // ── Signed out = the same home (board «Nube sin sesión» D) ────────────
  const out = await A.page.evaluate((sel) => {
    const root = document.querySelector(sel);
    const top = (q) => document.querySelector(q)?.getBoundingClientRect().top ?? null;
    const section = root?.closest('#connection-dropdown');
    return {
      hero: section?.querySelector('.cloud-sync-hero-title')?.textContent.trim() || '',
      syncBtn: !!section?.querySelector('[data-cloud-action="sync-now"]'),
      sesion: [...(section?.querySelectorAll('.cloud-sync-chain-step') || [])].map((st) => st.querySelector('.cloud-sync-chain-label')?.textContent.trim() + ':' + st.dataset.state).join(','),
      heroTop: top('#connection-dropdown [data-cloud-hero]'),
      formTop: top(sel + ' .cloud-sync-auth-card'),
      salaTop: top(sel + ' .cloud-sync-room--waiting'),
      advTop: top(sel + ' .cloud-sync-advanced--row'),
      sala: root?.querySelector('.cloud-sync-room--waiting')?.innerText || '',
      oldStep: /Conectar a Nube/.test(section?.innerText || ''),
      side: section ? section.scrollWidth - section.clientWidth : -1,
    };
  }, OUT);
  check('signed out: hero says «Sin sesión», no «Sincronizar ahora»', out.hero === 'Sin sesión' && !out.syncBtn, out);
  check('signed out: the chain points at the form (Sesión warn), Sala and En vivo wait (grey)',
    out.sesion === 'Internet:ok,Sesión:warn,Sala:off,En vivo:off', out.sesion);
  check('signed out: hero, then the sign-in card, then «Tu sala», then Avanzado',
    out.heroTop < out.formTop && out.formTop < out.salaTop && out.salaTop < out.advTop, out);
  check('signed out: «Tu sala» waits with «Se conecta al entrar»', /Sala 1/.test(out.sala) && /Se conecta al entrar/.test(out.sala), out.sala);
  check('signed out: the old «1 · Conectar a Nube» step is gone', !out.oldStep);
  check('signed out: no sideways scroll', out.side <= 0, out.side);

  const title = () => A.page.locator(`${OUT} [data-cloud-tab-panel]:not([hidden]) .cloud-sync-auth-title`).innerText();
  await A.page.locator(`${OUT} [data-cloud-tab-panel="login"] [data-cloud-tab="register"]`).click();
  const regTitle = await title();
  await r.shot(A.page, 'signed-out-crear');
  check('«Crear cuenta» swaps the card to «Crea tu cuenta» in place', regTitle === 'Crea tu cuenta', regTitle);
  await A.page.locator(`${OUT} [data-cloud-tab-panel="register"] [data-cloud-tab="login"]`).click();
  check('«‹ Entrar» goes back', (await title()) === 'Entra a tu cuenta');
  await A.page.locator(`${OUT} [data-cloud-tab-panel="login"] [data-cloud-tab="recover"]`).click();
  const recTitle = await title();
  await r.shot(A.page, 'signed-out-recuperar');
  check('«¿Olvidaste tu contraseña?» swaps to «Recupera tu cuenta»', recTitle === 'Recupera tu cuenta', recTitle);
  await A.page.locator(`${OUT} [data-cloud-tab-panel="recover"] [data-cloud-tab="login"]`).click();

  await A.page.evaluate(() => document.documentElement.classList.add('dark'));
  await A.page.waitForTimeout(250);
  await r.shot(A.page, 'signed-out-dark');
  await A.page.evaluate(() => document.documentElement.classList.remove('dark'));

  await A.page.locator(`${OUT} [data-cloud-login-user]`).fill(R4.username);
  await A.page.locator(`${OUT} [data-cloud-login-pass]`).fill(PASSWORD);
  await A.page.locator(`${OUT} [data-cloud-action="login"]`).click();
  const backIn = await until(async () => (await readHome(A.page)).account.includes('@' + R4.username), 20000);
  await r.shot(A.page, 'signed-back-in');
  check('signing in from the card lands on the home with your account', backIn, (await readHome(A.page)).account);

  check('no uncaught page errors', !A.pageErrors.length, A.pageErrors.slice(0, 5));
  await A.app.close();
});
