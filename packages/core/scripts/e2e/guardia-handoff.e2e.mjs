#!/usr/bin/env node
/* global window */
/**
 * E2E: Guardia handoff (entrega) between two desktop devices over Nube — the
 * day R2 hands two patients to the R1 on call tonight, the R1 reads them on
 * their own computer, updates a pending study, and the R2 sees the update.
 * Local copy of the real sync Worker only (nube-worker.mjs). Synthetic DEMO
 * patients and made-up expedientes only.
 *
 * Ways it can go wrong (each one is a check below):
 *   Who is on call
 *     - the R1's «Mi ciclo» letter is reverted by the next sync (toast says
 *       saved, the select shows the old letter)
 *     - the R2's device never learns the R1's letter, so nobody is on call
 *     - the handoff goes to the wrong person (the sender, a hidden R1 picker)
 *   Sending
 *     - «Guardar paciente» does not save, or saves without the notes / study /
 *       vitals plan / «No reanimar» mark
 *     - the sender reopens their own handoff and sees it blank (and a second
 *       «Guardar» would overwrite it)
 *   Handoff panel chrome
 *     - the nav header's truncated patient name loses its full-name tooltip
 *     - the Esfuerzo/Pronóstico mark groups are missing, or a mark shows
 *       pre-pressed before anyone picked one
 *     - «Crítico» / «Negativas firmadas» / «Show» have no control to set them,
 *       so isGuardiaChipCritical / entregaChipMarkerIds can never turn on
 *     - checking Vasopresor doesn't reveal its dose fields or reset the card
 *       to inactive when unchecked, or doesn't autofill the norepinefrina
 *       default dose/unit
 *   Procedures
 *     - a procedure can be added with a blank label, or the toast/invalid
 *       marker on the label field never appears
 *     - a base (lockedBase) procedure created by the day team shows a delete
 *       button to the on-call guardia, or a guardia's own item shows none
 *     - deleting a procedure skips the destructive confirm, or removes it
 *       before the confirm is accepted
 *   Receiving
 *     - the handoff never reaches the R1's device, or arrives without its notes,
 *       study, vitals plan or mark
 *     - a second patient's handoff is lost or mixed with the first
 *     - an active vasopresor doesn't show as a critical accent on the
 *       receiving device's census card
 *   Both ways
 *     - the R1 marks the study «Agendado»; the R2 never sees it
 *   Restart
 *     - the R1 restarts and the handoffs are gone
 *   Throughout
 *     - an uncaught page error on either device
 */
import { createRun, dismissLearnHub, closeToasts, pasteAndSave, openPatient, repoRoot } from './harness.mjs';
import { startWorker, nubeDevices, onboardNube, patientVisible, until, BASE } from './nube-worker.mjs';
import { fullLabs } from './some-fixtures.mjs';
import path from 'node:path';

const { activeCycleLetterForDate } = await import(path.join(repoRoot, 'packages/core/lib/clinical-scope/cycle-letters.mjs'));

const tag = Date.now().toString(36).slice(-6);
const R2 = { username: `demo_r2_${tag}`, name: 'Dr. Demo Día', rank: 'R2' };
const R1 = { username: `demo_r1_${tag}`, name: 'Dra. Demo Noche', rank: 'R1' };
const P1 = { exp: '7000521-1', name: 'DEMO ENTREGA UNO', room: '410' };
const P2 = { exp: '7000522-2', name: 'DEMO ENTREGA DOS', room: '411' };
const NOTE1 = 'DEMO: vigilar diuresis y potasio';
const NOTE2 = 'DEMO: estable, alta probable';

const r = createRun('guardia-handoff');
const { check } = r;
const launchDevice = nubeDevices(r);

const api = (page, method, arg) => page.evaluate(([m, a]) => (window.rplusDb || window.electronAPI)[m](a), [method, arg]);
/** Every Active handoff in this device's DB (unfiltered). */
const handoffs = async (page) => (await api(page, 'dbGuardiaCensus', {}))?.guardias || [];
const myMember = async (page, username) => {
  const res = await api(page, 'dbClinicalTeamsList');
  const teams = Array.isArray(res) ? res : res?.teams || [];
  for (const t of teams) for (const m of t.members || []) if (m.username === username) return m;
  return null;
};

