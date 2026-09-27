#!/usr/bin/env node
/* global document */
/**
 * E2E: Administración (Conexión → Opciones → Administración) for an R4 who
 * self-promotes with the local Worker's SYNC_ADMIN_KEY. DEMO users and
 * patients only.
 *
 * Layout: design board «Nube + Admin» — a side menu (Resumen, Salas,
 * Pacientes, Usuarios, Registro) with «Zona de peligro» pinned at the
 * bottom; Salas as cards; Pacientes with an action bar that appears only
 * after rows are picked; Registro that loads on its own.
 *
 * Ways it can go wrong (each one is a check below):
 *   - the admin key box still shows once you are admin
 *   - the menu is not the five sections + Zona de peligro, in that order
 *   - a section is empty, errors, or scrolls sideways
 *   - Salas has a red «Purgar» button on every card instead of a ··· menu
 *   - Pacientes shows the bulk bar before anything is picked, or not after
 *   - Registro needs a «Cargar» click, or shows raw user IDs as the actor
 *   - an uncaught page error
 */
import { createRun, dismissLearnHub, closeToasts, pasteAndSave } from './harness.mjs';
import { startWorker, nubeDevices, onboardNube, until, openNubePanel, roomMeta } from './nube-worker.mjs';
import { fullLabs } from './some-fixtures.mjs';

const tag = Date.now().toString(36).slice(-6);
const R4 = { username: `demo_admin_${tag}`, name: 'Dra. Demo Admin', rank: 'R4' };
const PATIENTS = [
  { exp: '7000511-1', name: 'DEMO ADMIN UNO', room: '401' },
  { exp: '7000512-2', name: 'DEMO ADMIN DOS', room: '402' },
];

const r = createRun('admin-panel');
const { check } = r;
const launchDevice = nubeDevices(r);

const ADMIN = '#connection-dropdown .cloud-sync-admin';
const section = (id) => `${ADMIN} [data-admin-section="${id}"]`;
const sideScroll = (page) => page.evaluate((sel) => {
  const el = document.querySelector(sel);
  return el ? el.scrollWidth - el.clientWidth : -1;
}, ADMIN);

