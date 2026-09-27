#!/usr/bin/env node
/* global window, document */
/**
 * E2E: the Equipo panel (Conexión → Equipo) a new R1 sees when their R2
 * already published a team in Nube, then the same panel after they join.
 * Local copy of the real sync Worker only (nube-worker.mjs). DEMO users only.
 *
 * Layout: design board «B» — team cards in a grid, members shown, a
 * «¿No ves tu equipo?» card last (Crear / código open in dialogs), your team
 * as a status card, and the profile form moved to Conexión → Cuenta.
 *
 * Ways it can go wrong (each one is a check below):
 *   Pick-a-team screen
 *     - «pulsa Unirme» told more than once (banner, section text, empty box)
 *     - an empty «Mis equipos» box or a banner sits above the list
 *     - the list title repeats the count and the sala in one long line
 *     - each card says «Equipo en sala», which every card in the grid is
 *     - a filled (primary) button while picking: the R1 cannot tell which
 *       one to press; «Unirme» is the outlined button of each card
 *     - members are hidden behind a toggle, so the R1 cannot tell teams apart
 *     - «Unirme» is not at the bottom of its card
 *     - cards stack in one column on a wide window
 *     - «¿No ves tu equipo?» is not the last card, or lacks Crear / código
 *     - the profile form still sits in Equipo instead of a «Mi perfil» link
 *     - the code dialog does not open, or forgets the «not the sala link» warning
 *     - the code dialog opens top-left, or its fields hug the right edge
 *     - the panel scrolls sideways
 *   Narrow (700 px) viewport
 *     - the grid spills sideways
 *   After joining
 *     - your team is not first, or it is not the «Estás en» status card
 *     - «Mi perfil» does not open Cuenta with the profile form filled in
 *   Throughout
 *     - an uncaught page error
 */
import { createRun, closeToasts } from './harness.mjs';
import { startWorker, nubeDevices, onboardNube, openNubeView, until, flat } from './nube-worker.mjs';

const tag = Date.now().toString(36).slice(-6);
const R2 = { username: `demo_r2_${tag}`, name: 'Dr. Demo Día', rank: 'R2' };
const R1 = { username: `demo_r1_${tag}`, name: 'Dra. Demo Noche', rank: 'R1' };
const TEAM = 'EQUIPO DEMO PANEL';

const r = createRun('equipos-panel');
const { check } = r;
const launchDevice = nubeDevices(r);

const PANEL = '.cloud-sync-equipo-embed .clinical-teams-panel-body--embed';
const setWindow = (app, w, h) => app.evaluate(({ BrowserWindow }, [ww, hh]) => {
  BrowserWindow.getAllWindows()[0].setSize(ww, hh);
}, [w, h]);

/** Layout facts read from the live DOM, in one round trip. */
const readPanel = (page) => page.evaluate((sel) => {
  const host = document.querySelector(sel);
  const q = (s) => host.querySelector(s);
  const rect = (el) => (el ? el.getBoundingClientRect() : null);
  const visible = (el) => el.getBoundingClientRect().width > 0;
  const grid = [...host.querySelectorAll('.clinical-teams-list--directory > .clinical-teams-card')];
  const team = grid[0];
  return {
    text: host.innerText,
    pick: host.classList.contains('clinical-teams-panel-body--pick-team'),
    joinedBox: !!q('.clinical-teams-section--joined'),
    banner: !!q('.clinical-teams-pick-banner'),
    title: q('.clinical-teams-section--directory .clinical-teams-section-title')?.textContent || '',
    eyebrows: [...host.querySelectorAll('.clinical-teams-card--directory .clinical-teams-card-eyebrow')].map((e) => e.innerText),
    primaries: [...host.querySelectorAll('.wb-btn-primary')].filter(visible).map((b) => b.textContent.trim()),
    membersOpen: !!team?.querySelector('.clinical-teams-member-row') && !team.querySelector('details'),
    joinAtBottom: (() => {
      const j = rect(team?.querySelector('.clinical-teams-join-btn'));
      const m = rect(team?.querySelector('.clinical-teams-card-members'));
      return !!(j && m) && j.top >= m.bottom;
    })(),
    sideBySide: grid.length > 1 && Math.abs(rect(grid[0]).top - rect(grid[1]).top) < 2,
    lastIsNew: grid.at(-1)?.classList.contains('clinical-teams-card--new') || false,
    newText: grid.at(-1)?.innerText || '',
    profileLink: !!q('.clinical-teams-profile-link [data-cloud-view="cuenta"]'),
    profileFormHere: !!q('#clinical-profile-form'),
    hero: q('.clinical-teams-mine .clinical-teams-mine-hero')?.innerText || '',
    sideScroll: host.scrollWidth - host.clientWidth,
    cards: [...host.querySelectorAll('.clinical-teams-card')].map((c) => c.querySelector('.clinical-teams-card-title')?.innerText),
  };
}, PANEL);

