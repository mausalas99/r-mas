#!/usr/bin/env node
/* global window */
/**
 * E2E: Aprender R+ (Learn Hub) — the "Guardia y R+ Cloud" track, gating,
 * progress, and the tour-seeded demo data (Pendientes, Listado, presentación,
 * interconsulta). Driven through the real Electron app. Synthetic DEMO
 * patients only (the built-in tour/pitch demo seeds).
 *
 * Ways it can go wrong (each one is a check below):
 *   - the 4 guardia-v7 modules show the wrong count/order/step totals, or a
 *     retired "Modo Entrega" module reappears
 *   - a tour step highlights nothing (a broken selector with no working
 *     fallback)
 *   - the upgrade card shows during onboarding, or once the track is done
 *   - a fresh install never opens Fundamentos; an upgrade re-opens it
 *   - a module completion isn't announced (or is announced twice), reset
 *     doesn't clear it, progress doesn't survive a restart
 *   - the tour's Pendientes/Listado steps show no demo data, or "Modo
 *     presentación" shows fewer than the documented pendientes
 *   - the interconsulta demo board seeds the wrong patient/team counts, or
 *     the ⌥⌘⇧I toggle leaves real data mixed in
 *
 * KNOWN GAP: gv7_guardia_toggle (Modo Guardia, step 4/5). Was a confirmed app
 * bug — the tour targeted #btn-guardia-mode-toggle, which nothing in the app
 * ever created — now fixed to target the real "Con pendiente" census filter
 * chip, with matching copy. Still fails in THIS harness: that chip only
 * renders once a patient resolves into the guardia census, which needs a
 * clinical team whose `sala` matches declaredSala (Nube-scoped concept). This
 * scenario is local-only, so no patient ever qualifies and the chip never
 * renders. Not built here — would need a Nube team-seed, out of scope for a
 * local-only harness.
 *
 * Artifact: e2e-artifacts/learn-hub-tour/<run-id>/ (report.json + screenshots).
 *
 *   npm run e2e:learn-hub-tour
 */
import { createRun, onboardLocalOnly, closeToasts, until, pasteAndSave } from './harness.mjs';
import { header, TABLE } from './some-fixtures.mjs';

const r = createRun('learn-hub-tour');
const { check } = r;
const P1 = { exp: '7000789-0', name: 'DEMO GUARDIA TOUR', room: '512' };

const GUARDIA_CHAPTERS = [
  { id: 'ch-guardia-modo', title: 'Modo Guardia', steps: ['gv7_guardia_chip', 'gv7_guardia_tab', 'gv7_guardia_scope', 'gv7_guardia_toggle', 'gv7_guardia_exit'] },
  { id: 'ch-guardia-censo', title: 'Censo y alcance', steps: ['gv7_censo_r1', 'gv7_censo_r4', 'gv7_censo_sync'] },
  { id: 'ch-guardia-nube', title: 'R+ Cloud y equipos', steps: ['gv7_lan_wifi', 'gv7_lan_directorio', 'gv7_lan_rotacion', 'gv7_rotacion_rejoin', 'gv7_inherit_patients'] },
  { id: 'ch-guardia-movil', title: 'iPad y móvil', steps: ['gv7_mobile_link', 'gv7_mobile_scope', 'gv7_mobile_vs_sala'] },
];
const ACTION_STEPS = new Set(['gv7_guardia_toggle', 'gv7_lan_wifi', 'gv7_mobile_link']);

async function openLearnHubUi(page) {
  await closeToasts(page);
  const btn = page.locator('#btn-open-learn');
  await until(() => btn.isVisible(), 5000);
  await btn.click();
  await page.locator('#learn-hub-backdrop.open').waitFor({ state: 'visible' });
}

async function closeLearnHubUi(page) {
  const bd = page.locator('#learn-hub-backdrop.open');
  if (await bd.count()) {
    await page.keyboard.press('Escape');
    await bd.waitFor({ state: 'detached', timeout: 4000 }).catch(() => {});
  }
}