await r.finish('Administración: side menu and its five sections (board «Nube + Admin»)', async () => {
  check('local Worker answers /ping', await startWorker());
  const A = await launchDevice('a', 3791);
  await onboardNube(A.page, R4);
  await dismissLearnHub(A.page);
  await A.page.waitForTimeout(1500);
  await dismissLearnHub(A.page); // it can open a moment after onboarding
  for (const p of PATIENTS) await pasteAndSave(A.page, fullLabs(p, 'Sep 20 2026 8:00AM'));
  await A.page.waitForTimeout(2500);
  await closeToasts(A.page);

  // ── Promote with the local key ───────────────────────────────────────
  await openNubePanel(A.page);
  await A.page.locator('[data-cloud-action="nav-options"]').click();
  await A.page.locator('.cloud-sync-view[data-cloud-view="options"] [data-cloud-view="admin"]').click();
  await A.page.locator('[data-admin-key-input]').fill('e2e-admin-key');
  await A.page.locator('[data-admin-action="save-key"]').click();
  await A.page.locator('[data-admin-action="promote-self"]').click();
  await A.page.locator('#cloud-sync-admin-confirm [data-approval-confirm]').click();
  check('self-promote with the local key', await until(() => A.page.locator('.toast', { hasText: /promovida a admin/i }).isVisible(), 10000));
  await closeToasts(A.page);
  await A.page.waitForTimeout(1500);

  const tabs = await A.page.locator(`${ADMIN} [role="tab"][data-admin-tab]`).evaluateAll((els) =>
    els.filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.getAttribute('data-admin-tab')));
  check('menu: Resumen, Salas, Pacientes, Usuarios, Registro, then Zona de peligro',
    tabs.join(',') === 'resumen,salas,red,equipos,mutaciones,peligro', tabs);
  check('the admin key box is gone once you are admin',
    !(await A.page.locator(`${ADMIN} [data-admin-bootstrap]`).isVisible().catch(() => false)));

  // ── Each section ─────────────────────────────────────────────────────
  for (const id of ['resumen', 'salas', 'red', 'equipos', 'mutaciones', 'peligro']) {
    await A.page.locator(`${ADMIN} [role="tab"][data-admin-tab="${id}"]`).click();
    const el = A.page.locator(section(id));
    await until(async () => {
      const t = await el.innerText().catch(() => '');
      return t.trim().length > 20 && !/Cargando|Recorriendo|Buscando/.test(t);
    }, 15000);
    await A.page.waitForTimeout(400);
    const text = await el.innerText().catch(() => '');
    await r.shot(A.page, 'admin-' + id);
    check(`${id}: shows content, no error`, text.trim().length > 20 && !/No se pudo/.test(text), text.slice(0, 160));
    check(`${id}: no sideways scroll`, (await sideScroll(A.page)) <= 0, await sideScroll(A.page));
  }

  // ── Salas: purge lives only in the ··· menu ──────────────────────────
  await A.page.locator(`${ADMIN} [role="tab"][data-admin-tab="salas"]`).click();
  const salas = A.page.locator(section('salas'));
  check('Salas: no red purge button on the cards',
    (await salas.locator('.cloud-sync-btn--danger').count()) === 0 && (await salas.locator('[data-admin-sala-card]').count()) >= 1);
  await salas.locator('.cloud-sync-admin-more-btn').first().click();
  const menu = await salas.locator('.cloud-sync-admin-more[open] .wb-menu-panel').innerText().catch(() => '');
  await r.shot(A.page, 'salas-menu');
  check('Salas: ··· menu offers Cambiar código, Copiar invitación, Purgar sala…',
    /Cambiar código/.test(menu) && /Copiar invitación/.test(menu) && /Purgar sala/.test(menu), menu);
  await salas.locator('.cloud-sync-admin-more-btn').first().click();

  // ── Salas › Cambiar código on the sala this device is in ─────────────
  const before = await roomMeta(A.page);
  const myCard = salas.locator('[data-admin-sala-card]', { has: A.page.locator(`[data-admin-action="rotate-code"][data-room-id="${before.id}"]`) });
  await myCard.locator('.cloud-sync-admin-more-btn').click();
  await myCard.locator('[data-admin-action="rotate-code"]').click();
  await A.page.locator('#cloud-sync-admin-confirm [data-approval-confirm]').click();
  const rotated = A.page.locator('.toast', { hasText: /Nuevo código/ }).last();
  await until(() => rotated.isVisible(), 10000);
  const newCode = ((await rotated.innerText().catch(() => '')).match(/Nuevo código: (\S+)/) || [])[1] || '';
  const after = await roomMeta(A.page);
  const cardCode = await A.page.locator('#connection-dropdown [data-cloud-room-code]').first().textContent().catch(() => '');
  check('Cambiar código: a new code, different from the old one', !!newCode && newCode !== before.code, { before: before.code, newCode });
  check('Cambiar código: this device stores the new code', after?.code === newCode, { stored: after?.code, newCode });
  check('Cambiar código: «Tu sala» shows the new code without reopening', cardCode.trim() === newCode, { cardCode, newCode });
  await closeToasts(A.page);

  // ── Pacientes: search, and the action bar only with a selection ─────
  await A.page.locator(`${ADMIN} [role="tab"][data-admin-tab="red"]`).click();
  const red = A.page.locator(section('red'));
  const bar = red.locator('[data-admin-red-bulk-actions]');
  check('Pacientes: no action bar before anything is picked', !(await bar.isVisible()));
  await red.locator('tbody input[data-network-select]').first().check();
  check('Pacientes: picking a row shows the bar with the count',
    await until(async () => (await bar.isVisible()) && /1 seleccionado/.test(await bar.innerText()), 3000), await bar.innerText().catch(() => ''));
  await r.shot(A.page, 'pacientes-seleccion');
  await bar.locator('[data-admin-action="clear-network-selection"]').click();
  check('Pacientes: × clears the selection and hides the bar', !(await bar.isVisible()));
  await red.locator('[data-network-filter="q"]').fill('uno');
  const shown = await red.locator('tbody tr:not([hidden])').count();
  check('Pacientes: search narrows the list to matching patients', shown === 1, shown);
  await red.locator('[data-network-filter="q"]').fill('');
  await red.locator('[data-admin-action="switch-network-room"]').first().click();
  await until(() => A.page.locator('.toast', { hasText: /Cambiado a la sala/i }).isVisible(), 10000);
  await A.page.waitForTimeout(800);
  const stillAdmin = await A.page.locator(section('red')).isVisible().catch(() => false);
  check('Pacientes: «Abrir expediente» keeps Administración open on Pacientes', stillAdmin);
  await closeToasts(A.page);
  const row2 = red.locator('tr', { has: A.page.locator(`input[data-registro="${PATIENTS[1].exp}"]`) });
  await row2.locator('.cloud-sync-admin-equipos-edit summary').click();
  await row2.locator('[data-admin-action="archive-network-patient"]').click();
  const result = A.page.locator('.toast', { hasText: /archivado|No se pudo|error/i }).last();
  await until(() => result.isVisible(), 10000);
  const toastText = await result.innerText().catch(() => '');
  await r.shot(A.page, 'pacientes-archivar');
  check('Pacientes: ··· › Archivar archives the patient', /archivado/i.test(toastText), toastText);
  await closeToasts(A.page);

  // ── Usuarios: chips with counts filter the list ─────────────────────
  await A.page.locator(`${ADMIN} [role="tab"][data-admin-tab="equipos"]`).click();
  const users = A.page.locator(section('equipos'));
  await until(async () => (await users.locator('.cloud-sync-admin-equipos-row').count()) > 0, 10000);
  const chipCount = (id) => users.locator(`[data-admin-equipos-chip-count="${id}"]`).innerText();
  check('Usuarios: «Todos» counts every row', Number(await chipCount('all')) === (await users.locator('.cloud-sync-admin-equipos-row').count()), await chipCount('all'));
  await users.locator('[data-admin-equipos-chip="unassigned"]').click();
  const unassignedShown = await users.locator('.cloud-sync-admin-equipos-row:not([hidden])').count();
  check('Usuarios: «Sin equipo» shows exactly its count', unassignedShown === Number(await chipCount('unassigned')), { unassignedShown, count: await chipCount('unassigned') });
  await r.shot(A.page, 'usuarios-sin-equipo');
  await users.locator('[data-admin-equipos-chip="all"]').click();

  // ── Registro: loads by itself, names people ──────────────────────────
  await A.page.locator(`${ADMIN} [role="tab"][data-admin-tab="mutaciones"]`).click();
  const reg = A.page.locator(section('mutaciones'));
  const loaded = await until(async () => (await reg.locator('.cloud-sync-admin-event').count()) > 0, 10000);
  const regText = await reg.locator('.cloud-sync-admin-events').innerText().catch(() => '');
  check('Registro loads on its own (no «Cargar»)', loaded && !(await reg.locator('[data-admin-action="load-mutations"]').count()));
  check('Registro names the person, not a user ID', regText.includes(R4.name) && !/[0-9a-f]{8}-[0-9a-f]{4}-/.test(regText), regText.slice(0, 200));
  await reg.locator('.cloud-sync-admin-event summary').first().click();
  await r.shot(A.page, 'registro-detalle');

  check('no uncaught page errors', !A.pageErrors.length, A.pageErrors.slice(0, 5));
  await A.app.close();
});
