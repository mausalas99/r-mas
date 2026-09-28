#!/usr/bin/env node
/* global document */
/**
 * E2E: Ajustes (⚙) on a local-only device — board «Ajustes + Perfil»:
 * variant A side menu in three groups (Tú / Datos / Equipo y app) with Zona
 * de peligro pinned at the bottom, and Mi perfil B inside it (autosave +
 * live preview). DEMO data only.
 *
 * Ways it can go wrong (each one is a check below):
 *   Menu
 *     - not the 7 sections + Zona de peligro, or not in the three groups
 *     - «Cuenta y equipo» link cards or Rendimiento still there
 *     - Laboratorio (8.4.2's portal address) missing between Respaldos and Documentos
 *     - Zona de peligro is not the last item
 *   Sections
 *     - a section is empty or scrolls sideways
 *     - Respaldos / Seguridad / Aplicación open without their status card
 *     - Búsqueda unificada or Modo enfoque still listed in Ajustes
 *   Mi perfil
 *     - the header «Mi perfil» button does not open its own window
 *     - «Cédula profesional» is still in «Firma en documentos»
 *     - a typed Médico tratante is not saved without pressing anything
 *     - the preview does not show it as the signature
 *     - Censo PDF is not in Documentos, Formatos clínicos not in Plantillas
 *   Throughout
 *     - an uncaught page error
 */
import { createRun, onboardLocalOnly, closeToasts, until } from './harness.mjs';

const r = createRun('ajustes-panel');
const { check } = r;

const NAV = '#settings-nav';
const openAjustes = async (page) => {
  await page.locator('#btn-open-settings').click();
  await page.locator(NAV).waitFor({ state: 'visible', timeout: 8000 });
};
const goto = (page, id) => page.locator(`${NAV} [data-settings-target="${id}"]`).click();