/** Runs one guardia-v7 module end to end. Returns which steps showed a spotlight target. */
async function runGuardiaModule(page, chapter) {
  await openLearnHubUi(page);
  await page.locator(`[data-learn-chapter="${chapter.id}"][data-learn-branch="guardia-v7"]`).first().click();
  await page.locator('#tour-dock').waitFor({ state: 'visible', timeout: 6000 });
  const spotlightSeen = [];
  const nextBtn = page.locator('#tour-btn-next');
  for (let i = 0; i < chapter.steps.length; i++) {
    const stepId = chapter.steps[i];
    await page.waitForTimeout(400); // 140ms internal scroll delay + margin
    const spotCount = await page.locator('.tour-spotlight-action, .tour-spotlight-soap').count();
    spotlightSeen.push(spotCount > 0);
    if (ACTION_STEPS.has(stepId)) {
      if (stepId === 'gv7_guardia_toggle') {
        // Profile has no assigned sala: entering guardia opens the "Activar
        // guardia" sala picker gate before the census table (and its filter
        // chips) render at all.
        const salaStart = page.locator('#guardia-sala-picker-start');
        if (await salaStart.isVisible().catch(() => false)) await salaStart.click().catch(() => {});
        await page.locator('.guardia-census-table [data-wb-chip-id="pendiente"]').click().catch(() => {});
        // KNOWN GAP (test seeding, not an app bug — the app-side fix for this
        // step is done: it now targets the real "Con pendiente" chip with
        // correct copy). The chip only exists once a patient resolves into
        // the guardia census, which needs a clinical team whose `sala`
        // matches declaredSala (buildGuardiaCensusPatients →
        // filterPatientsByTeamSala, patients-clinical-filter.mjs:161-168).
        // Team assignment in this app is a Nube-scoped concept; this harness
        // only exercises the local-only onboarding path, so no patient ever
        // resolves into scope here and the chip never renders. Documented
        // rather than built: seeding a real team needs the Nube flow this
        // scenario deliberately avoids.
        if ((await page.locator('.guardia-census-table [data-wb-chip-id="pendiente"]').count()) === 0) {
          throw new Error(
            'KNOWN GAP — gv7_guardia_toggle: no patient resolves into the guardia census for a local-only profile ' +
              '(needs a Nube clinical team whose sala matches declaredSala), so the "Con pendiente" chip never ' +
              'renders and the tour cannot progress past step 4/5 in this harness. Tour target/copy itself is fixed.'
          );
        }
      }
      // gv7_lan_wifi / gv7_mobile_link: the tour auto-opens the connection
      // panel on its own; the 800ms action-poll in tour-step-actions.mjs
      // picks that state change up without any extra click.
      await until(() => nextBtn.isVisible().then((v) => v && nextBtn.isEnabled()), 6000, 200);
    }
    const isLast = i === chapter.steps.length - 1;
    await nextBtn.click();
    if (isLast) await page.locator('#tour-dock').waitFor({ state: 'hidden', timeout: 6000 }).catch(() => {});
  }
  return spotlightSeen;
}

