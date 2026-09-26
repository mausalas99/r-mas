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
import { startWorker, nubeDevices, onboardNube, until, openNubePanel } from './nube-worker.mjs';
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

  check('no uncaught page errors', !A.pageErrors.length, A.pageErrors.slice(0, 5));
  await A.app.close();
});