await r.finish('Ajustes A + Mi perfil B', async () => {
  const A = await r.launch({ profile: 'a' });
  await onboardLocalOnly(A.page);
  await closeToasts(A.page);
  await openAjustes(A.page);

  const nav = await A.page.evaluate((sel) =>
    [...document.querySelector(sel).children]
      .filter((el) => el.getBoundingClientRect().height > 0 || el.classList.contains('settings-nav-spacer'))
      .map((el) => (el.classList.contains('settings-nav-group') ? '#' : '') + el.textContent.trim()), NAV);
  // Laboratorio holds 8.4.2's lab portal address (kept on top of board A, agreed with the owner).
  check('menu: Tú · Apariencia · Datos · Respaldos, Laboratorio, Documentos, Plantillas · Equipo y app · Seguridad, Aplicación, Nube ↗ · … Zona de peligro',
    nav.join('|') === '#Tú|Apariencia|#Datos|Respaldos|Laboratorio|Documentos|Plantillas|#Equipo y app|Seguridad|Aplicación|Nube y equipo ↗||Zona de peligro', nav);
  const all = await A.page.locator('#settings-dropdown').innerText();
  check('no «Cuenta y equipo» cards or Rendimiento section',
    !/Cuenta y equipo/.test(all) && !nav.includes('Rendimiento'), nav);

  for (const [id, name] of [
    ['settings-accordion-appearance', 'apariencia'],
    ['settings-accordion-backup-sync', 'respaldos'],
    ['settings-accordion-documents', 'documentos'],
    ['settings-accordion-templates', 'plantillas'],
    ['settings-accordion-security', 'seguridad'],
    ['settings-accordion-updates', 'aplicacion'],
    ['settings-accordion-danger', 'peligro'],
  ]) {
    await goto(A.page, id);
    const panel = A.page.locator('#' + id);
    await until(() => panel.isVisible(), 3000);
    await A.page.waitForTimeout(250);
    const text = await panel.innerText();
    const side = await A.page.evaluate(() => {
      const el = document.getElementById('settings-panels');
      return el.scrollWidth - el.clientWidth;
    });
    await r.shot(A.page, 'ajustes-' + name);
    check(`${name}: shows content, no sideways scroll`, text.trim().length > 20 && side <= 0, { side, text: text.slice(0, 80) });
  }

  const statusCards = await A.page.evaluate(() =>
    ['backup', 'security', 'app'].map((k) => !!document.querySelector(`[data-settings-${k}-status]`)));
  check('Respaldos, Seguridad and Aplicación open with a status card', statusCards.every(Boolean), statusCards);
  check('Búsqueda unificada and Modo enfoque left Ajustes', !/Búsqueda unificada|Modo enfoque/.test(await A.page.locator('#settings-dropdown').innerText()));
  check('Censo PDF lives in Documentos', /Censo PDF/.test(await A.page.locator('#settings-accordion-documents').innerText()));
  check('Formatos clínicos live in Plantillas', /Formatos de nota/.test(await A.page.locator('#settings-accordion-templates').innerText()));

  // The app behind an open panel is inert (out of reach for keyboard and screen readers).
  const appInert = () => A.page.evaluate(() => [...document.querySelectorAll('body > header, body > .app')].map((el) => el.inert));
  const whileOpen = await appInert();
  check('while Ajustes is open, header and app behind it are inert', whileOpen.length === 2 && whileOpen.every(Boolean), whileOpen);

  // ── Mi perfil B ────────────────────────────────────────────────────────
  await A.page.locator('#btn-settings-dropdown-close').click();
  await A.page.waitForTimeout(400);
  const afterClose = await appInert();
  const focusAfterClose = await A.page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
  check('after closing Ajustes the app is live again and focus is not lost',
    afterClose.every((x) => !x) && focusAfterClose !== 'BODY', { afterClose, focusAfterClose });
  await A.page.locator('#profile-toggle-btn').click();
  const perfil = A.page.locator('#profile-modal');
  check('header «Mi perfil» opens its own window, not Ajustes', await until(() => perfil.isVisible(), 5000));
  const noScroll = () => A.page.evaluate(() => {
    const scrolls = [...document.querySelectorAll('#profile-modal .modal, #profile-modal .wb-modal-body')]
      .map((el) => el.scrollHeight - el.clientHeight);
    return { over: Math.max(...scrolls), viewport: innerHeight };
  });
  const salaFit = await noScroll();
  check('Mi perfil (Sala) fits without scrolling', salaFit.over <= 1, salaFit);
  await A.page.locator('#profile-modal label:has(#app-mode-inter)').click();
  await A.page.waitForTimeout(300);
  const interFit = await noScroll();
  check('Mi perfil (Interconsulta) fits without scrolling', interFit.over <= 1, interFit);
  await r.shot(A.page, 'perfil-interconsulta');
  await A.page.locator('#profile-modal label:has(#app-mode-sala)').click();
  await A.page.waitForTimeout(300);
  await A.page.waitForTimeout(500); // let the window finish opening
  const firma = await perfil.innerText();
  check('«Cédula profesional» is gone from Firma en documentos', !/Cédula/i.test(firma));
  await A.page.locator('#profile-doctor-pick').selectOption('__otro__');
  await A.page.locator('#profile-doctor').fill('Dra. Demo Perfil');
  await A.page.waitForTimeout(900);
  const chip = await perfil.locator('[data-perfil-saved]').innerText();
  const preview = await perfil.locator('[data-perfil-name]').innerText();
  await r.shot(A.page, 'perfil-autosave');
  check('typing a Médico tratante saves on its own', chip === 'Guardado', chip);
  check('the name card shows it', preview === 'Dra. Demo Perfil', preview);
  const stored = await A.page.evaluate(() => JSON.parse(localStorage.getItem('rpc-settings') || '{}').doctorName);
  check('it is in the saved settings', stored === 'Dra. Demo Perfil', stored);

  // Dark theme for a visual check.
  await A.page.evaluate(() => document.documentElement.classList.add('dark'));
  await A.page.waitForTimeout(250);
  await r.shot(A.page, 'perfil-dark');

  check('no uncaught page errors', !A.pageErrors.length, A.pageErrors.slice(0, 5));
  await A.app.close();
});