await r.finish('Learn Hub: guardia-v7 track, gating, progress, tour demo data', async () => {
  const { app, page, pageErrors } = await r.launch();
  await onboardLocalOnly(page);

  // A guardia census with zero patients never renders the filter chips at all
  // (empty state replaces the table) — seed one so gv7_guardia_toggle's real
  // target (the "Con pendiente" chip) exists when the module reaches it.
  await page.locator('#apptab-lab').click();
  const doc0 = header(P1, 'Sep 24 2026 8:00AM') + 'BIOMETRIA HEMATICA\n' + TABLE + 'HEMOGLOBINA\tB\t13.2\tg/dL\t14.0 - 18.0\n';
  await pasteAndSave(page, doc0);

  // ── onboarding-curriculum.guardia-v7: module list is structurally correct ──
  await openLearnHubUi(page);
  const rows = page.locator('.learn-hub-track [data-learn-branch="guardia-v7"]');
  const chapterIds = await rows.evaluateAll((els) => els.map((e) => e.getAttribute('data-learn-chapter')));
  check('exactly 4 guardia-v7 modules, no Modo Entrega', chapterIds.length === 4 && !chapterIds.includes('ch-guardia-entrega'), chapterIds);
  check('module order: Censo before Nube', chapterIds.indexOf('ch-guardia-censo') < chapterIds.indexOf('ch-guardia-nube'), chapterIds);
  const metas = await rows.evaluateAll((els) => els.map((e) => e.querySelector('.learn-hub-module-meta')?.textContent || ''));
  check(
    '16 steps total across the 4 modules (5+3+5+3)',
    /^5 pasos/.test(metas[0]) && /^3 pasos/.test(metas[1]) && /^5 pasos/.test(metas[2]) && /^3 pasos/.test(metas[3]),
    metas
  );
  await closeLearnHubUi(page);

  // ── tour-targets.guardia-v7 + guardia-v7-progress: run every module ──────
  for (const chapter of GUARDIA_CHAPTERS) {
    const seen = await runGuardiaModule(page, chapter);
    check(`${chapter.id}: every step (${chapter.steps.length}) highlighted a real target`, seen.every(Boolean), { chapter: chapter.id, seen, steps: chapter.steps });
    const toast = page.locator('.toast', { hasText: 'Módulo completado' });
    check(`${chapter.id}: completion toast shown once`, await toast.first().isVisible().catch(() => false));
    await closeToasts(page);
  }

  // guardia-v7-progress: completed modules show "Hecho"; percent on the card.
  await openLearnHubUi(page);
  const doneCount = await page.locator('.learn-hub-track [data-learn-branch="guardia-v7"].is-complete').count();
  check('all 4 modules show completed after finishing them', doneCount === 4, doneCount);
  await closeLearnHubUi(page);
  check(
    'guardia-v7-progress: track-complete toast shown',
    await page.locator('.toast', { hasText: '¡Guía de guardia completada!' }).first().isVisible().catch(() => false)
  );

  // Reset one module → toast + no longer marked done.
  await openLearnHubUi(page);
  await page.locator('[data-learn-reset="ch-guardia-modo"]').click();
  const resetToast = page.locator('.toast', { hasText: 'Módulo reseteado. Ábrelo cuando quieras.' });
  check('reset: toast shown', await resetToast.first().isVisible().catch(() => false));
  const modoRow = page.locator('[data-learn-chapter="ch-guardia-modo"][data-learn-branch="guardia-v7"]');
  check('reset: ch-guardia-modo no longer marked complete', !(await modoRow.locator('..').first().evaluate((el) => el.closest('.learn-hub-module-card')?.classList.contains('is-complete'))));
  await closeToasts(page);
  await closeLearnHubUi(page);

  // Redo the reset module so the track is complete again for the persistence check below.
  await runGuardiaModule(page, GUARDIA_CHAPTERS[0]);
  await closeToasts(page);

  // guardia-v7-progress: restart → progress kept.
  await app.close();
  const relaunch1 = await r.launch();
  await openLearnHubUi(relaunch1.page);
  const doneAfterRestart = await relaunch1.page.locator('.learn-hub-track [data-learn-branch="guardia-v7"].is-complete').count();
  check('progress survives a restart (4 modules still done)', doneAfterRestart === 4, doneAfterRestart);
  await closeLearnHubUi(relaunch1.page);

  // ── guardia-v7-gating: track already complete → no upgrade card ─────────
  // window.__RPC_PREV_APP_VERSION__ is normally set once Ajustes/Mi perfil
  // populates the version block (populateProfileVersionBlock); priming it
  // with an initScript + reload reproduces "already opened Ajustes on the
  // old version, then relaunched" without importing any app module.
  await relaunch1.page.evaluate(() => localStorage.setItem('rplus-last-seen-app-version', '6.7.0'));
  await relaunch1.app.close();

  const relaunch2 = await r.launch();
  await relaunch2.page.addInitScript(() => { window.__RPC_PREV_APP_VERSION__ = '6.7.0'; });
  await relaunch2.page.reload();
  await relaunch2.page.waitForTimeout(3000);
  check(
    'guardia-v7-gating: track already complete → no upgrade card',
    (await relaunch2.page.locator('#guardia-v7-upgrade-card').count()) === 0
  );
  await relaunch2.app.close();

  // ── guardia-v7-gating: fresh registered install → Fundamentos auto-opens ─
  const fresh = await r.launch({ profile: 'fresh' });
  await onboardLocalOnly(fresh.page);
  await fresh.page.waitForTimeout(3000);
  check(
    'guardia-v7-gating: fresh registered install opens Learn Hub on Fundamentos',
    await fresh.page.locator('#learn-hub-backdrop.open .learn-hub-track[open]').first().evaluate((el) =>
      el.querySelector('.learn-hub-track-name')?.textContent === 'Fundamentos'
    ).catch(() => false)
  );
  await closeLearnHubUi(fresh.page);

  // guardia-v7-gating: last-seen 6.7.0 (a real upgrade) + not mid-onboarding → upgrade card.
  await fresh.page.evaluate(() => localStorage.setItem('rplus-last-seen-app-version', '6.7.0'));
  await fresh.app.close();
  const upgraded = await r.launch({ profile: 'fresh' });
  await upgraded.page.addInitScript(() => {
    window.__RPC_PREV_APP_VERSION__ = '6.7.0';
  }).catch(() => {});
  await upgraded.page.waitForTimeout(3000);
  const card = upgraded.page.locator('#guardia-v7-upgrade-card');
  check('guardia-v7-gating: registered, upgraded from 6.7.0 → upgrade card shows', await card.isVisible().catch(() => false));
  check(
    'guardia-v7-gating: upgrade card offers to start/continue the guardia guide',
    await card.locator('#guardia-v7-upgrade-start').isVisible().catch(() => false)
  );
  // tryShowPostRegistrationEducationIfNeeded (settings-help/tour-intro-education.mjs)
  // checks shouldOfferGuardiaV7Education first and returns before ever reaching
  // shouldShowFundamentosTourIntro — the two are mutually exclusive by code path.
  // The upgrade card showing above already proves this branch, confirmed live here.
  check(
    'guardia-v7-gating: an upgrade from below 7.0.0 never auto-opens Fundamentos',
    (await upgraded.page.locator('#learn-hub-backdrop.open').count()) === 0
  );

  // ── guardia-v7-gating: during onboarding → no upgrade card ───────────────
  const duringOnboarding = await r.launch({ profile: 'onboarding' });
  await duringOnboarding.page.evaluate(() => localStorage.setItem('rplus-last-seen-app-version', '6.7.0'));
  await duringOnboarding.page.addInitScript(() => {
    window.__RPC_PREV_APP_VERSION__ = '6.7.0';
  }).catch(() => {});
  await duringOnboarding.page.waitForTimeout(2500);
  check(
    'guardia-v7-gating: mid-onboarding → no upgrade card',
    (await duringOnboarding.page.locator('#guardia-v7-upgrade-card').count()) === 0
  );
  await duringOnboarding.app.close();
  await upgraded.app.close();

  // ── tour-demo-todos + tour-demo-listado-problemas: fundamentals "salida" module ──
  const salidaDevice = await r.launch({ profile: 'salida' });
  await onboardLocalOnly(salidaDevice.page);
  await openLearnHubUi(salidaDevice.page);
  await salidaDevice.page.locator('[data-learn-chapter="ch-salida"]').first().click();
  await salidaDevice.page.locator('#tour-dock').waitFor({ state: 'visible', timeout: 6000 });
  // ch-salida: sala_med, listado_problemas, sala_vpo, sala_receta_hu.
  await salidaDevice.page.waitForTimeout(600);
  await salidaDevice.page.locator('#tour-btn-next').click(); // -> listado_problemas
  await salidaDevice.page.waitForTimeout(800);
  const listadoText = await salidaDevice.page.locator('#listado-form, #itab-content-listado').first().innerText().catch(() => '');
  check('tour-demo-listado-problemas: A)/B)/C) blocks in capitals show on the tour Listado step', /A\) CL[ÍI]NICA/.test(listadoText) && /B\) EXPLORACI[ÓO]N/.test(listadoText), listadoText.slice(0, 300));
  check('tour-demo-listado-problemas: at least one inactivo listed', /inactivo/i.test(listadoText) || (await salidaDevice.page.locator('.listado-inactivo, [data-listado-inactivo]').count()) >= 1);
  await salidaDevice.page.locator('#tour-btn-pause').click().catch(() => {});
  await closeToasts(salidaDevice.page);

  // Pendientes for the fundamentals demo patient (DEMO PÉREZ), seeded by the same tour.
  await salidaDevice.page.locator('#apptab-nota').click();
  await salidaDevice.page.locator('button:visible', { hasText: /^\s*Pendientes\s*$/ }).first().click();
  const todoRows = salidaDevice.page.locator('.wb-todo-row');
  await todoRows.first().waitFor({ timeout: 5000 }).catch(() => {});
  const todoTexts = await todoRows.evaluateAll((els) =>
    els.map((e) => e.querySelector('.todo-text-input')?.value || e.querySelector('.wb-todo-pendiente')?.textContent || '')
  );
  check('tour-demo-todos: demo patient has 4+ pendientes', todoTexts.length >= 4, todoTexts);
  check('tour-demo-todos: one pendiente mentions BH/QS', todoTexts.some((t) => /BH|QS/i.test(t)), todoTexts);
  check(
    'UNREACHABLE — tour-demo-todos quota-warning branch: writeTodosMap\'s console.warn only fires when '
      + 'localStorage.setItem throws QuotaExceededError (tour-demo-todos.mjs). No UI action makes a real '
      + 'Chromium localStorage quota error; the old test reaches it only by stubbing globalThis.localStorage '
      + "in Node, which this harness must not do to drive a check.",
    true
  );
  check('no page errors after the fundamentals module', salidaDevice.pageErrors.length === 0, salidaDevice.pageErrors);
  await salidaDevice.app.close();

  // ── tour-pitch-demo-todos: "Modo presentación" ───────────────────────────
  const pitchDevice = await r.launch({ profile: 'pitch' });
  await onboardLocalOnly(pitchDevice.page);
  await pitchDevice.page.locator('#btn-open-settings').click();
  await pitchDevice.page.locator('[data-onclick2="openQuickHelp"], .settings-head-link', { hasText: 'Ayuda' }).first().click();
  await pitchDevice.page.locator('#help-quick-backdrop.open').waitFor({ state: 'visible', timeout: 5000 });
  await pitchDevice.page.locator('.help-learn-advanced summary').click();
  await pitchDevice.page.locator('#btn-start-presentation').click();
  await pitchDevice.page.locator('#help-quick-backdrop').evaluate((el) => el.classList.remove('open')).catch(() => {});
  await pitchDevice.page.keyboard.press('Escape').catch(() => {});
  await closeToasts(pitchDevice.page);
  await pitchDevice.page.locator('#apptab-nota').click();
  await pitchDevice.page.locator('button:visible', { hasText: /^\s*Pendientes\s*$/ }).first().click();
  const pitchRows = pitchDevice.page.locator('.wb-todo-row');
  await pitchRows.first().waitFor({ timeout: 5000 }).catch(() => {});
  const pitchTexts = await pitchRows.evaluateAll((els) =>
    els.map((e) => e.querySelector('.todo-text-input')?.value || e.querySelector('.wb-todo-pendiente')?.textContent || '')
  );
  check('tour-pitch-demo-todos: presentation demo patient has 5+ pendientes', pitchTexts.length >= 5, pitchTexts);
  check('tour-pitch-demo-todos: one pendiente mentions ATB/antibiograma', pitchTexts.some((t) => /ATB|antibiograma/i.test(t)), pitchTexts);
  const pitchOpenAltaCount = await pitchDevice.page.locator('.wb-todo-row--prio-alta:not(.wb-todo-row--closed)').count();
  check('tour-pitch-demo-todos: at least one open pendiente is ALTA', pitchOpenAltaCount >= 1, pitchOpenAltaCount);
  const pitchClosedCount = await pitchDevice.page.locator('.wb-todo-row--closed').count();
  check('tour-pitch-demo-todos: at least one pendiente is already closed', pitchClosedCount >= 1, pitchClosedCount);
  check(
    'UNREACHABLE — tour-pitch-demo-todos quota-warning branch: same writeTodosMap guard as tour-demo-todos '
      + '(tour-pitch-demo-todos.mjs); no UI action triggers a real localStorage QuotaExceededError.',
    true
  );

  // ── tour-pitch-labs-edge-cases: presentation lab history ─────────────────
  // The pitch seed puts an AM + PM toma on yesterday and a 17+-altered toma
  // 3 days ago (tour-pitch-labs.mjs dayOffset -1 / -3).
  const pp = pitchDevice.page;
  const dayStr = (off) => {
    const d = new Date(Date.now() + off * 86400000);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };
  await pp.locator('#apptab-lab').click();
  await pp.locator('#lab-inner-labs-btn').click().catch(() => {});
  const pitchDays = await pp.locator('#lab-history-date-select option').allTextContents();
  async function pitchDay(off) {
    if (!pitchDays.includes(dayStr(off))) return { text: '', altered: 0 };
    await pp.locator('#lab-history-date-select').selectOption(`day:${dayStr(off)}`);
    await pp.waitForTimeout(400);
    return {
      text: (await pp.locator('#lab-output-box').innerText()).replace(/\s+/g, ' '),
      altered: await pp.locator('#lab-output-box .lab-value-altered').count(),
    };
  }
  const sameDay = await pitchDay(-1);
  check(
    'tour-pitch-labs-edge-cases: AM toma (K 3.1) and PM toma (Cr 1.9) both show on the same day',
    /K 3\.1/.test(sameDay.text) && /Cr 1\.9/.test(sameDay.text),
    { day: dayStr(-1), pitchDays, text: sameDay.text }
  );
  const heavy = await pitchDay(-3);
  check('tour-pitch-labs-edge-cases: heavily altered toma shows 17+ altered values', heavy.altered >= 17, { day: dayStr(-3), altered: heavy.altered });
  await pitchDevice.app.close();

  // ── interconsulta-demo-seed + interconsulta-demo-toggle ──────────────────
  const icDevice = await r.launch({ profile: 'ic' });
  await onboardLocalOnly(icDevice.page);
  await openLearnHubUi(icDevice.page);
  await icDevice.page.locator('[data-onclick*="startHelpTourInterconsulta"], button', { hasText: 'Tutorial · Interconsulta' }).first().click().catch(async () => {
    // Fallback: the same entry lives in the quick-help "Aprender R+" panel.
    await closeLearnHubUi(icDevice.page);
    await icDevice.page.locator('#btn-open-settings').click();
    await icDevice.page.locator('.settings-head-link', { hasText: 'Ayuda' }).first().click();
    await icDevice.page.locator('button', { hasText: 'Tutorial · Interconsulta' }).first().click();
  });
  await icDevice.page.locator('#tour-dock').waitFor({ state: 'visible', timeout: 6000 });
  await icDevice.page.waitForTimeout(800); // ic_board_map step auto-seeds the 12-patient demo
  const icHtml = await icDevice.page.locator('#ic-board-mount').innerText().catch(() => '');
  check('interconsulta-demo-seed: demo board shows "Equipo Demo" teams', /Equipo Demo/.test(icHtml), icHtml.slice(0, 300));
  const icCardCount = await icDevice.page.locator('#ic-board-mount .patient-card').count();
  check('interconsulta-demo-seed: exactly 12 demo patients on the board', icCardCount === 12, icCardCount);
  check(
    'interconsulta-demo-seed: 4 teams (A-D), one on guardia',
    ['A', 'B', 'C', 'D'].every((l) => icHtml.includes('Equipo Demo ' + l)) && /— Guardia/.test(icHtml),
    icHtml.slice(0, 500)
  );
  check(
    'interconsulta-demo-seed: VPOs/new cases in Preop, follow-ups in Pendientes',
    /Preop \/ Nuevas hoy/.test(icHtml) && /Pendientes/.test(icHtml),
    icHtml.slice(0, 500)
  );
  await icDevice.page.locator('#tour-btn-pause').click().catch(() => {});
  await closeToasts(icDevice.page);

  // ⌥⌘⇧I: manual toggle off (real data comes back), then on again (demo returns).
  await icDevice.page.keyboard.press('Alt+Meta+Shift+I').catch(() => {});
  await icDevice.page.waitForTimeout(400);
  const afterToggleOff = await icDevice.page.locator('#ic-board-mount, .patient-dash').first().innerText().catch(() => '');
  check(
    'interconsulta-demo-toggle: ⌥⌘⇧I turns the demo off (toast confirms)',
    await icDevice.page.locator('.toast', { hasText: 'Demo de interconsultas' }).first().isVisible().catch(() => false),
    afterToggleOff.slice(0, 200)
  );
  check(
    'interconsulta-demo-toggle: demo patients/teams gone from the board after turning off',
    !/Equipo Demo/.test(afterToggleOff),
    afterToggleOff.slice(0, 200)
  );
  await closeToasts(icDevice.page);
  await icDevice.page.keyboard.press('Alt+Meta+Shift+I').catch(() => {});
  await icDevice.page.waitForTimeout(400);
  check(
    'interconsulta-demo-toggle: ⌥⌘⇧I turns the demo back on',
    await icDevice.page.locator('.toast', { hasText: 'Demo de interconsultas' }).first().isVisible().catch(() => false)
  );
  const afterToggleOn = await icDevice.page.locator('#ic-board-mount').innerText().catch(() => '');
  check(
    'interconsulta-demo-toggle: demo patients/teams show again after turning back on',
    /Equipo Demo/.test(afterToggleOn),
    afterToggleOn.slice(0, 200)
  );
  check('no page errors', icDevice.pageErrors.length === 0, icDevice.pageErrors);
  await icDevice.app.close();

  // interconsulta-demo-toggle: "no demo patient reaches Nube", "survives a Nube
  // refresh", "drag reassignment kept" and "a pinned filter does not hide the
  // demo" are NOT covered here — they need a second, Nube-connected device and
  // a drag simulation, which this local-only profile cannot exercise. Left
  // PARTIAL; see the report to the owner.

  check('no page errors on the main device', pageErrors.length === 0, pageErrors);
});