await r.finish('Equipo panel: pick a published team, then the joined view', async () => {
  check('local Worker answers /ping', await startWorker());

  const A = await launchDevice('a', 3791);
  await onboardNube(A.page, R2);
  await A.page.getByRole('button', { name: 'Abrir Mi rotación' }).click();
  await A.page.locator('#btn-clinical-team-create-open').click();
  check('R2: «Crear equipo» opens its dialog', await until(() => A.page.locator('#clinical-team-create-panel[open]').isVisible(), 4000));
  await A.page.locator('#clinical-team-create-name').fill(TEAM);
  await A.page.locator('#clinical-team-create-form [type="submit"]').click();

  const B = await launchDevice('b', 3792);
  await setWindow(B.app, 1400, 950);
  await onboardNube(B.page, R1);
  await B.page.getByRole('button', { name: 'Abrir Mi rotación' }).click();
  const joinBtn = B.page.getByRole('button', { name: 'Unirme' });
  check('R1 sees the R2\'s team through Nube', await until(() => joinBtn.isVisible(), 20000));
  await B.page.waitForTimeout(800);
  await closeToasts(B.page);

  // ── Pick-a-team screen, wide window ──────────────────────────────────
  let p = await readPanel(B.page);
  await r.shot(B.page, 'pick-wide');
  check('pick-a-team layout is on', p.pick);
  const unirmeTold = (p.text.match(/pulsa\s+Unirme/g) || []).length;
  check('«pulsa Unirme» is said once', unirmeTold === 1, unirmeTold);
  check('no empty «Mis equipos» box while picking', !p.joinedBox);
  check('no extra banner above the list', !p.banner);
  check('list title names the sala once, without «1 equipo ·»',
    (p.title.match(/Sala 1/g) || []).length === 1 && !/\d+ equipo ·/.test(p.title), p.title);
  check('cards drop the «Equipo en sala» label', !p.eyebrows.includes('Equipo en sala'), p.eyebrows);
  check('no filled button while picking', p.primaries.length === 0, p.primaries);
  check('members show open in the team card', p.membersOpen);
  check('«Unirme» sits at the bottom of its card, under the members', p.joinAtBottom);
  check('cards sit side by side on a wide window', p.sideBySide);
  check('«¿No ves tu equipo?» is the last card, with Crear and código',
    p.lastIsNew && /No ves tu equipo/.test(p.newText) && /Crear equipo/.test(p.newText) && /Tengo un código/.test(p.newText), p.newText);
  check('profile is a «Mi perfil» link, not a form in Equipo', p.profileLink && !p.profileFormHere);
  check('panel does not scroll sideways (wide)', p.sideScroll <= 0, p.sideScroll);

  await B.page.locator('#btn-clinical-team-join-code-open').click();
  const codeDialog = B.page.locator('#clinical-team-join-code-dialog[open]');
  check('«Tengo un código» opens its dialog', await until(() => codeDialog.isVisible(), 4000));
  const codeBody = flat(await codeDialog.innerText().catch(() => ''));
  check('code dialog still warns not to paste the sala link', /enlace/.test(codeBody) && /Conexión guardia/.test(codeBody), codeBody);
  const box = await codeDialog.evaluate((d) => {
    const r = d.getBoundingClientRect();
    const input = d.querySelector('#clinical-team-join-code-input').getBoundingClientRect();
    const form = d.querySelector('form').getBoundingClientRect();
    return {
      offCenterX: Math.round(Math.abs(r.left + r.right - window.innerWidth) / 2),
      offCenterY: Math.round(Math.abs(r.top + r.bottom - window.innerHeight) / 2),
      inputLeft: Math.round(input.left - form.left),
      inputWidthPct: Math.round((input.width / form.width) * 100),
    };
  });
  check('code dialog is centered in the window', box.offCenterX <= 4 && box.offCenterY <= 4, box);
  check('code dialog fields start at the left and span the form', box.inputLeft <= 1 && box.inputWidthPct >= 98, box);
  await r.shot(B.page, 'pick-wide-code-open');
  await codeDialog.getByRole('button', { name: 'Cancelar' }).click();
  check('Cancelar closes the code dialog, panel stays', !(await codeDialog.isVisible()) && (await B.page.locator(PANEL).isVisible()));

  // ── Same screen, narrow window ───────────────────────────────────────
  // The desktop window stops at 960 px wide; emulate a phone-width viewport instead.
  const cdp = await B.page.context().newCDPSession(B.page);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 700, height: 900, deviceScaleFactor: 1, mobile: false });
  await B.page.waitForTimeout(400);
  p = await readPanel(B.page);
  await r.shot(B.page, 'pick-narrow');
  check('panel does not scroll sideways (narrow)', p.sideScroll <= 0, p.sideScroll);
  await cdp.send('Emulation.clearDeviceMetricsOverride');
  await B.page.waitForTimeout(400);

  // ── Join, then reopen ────────────────────────────────────────────────
  await joinBtn.click();
  check('R1: «Te uniste al equipo.»', await until(() => B.page.locator('.toast', { hasText: 'Te uniste' }).isVisible(), 10000));
  await B.page.waitForTimeout(1500);
  await closeToasts(B.page);
  if (!(await B.page.locator(PANEL).isVisible())) {
    await B.page.locator('#btn-connection-dropdown-close').click().catch(() => {});
    await B.page.keyboard.press('Escape');
    // Joining closes the panel; reopen it the way a user would.
    await openNubeView(B.page, 'equipo').catch(() => {});
  }
  const joinedShown = await until(() => B.page.locator(PANEL).isVisible(), 8000);
  if (joinedShown) {
    p = await readPanel(B.page);
    await r.shot(B.page, 'joined-wide');
    check('after joining: pick layout off, own team card leads', !p.pick && p.cards[0] === TEAM, { pick: p.pick, cards: p.cards });
    check('after joining: status card says «Estás en» with Invitar', /Estás en/.test(p.hero) && /Invitar/.test(p.hero), p.hero);
    check('after joining: panel does not scroll sideways', p.sideScroll <= 0, p.sideScroll);

    await B.page.locator(`${PANEL} .clinical-teams-profile-link button`).click();
    const form = B.page.locator('[data-cloud-view="cuenta"] #clinical-profile-form');
    check('«Mi perfil» opens Cuenta with the profile form', await until(() => form.isVisible(), 6000));
    check('profile form shows the saved @usuario',
      (await B.page.locator('#clinical-profile-username').inputValue().catch(() => '')) === R1.username);
    await r.shot(B.page, 'cuenta-profile');
  } else {
    check('after joining: Equipo panel reopens', false, 'could not reopen the panel');
  }

  check('no uncaught page errors', !A.pageErrors.length && !B.pageErrors.length, [...A.pageErrors, ...B.pageErrors].slice(0, 5));
  await A.app.close();
  await B.app.close();
});