async function enterGuardia(page) {
  await closeToasts(page);
  await page.locator('#header-mode-seg').click();
  await page.locator('#header-mode-seg .header-mode-seg-btn[data-mode="guardia"]').click();
  await page.locator('#guardia-census-grid .gct-card').first().waitFor({ timeout: 20000 });
}
const card = (page, p) => page.locator('#guardia-census-grid .gct-card', { has: page.locator(`.gct-cell-name[title="${p.name}"]`) });
async function openHandoff(page, p) {
  await closeToasts(page);
  await card(page, p).click();
  const m = page.locator('#entrega-modal');
  await m.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(800);
  await m.locator('details.entrega-proc-details').evaluateAll((els) => els.forEach((e) => { e.open = true; }));
  return m;
}
const procText = (m) => m.locator('#entrega-proc-list').textContent();

await r.finish('Guardia handoff: R2 → on-call R1 over Nube, both ways, restart', async () => {
  check('local Worker answers /ping', await startWorker(), BASE);

  // ── Sign-up, team, and tonight's on-call letter ───────────────────────
  const A = await launchDevice('a', 3791);
  await onboardNube(A.page, R2);
  const B = await launchDevice('b', 3792);
  await onboardNube(B.page, R1);
  await A.page.getByRole('button', { name: 'Ejemplo Modelo casoba' }).click();
  await A.page.locator('#btn-clinical-team-create-open').click();
  await A.page.locator('#clinical-team-create-name').fill('EQUIPO DEMO GUARDIA');
  await A.page.getByRole('button', { name: 'Crear equipo' }).click();
  await B.page.getByRole('button', { name: 'Ejemplo Modelo casoba' }).click();
  const joinBtn = B.page.getByRole('button', { name: 'Unirme' });
  check('R1 sees the R2\'s team through Nube', await until(() => joinBtn.isVisible(), 20000));
  await joinBtn.click();
  await B.page.waitForTimeout(1500);

  const letter = activeCycleLetterForDate('Sala', 'R1', new Date());
  await B.page.locator('summary', { hasText: 'Detalles del equipo' }).first().click();
  await B.page.locator('summary', { hasText: 'Mi ciclo en este equipo' }).first().click();
  await B.page.locator('select[id^="clinical-my-cycle-"]').first().selectOption(letter);
  await B.page.locator('.clinical-teams-my-cycle-form button[type=submit]').first().click();
  await B.page.waitForTimeout(4000); // the save pulls, merges and pushes clinicalOps
  check(`R1: «Mi ciclo» ${letter} (on call today) is kept after the sync`,
    (await myMember(B.page, R1.username))?.sub_area_fraction === letter,
    await myMember(B.page, R1.username));
  await r.shot(B.page, 'r1-cycle-saved');
  check(`R2's device learns the R1's letter ${letter}`,
    await until(async () => (await myMember(A.page, R1.username))?.sub_area_fraction === letter, 30000),
    await myMember(A.page, R1.username));

  for (const d of [A, B]) {
    await closeToasts(d.page);
    await d.page.locator('#btn-connection-dropdown-close').click().catch(() => {});
    await d.page.keyboard.press('Escape');
    await dismissLearnHub(d.page);
    await d.page.locator('#apptab-lab').click();
  }

  // ── Two patients on the R2's device, both reach the R1 ────────────────
  await pasteAndSave(A.page, fullLabs(P1, 'Sep 23 2026 8:00AM'));
  await pasteAndSave(A.page, fullLabs(P2, 'Sep 23 2026 8:30AM'));
  await openPatient(A.page, P1);
  await openPatient(A.page, P2);
  check('both patients reach the R1\'s device',
    await until(async () => (await patientVisible(B.page, P1)) && (await patientVisible(B.page, P2)), 45000));

  // ── R2 hands P1 off: critical details ─────────────────────────────────
  await enterGuardia(A.page);
  check('R2 Guardia census lists both patients', (await card(A.page, P1).count()) === 1 && (await card(A.page, P2).count()) === 1);
  let m = await openHandoff(A.page, P1);
  const cover = await m.locator('#entrega-covering-user').evaluate((e) => e.selectedOptions[0]?.textContent || '');
  check('handoff goes to the R1 on call (not the sender)', cover.includes(R1.username), cover);

  // ── Handoff panel chrome: nav tooltip, mark groups, dead critical controls ──
  const navName = m.locator('#entrega-modal-nav-name');
  const navNameInfo = await navName.evaluate((e) => ({ title: e.title, text: e.textContent }));
  check('nav header title mirrors the truncated name in full (CSS-truncation tooltip)',
    navNameInfo.title === navNameInfo.text && navNameInfo.text.includes(P1.name),
    navNameInfo);
  check('handoff panel offers both Esfuerzo terapéutico and Pronóstico mark groups',
    (await m.locator('.guardia-marks-group[data-mark="guardiaEsfuerzo"] .guardia-marks-btn').count()) > 0 &&
    (await m.locator('.guardia-marks-group[data-mark="guardiaPronostico"] .guardia-marks-btn').count()) > 0);
  check('no mark is pre-pressed before the sender picks one',
    (await m.locator('.guardia-marks-btn[aria-pressed="true"]').count()) === 0);
  check('handoff panel exposes a control for «Crítico» / «Negativas firmadas» / «Show» (drives isGuardiaChipCritical / entregaChipMarkerIds)',
    (await m.locator('#entrega-critical, #entrega-signed-refusal, #entrega-show').count()) > 0,
    'none of #entrega-critical / #entrega-signed-refusal / #entrega-show exist in the DOM — read by ' +
    'readEntregaCriticalFromHandoff (entrega-modal-handoff.mjs:332) and readHandoffFieldsFromDom (:158-159) ' +
    'but never rendered by buildHandoffPanelMarkup/buildClinicalStatusMarkup, so is_critical/signedRefusal/show ' +
    'can never be set true from the UI');

  const vasoCard = m.locator('[data-handoff-card="vasopressor"]');
  const vasoDetail = m.locator('[data-handoff-detail="vasopressor"]');
  check('Vasopresor card starts inactive with its dose fields hidden',
    !(await vasoCard.evaluate((e) => e.classList.contains('is-active'))) &&
    (await vasoDetail.evaluate((e) => e.classList.contains('is-hidden'))));
  await vasoCard.locator('label.entrega-check-pill', { hasText: 'Vasopresor' }).click();
  check('checking Vasopresor activates the card and reveals the dose fields',
    (await vasoCard.evaluate((e) => e.classList.contains('is-active'))) &&
    !(await vasoDetail.evaluate((e) => e.classList.contains('is-hidden'))));
  check('Norepinefrina default infusion is autofilled on activation (0.05 mcg/kg/min)',
    (await m.locator('#entrega-vaso-dose').inputValue()) === '0.05' &&
    (await m.locator('.entrega-vaso-unit-pill.is-selected').textContent()) === 'mcg/kg/min');

  await m.locator('.guardia-marks-btn[data-value="no"]').click();
  await m.locator('#entrega-handoff-notes').fill(NOTE1);
  await m.locator('#btn-entrega-add-proc').click();
  await m.locator('[data-action="add-item"]').click(); // empty label: must be refused
  await until(() => A.page.locator('.toast').count().then((n) => n > 0), 4000);
  const emptyLabelToast = await A.page.locator('.toast').allInnerTexts();
  const emptyLabelInvalid = await m.locator('#entrega-proc-label').getAttribute('aria-invalid');
  check('empty procedure label toasts and marks the field invalid instead of adding a blank item',
    emptyLabelToast.some((t) => t.includes('Indica la etiqueta del procedimiento')) && emptyLabelInvalid === 'true',
    { toasts: emptyLabelToast, ariaInvalid: emptyLabelInvalid, procCount: await m.locator('.entrega-proc-card').count() });
  await closeToasts(A.page);
  await m.locator('#entrega-proc-label').fill('TAC tórax');
  await m.locator('select[name="entrega-proc-hour"]').selectOption('22');
  await m.locator('select[name="entrega-proc-minute"]').selectOption('00');
  await m.locator('label.entrega-check-pill', { hasText: 'Consentimiento' }).click();
  await m.locator('[data-action="add-item"]').click();
  await m.locator('label.entrega-freq-mode-pill', { hasText: 'Intervalo' }).click();
  await m.locator('.entrega-freq-chip[data-freq-hours="2"]').click();
  await r.shot(A.page, 'r2-p1-handoff-filled');
  await m.locator('#btn-entrega-save').click();
  check('R2: «Entrega registrada.»', await until(() => A.page.locator('.toast', { hasText: 'Entrega registrada' }).isVisible(), 10000));
  await m.waitFor({ state: 'hidden', timeout: 10000 });
  check('R2 census card shows 🚫 (No reanimar)', await until(async () => (await card(A.page, P1).textContent()).includes('🚫'), 10000));

  // Sender reopens their own handoff: it must still be filled in.
  m = await openHandoff(A.page, P1);
  check('R2 reopens P1: notes and TAC tórax still there',
    (await m.locator('#entrega-handoff-notes').inputValue()) === NOTE1 && (await procText(m)).includes('TAC tórax'),
    { notes: await m.locator('#entrega-handoff-notes').inputValue(), procs: await procText(m) });
  await m.locator('#btn-entrega-cancel').click();
  await m.waitFor({ state: 'hidden' });

  // ── R2 hands P2 off: plain ────────────────────────────────────────────
  m = await openHandoff(A.page, P2);
  await m.locator('#entrega-handoff-notes').fill(NOTE2);
  await m.locator('#btn-entrega-save').click();
  await m.waitFor({ state: 'hidden', timeout: 10000 });
  await r.shot(A.page, 'r2-census-after-handoffs');

  // ── The R1 receives both ──────────────────────────────────────────────
  const r1Id = (await myMember(B.page, R1.username))?.user_id;
  check('R1 device holds both handoffs, both covered by the R1',
    await until(async () => { const g = await handoffs(B.page); return g.length === 2 && g.every((x) => x.covering_user_id === r1Id); }, 45000),
    (await handoffs(B.page)).map((g) => g.covering_user_id));
  await closeToasts(B.page);
  await enterGuardia(B.page);
  check('R1 census card shows 🚫 (No reanimar set by the R2)', await until(async () => (await card(B.page, P1).textContent()).includes('🚫'), 30000));
  {
    const cardHtml = await card(B.page, P1).innerHTML();
    check('R1 census card keeps the real bed (cuarto/cama), not «Cama —» (enrichPatientForGuardiaCard)',
      cardHtml.includes(`${P1.room} · 01`), cardHtml.slice(0, 200));
    check('R1 census card shows a critical indicator for the active vasopresor (isGuardiaChipCritical)',
      /critical|patient-chip-symbol/i.test(cardHtml),
      'guardia-census-table.mjs buildGuardiaCensusCardHtml/buildGuardiaCensusTableHtml never reads ' +
      'p.isCritical / p.entregaMarkers, even though enrichPatientForGuardiaCard (guardia-board-chrome.mjs:133-134) ' +
      'computes them — card html: ' + cardHtml.slice(0, 200));
  }
  m = await openHandoff(B.page, P1);
  check('R1 opens P1: sees the R2\'s notes', (await m.locator('#entrega-handoff-notes').inputValue()) === NOTE1);
  check('R1 opens P1: TAC tórax 22:00 with Consentimiento', await until(async () => /TAC tórax\s*22:00/.test(await procText(m)) && /Consent/.test(await procText(m)), 5000), await procText(m));
  check('R1 opens P1: vitals every 2 h', /cada 2 h/.test(await m.locator('#entrega-vitals-summary').textContent()));
  check('R1 opens P1: «No reanimar» is marked', await m.locator('.guardia-marks-btn[data-value="no"][aria-pressed="true"]').isVisible());
  await r.shot(B.page, 'r1-p1-received');

  // ── Procedures: base (lockedBase) items are protected from the on-call guardia ──
  const tacCard = m.locator('.entrega-proc-card', { hasText: 'TAC tórax' });
  check('the R2\'s base TAC tórax item shows no delete button to the R1 (canDeletePendienteItem: guardia + lockedBase)',
    (await tacCard.locator('[data-action="delete"]').count()) === 0);
  await m.locator('#btn-entrega-add-proc').click();
  await m.locator('#entrega-proc-label').fill('TEMP R1 ELIMINA');
  await m.locator('[data-action="add-item"]').click();
  const tempCard = m.locator('.entrega-proc-card', { hasText: 'TEMP R1 ELIMINA' });
  check('the R1\'s own (non-lockedBase) item shows a delete button', await tempCard.locator('[data-action="delete"]').isVisible());
  await tempCard.locator('[data-action="delete"]').click();
  const confirmModal = B.page.locator('[role="dialog"]', { hasText: '¿Eliminar procedimiento?' });
  await confirmModal.waitFor({ state: 'visible', timeout: 5000 });
  check('delete asks a destructive confirm naming the procedure, with an Eliminar button',
    (await confirmModal.locator('.wb-confirm-title').textContent()) === '¿Eliminar procedimiento?' &&
    /TEMP R1 ELIMINA/.test(await confirmModal.locator('.wb-confirm-message').textContent()) &&
    (await confirmModal.locator('[data-wb-confirm-ok].wb-btn-danger').textContent()) === 'Eliminar');
  await confirmModal.locator('[data-wb-confirm-ok]').click();
  await confirmModal.waitFor({ state: 'hidden', timeout: 5000 });
  check('confirming the delete removes the item, the base item stays',
    (await tempCard.count()) === 0 && (await tacCard.count()) === 1);

  // ── Both ways: the R1 schedules the TAC ───────────────────────────────
  await m.locator('.entrega-proc-card', { hasText: 'TAC tórax' }).locator('input[data-flag="agendado"]').check();
  await m.locator('#btn-entrega-save').click();
  await m.waitFor({ state: 'hidden', timeout: 10000 });
  m = await openHandoff(B.page, P2);
  check('R1 opens P2: its own notes, not P1\'s', (await m.locator('#entrega-handoff-notes').inputValue()) === NOTE2);
  await m.locator('#btn-entrega-cancel').click();
  const agendadoOn = async (page) => {
    const g = (await handoffs(page)).find((x) => String(x.pendientes_json).includes('TAC tórax'));
    return !!g && JSON.parse(g.pendientes_json).items.some((i) => i.label === 'TAC tórax' && i.agendado);
  };
  check('R1 device saved the TAC as «Agendado»', await until(() => agendadoOn(B.page), 5000), (await handoffs(B.page)).map((g) => g.assigned_at));
  const agendadoOnA = () => agendadoOn(A.page);
  check('R2 sees the TAC marked «Agendado» by the R1', await until(agendadoOnA, 45000), (await handoffs(A.page)).map((g) => g.assigned_at));
  m = await openHandoff(A.page, P1);
  check('R2 reopens P1: the Agendado box is ticked',
    await m.locator('.entrega-proc-card', { hasText: 'TAC tórax' }).locator('input[data-flag="agendado"]').isChecked());
  await r.shot(A.page, 'r2-sees-agendado');
  await m.locator('#btn-entrega-cancel').click();

  // ── Restart the R1 ────────────────────────────────────────────────────
  await B.app.close();
  const B2 = await launchDevice('b', 3792);
  await B2.page.locator('#apptab-lab').waitFor({ state: 'visible', timeout: 30000 });
  await dismissLearnHub(B2.page);
  check('R1 restarted: both handoffs still there', await until(async () => (await handoffs(B2.page)).length === 2, 15000));

  // ── Cambiar sala forces the Step 1 picker instead of re-deriving the home sala ──
  await enterGuardia(B2.page);
  await B2.page.locator('#guardia-btn-cambiar-sala').click();
  const salaAfterCambiar = await B2.page.evaluate(() => globalThis.localStorage.getItem('guardia.sala'));
  check('Cambiar sala clears the declared sala and shows the «Activar guardia» picker',
    salaAfterCambiar === null && await B2.page.locator('#guardia-census-grid', { hasText: 'Activar guardia' }).isVisible(),
    salaAfterCambiar);

  check('no uncaught page errors on either device', !A.pageErrors.length && !B.pageErrors.length && !B2.pageErrors.length,
    [...A.pageErrors, ...B.pageErrors, ...B2.pageErrors].slice(0, 5));
  await A.app.close();
  await B2.app.close();
});
