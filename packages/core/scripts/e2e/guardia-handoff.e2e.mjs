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
 *       (found: the controls were never rendered; now pills in the markers block)
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
import { createRun, dismissLearnHub, closeToasts, pasteAndSave, openPatient, repoRoot, goArea } from './harness.mjs';
import { startWorker, nubeDevices, onboardNube, openNubeView, patientVisible, until, BASE } from './nube-worker.mjs';
import { fullLabs } from './some-fixtures.mjs';
import path from 'node:path';

const { activeCycleLetterForDate } = await import(path.join(repoRoot, 'packages/core/lib/clinical-scope/cycle-letters.mjs'));

const tag = Date.now().toString(36).slice(-6);
const R2 = { username: `demo_r2_${tag}`, name: 'Dr. Demo Día', rank: 'R2' };
const R1 = { username: `demo_r1_${tag}`, name: 'Dra. Demo Noche', rank: 'R1' };
const P1 = { exp: '7000521-1', name: 'DEMO ENTREGA UNO', room: '410' };
const P2 = { exp: '7000522-2', name: 'DEMO ENTREGA DOS', room: '409' };
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
/** Open the handoff; `soporteOpen` (out) reports whether «Soporte · Signos vitales» was open before the helper force-opens every details. */
async function openHandoff(page, p, out = {}) {
  await closeToasts(page);
  await card(page, p).click();
  const m = page.locator('#entrega-modal');
  await m.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(800);
  out.soporteOpen = await m.locator('details.entrega-proc-details', { hasText: 'Soporte' }).first().evaluate((e) => e.open);
  await m.locator('details.entrega-proc-details').evaluateAll((els) => els.forEach((e) => { e.open = true; }));
  return m;
}
/** Freeze `new Date()` / Date.now() in the renderer (null restores the real clock). */
const setNow = (page, iso) => page.evaluate((v) => {
  const w = window;
  w.__RealDate ||= w.Date;
  const R = w.__RealDate;
  if (!v) { w.Date = R; return; }
  const t = new R(v).getTime();
  w.Date = class extends R { constructor(...a) { if (a.length) super(...a); else super(t); } static now() { return t; } };
}, iso);
const ownClose = async (m) => { await m.locator('#btn-entrega-cancel').click(); await m.waitFor({ state: 'hidden', timeout: 10000 }); };
const procText = (m) => m.locator('#entrega-proc-list').textContent();

await r.finish('Guardia handoff: R2 → on-call R1 over Nube, both ways, restart', async () => {
  check('local Worker answers /ping', await startWorker(), BASE);

  // ── Sign-up, team, and tonight's on-call letter ───────────────────────
  const A = await launchDevice('a', 3791);
  await onboardNube(A.page, R2);
  const B = await launchDevice('b', 3792);
  await onboardNube(B.page, R1);
  await A.page.getByRole('button', { name: 'Abrir Mi rotación' }).click();
  await A.page.locator('#btn-clinical-team-create-open').click();
  await A.page.locator('#clinical-team-create-name').fill('EQUIPO DEMO GUARDIA');
  await A.page.locator('#clinical-team-create-form [type="submit"]').click();
  await B.page.getByRole('button', { name: 'Abrir Mi rotación' }).click();
  const joinBtn = B.page.getByRole('button', { name: 'Unirme' });
  check('R1 sees the R2\'s team through Nube', await until(() => joinBtn.isVisible(), 20000));
  await joinBtn.click();
  await B.page.waitForTimeout(1500);
  // Joining closes the panel; reopen Equipo for «Mi ciclo».
  await closeToasts(B.page);
  await openNubeView(B.page, 'equipo');

  const letter = activeCycleLetterForDate('Sala', 'R1', new Date());
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
    await goArea(d.page, 'lab');
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
  check('R2 Guardia census lists both patients',
    await until(async () => (await card(A.page, P1).count()) === 1 && (await card(A.page, P2).count()) === 1, 15000));
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
  const hsum = () => m.locator('#entrega-handoff-summary').textContent();
  check('handoff summary line reads «Vasopresor: Nore 0.05 mcg/kg/min»', /Vasopresor: Nore 0\.05 mcg\/kg\/min/.test(await hsum()), await hsum());
  await m.locator('#entrega-vaso-agent').selectOption('vasopresina');
  check('Vasopresina forces 0.03 with the fixed UI/min unit (mcg chips hidden)',
    (await m.locator('#entrega-vaso-dose').inputValue()) === '0.03' &&
    (await m.locator('[data-vaso-unit-fixed]').isVisible()) && (await m.locator('[data-vaso-unit-fixed]').textContent()) === 'UI/min' &&
    !(await m.locator('[data-vaso-unit-chips]').isVisible()));
  check('handoff summary line reads «Vasopresor: Vasopresina 0.03 UI/min»', /Vasopresor: Vasopresina 0\.03 UI\/min/.test(await hsum()), await hsum());
  await m.locator('#entrega-vaso-agent').selectOption('norepinefrina');
  check('back to Norepinefrina: 0.05 mcg/kg/min again',
    (await m.locator('#entrega-vaso-dose').inputValue()) === '0.05' && (await m.locator('.entrega-vaso-unit-pill.is-selected').textContent()) === 'mcg/kg/min');

  await m.locator('.guardia-marks-btn[data-value="no"]').click();
  await m.locator('label.entrega-check-pill', { hasText: 'Negativas firmadas' }).click();
  await m.locator('#entrega-handoff-notes').fill(NOTE1);
  await m.locator('#btn-entrega-add-proc').click();
  await m.locator('[data-action="add-item"]').click(); // empty label: must be refused
  await until(() => A.page.locator('.toast').count().then((n) => n > 0), 4000);
  const emptyLabelToast = await A.page.locator('.toast').allInnerTexts();
  const emptyLabelInvalid = await m.locator('#entrega-proc-label').getAttribute('aria-invalid');
  check('empty procedure label toasts and marks the field invalid instead of adding a blank item',
    emptyLabelToast.some((t) => t.includes('Indica la etiqueta del procedimiento')) && emptyLabelInvalid === 'true',
    { toasts: emptyLabelToast, ariaInvalid: emptyLabelInvalid, procCount: await m.locator('.entrega-proc-card').count() });
  check('empty label adds no procedure item', (await m.locator('.entrega-proc-card').count()) === 0);
  const descId = await m.locator('#entrega-proc-label').getAttribute('aria-describedby');
  check('label field aria-describedby points at the visible error text',
    !!descId && (await m.locator(`#${descId}`).isVisible()) &&
    /Indica la etiqueta del procedimiento/.test(await m.locator(`#${descId}`).textContent()), descId);
  await closeToasts(A.page);
  await m.locator('#entrega-proc-label').fill('TAC tórax');
  await m.locator('select[name="entrega-proc-hour"]').selectOption('22');
  await m.locator('select[name="entrega-proc-minute"]').selectOption('00');
  await m.locator('label.entrega-check-pill', { hasText: 'Consentimiento' }).click();
  await m.locator('[data-action="add-item"]').click();
  check('a valid add leaves no stale invalid state (no aria-invalid, no error text)',
    (await m.locator('[aria-invalid="true"], .field-invalid-msg').count()) === 0);
  await m.locator('label.entrega-freq-mode-pill', { hasText: 'Intervalo' }).click();
  await m.locator('.entrega-freq-chip[data-freq-hours="2"]').click();
  await r.shot(A.page, 'r2-p1-handoff-filled');
  await m.locator('#btn-entrega-save').click();
  check('R2: «Entrega registrada.»', await until(() => A.page.locator('.toast', { hasText: 'Entrega registrada' }).isVisible(), 10000));
  await m.waitFor({ state: 'hidden', timeout: 10000 });
  check('R2 census card shows 🚫 (No reanimar)', await until(async () => (await card(A.page, P1).textContent()).includes('🚫'), 10000));

  // Sender reopens their own handoff: it must still be filled in.
  const p1Info = {};
  m = await openHandoff(A.page, P1, p1Info);
  check('R2 reopens P1 (saved Vasopresor): «Soporte · Signos vitales» is open', p1Info.soporteOpen === true);
  check('R2 reopens P1: notes and TAC tórax still there',
    (await m.locator('#entrega-handoff-notes').inputValue()) === NOTE1 && (await procText(m)).includes('TAC tórax'),
    { notes: await m.locator('#entrega-handoff-notes').inputValue(), procs: await procText(m) });
  await m.locator('#btn-entrega-cancel').click();
  await m.waitFor({ state: 'hidden' });

  // ── R2 hands P2 off: plain ────────────────────────────────────────────
  const p2Info = {};
  m = await openHandoff(A.page, P2, p2Info);
  check('P2 (no support): «Soporte · Signos vitales» starts closed', p2Info.soporteOpen === false);

  // Vitals plan modes (clock frozen at 22:00 so «hasta 07:00» is still ahead)
  await setNow(A.page, '2026-09-30T22:00:00');
  const vsum = () => m.locator('#entrega-vitals-summary').textContent();
  const modePill = (t) => m.locator('label.entrega-freq-mode-pill', { hasText: t });
  await modePill('Sin signos').click();
  check('vitals «Sin signos» (rutina): summary says no vitals in interno, routine hint shown',
    /sin signos en interno/i.test(await vsum()) && (await m.locator('#entrega-freq-routine-hint').isVisible()), await vsum());
  await modePill('Por turno').click();
  await m.locator('.entrega-freq-chip[data-freq-shift="2"]').click();
  check('vitals «Por turno» 2×: summary says «2× por turno»', /2× por turno/.test(await vsum()), await vsum());
  await modePill('Intervalo').click();
  await m.locator('.entrega-freq-chip[data-freq-hours="4"]').click();
  check('vitals «Intervalo» chip 4 h: summary says «cada 4 h»', /cada 4 h/.test(await vsum()), await vsum());
  await m.locator('#entrega-vitals-hours').fill('3');
  check('vitals custom 3 h in the hours box: summary says «cada 3 h»', /cada 3 h/.test(await vsum()), await vsum());
  const untilPanel = m.locator('#entrega-freq-interval-panel');
  await untilPanel.locator('label.entrega-freq-until-toggle').click();
  await untilPanel.locator('select[name="entrega-vitals-until-hour-interval"]').selectOption('07');
  await untilPanel.locator('select[name="entrega-vitals-until-minute-interval"]').selectOption('05');
  check('vitals until 07 h + 05 min: summary says «hasta 07:05» (zero-padded)', /hasta 07:05/.test(await vsum()), await vsum());
  await untilPanel.locator('select[name="entrega-vitals-until-minute-interval"]').selectOption('00');
  check('vitals until 07:00 in the evening: still active, «hasta 07:00»', /cada 3 h · hasta 07:00/.test(await vsum()), await vsum());
  await setNow(A.page, '2026-09-30T08:00:00');
  await untilPanel.locator('select[name="entrega-vitals-until-minute-interval"]').selectOption('05');
  await untilPanel.locator('select[name="entrega-vitals-until-minute-interval"]').selectOption('00');
  check('vitals until 07:00 seen at 08:00: «Finalizado (07:00)»', /finalizado \(07:00\)/.test(await vsum()), await vsum());
  await setNow(A.page, null);
  await m.locator('label.entrega-check-pill:has([data-vital-metric="fc"])').click();
  await m.locator('label.entrega-check-pill:has([data-vital-metric="sat"])').click();
  const wantMetrics = await m.locator('[data-vital-metric]').evaluateAll((els) => els.filter((e) => e.checked).map((e) => e.nextElementSibling.textContent).join(', '));
  check('vitals summary lists the ticked metrics in the panel order', (await vsum()).startsWith(`${wantMetrics} · `) && !/FC/.test(wantMetrics), { want: wantMetrics, got: await vsum() });

  // Marks and support toggles
  await m.locator('.guardia-marks-group[data-mark="guardiaPronostico"] .guardia-marks-btn[data-value="good"]').click();
  const vasoPill = m.locator('[data-handoff-card="vasopressor"] label.entrega-check-pill', { hasText: 'Vasopresor' });
  await vasoPill.click();
  await vasoPill.click();

  // The R2 is diurno: it may delete its own base (lockedBase) item
  await m.locator('#btn-entrega-add-proc').click();
  await m.locator('#entrega-proc-label').fill('DEMO BASE DIURNO');
  await m.locator('[data-action="add-item"]').click();
  const baseCard = m.locator('.entrega-proc-card', { hasText: 'DEMO BASE DIURNO' });
  check('diurno R2 sees a delete button on its own base item', await baseCard.locator('[data-action="delete"]').isVisible());
  await baseCard.locator('[data-action="delete"]').click();
  const baseConfirm = A.page.locator('[role="dialog"]', { hasText: '¿Eliminar procedimiento?' });
  await baseConfirm.locator('[data-wb-confirm-ok]').click();
  await baseConfirm.waitFor({ state: 'hidden', timeout: 5000 });
  check('diurno R2 deleted its own base item', (await baseCard.count()) === 0);

  await m.locator('#entrega-handoff-notes').fill(NOTE2);
  await m.locator('#btn-entrega-save').click();
  await m.waitFor({ state: 'hidden', timeout: 10000 });
  check('R2 census card for P2 shows the «Pronóstico: Bueno» chip',
    await until(async () => (await card(A.page, P2).locator('.gct-chip[title="Pronóstico: Bueno"]').count()) === 1, 10000));
  m = await openHandoff(A.page, P2, p2Info);
  check('R2 reopens P2: Vasopresor ticked then unticked stays inactive, Soporte closed',
    !(await m.locator('[data-handoff-card="vasopressor"]').evaluate((e) => e.classList.contains('is-active'))) && p2Info.soporteOpen === false);
  await ownClose(m);
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
      /gct-card--critical/.test(await card(B.page, P1).getAttribute('class')) && /Crítico/.test(cardHtml),
      cardHtml.slice(0, 300));
    check('R1 census card shows the «Negativas firmadas» marker (NF) the R2 set',
      /patient-chip-symbol--negativas/.test(cardHtml), cardHtml.slice(0, 300));
  }
  m = await openHandoff(B.page, P1);
  await m.locator('#btn-entrega-cancel').click();
  await m.waitFor({ state: 'hidden', timeout: 10000 });
  {
    const names = await B.page.locator('#guardia-census-grid .gct-cell-name').evaluateAll((els) => els.map((e) => e.title));
    check('R1 census lists the critical P1 (room 410) before P2 (room 409): critical first, bed second',
      names.indexOf(P1.name) !== -1 && names.indexOf(P1.name) < names.indexOf(P2.name), names);
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
  check('the item is still listed while the confirm is open', (await tempCard.count()) === 1);
  await confirmModal.locator('[data-wb-confirm-cancel]').click();
  await confirmModal.waitFor({ state: 'hidden', timeout: 5000 });
  check('«Cancelar» in the confirm keeps the item', (await tempCard.count()) === 1);
  await tempCard.locator('[data-action="delete"]').click();
  await confirmModal.waitFor({ state: 'visible', timeout: 5000 });
  await confirmModal.locator('[data-wb-confirm-ok]').click();
  await confirmModal.waitFor({ state: 'hidden', timeout: 5000 });
  check('confirming the delete removes the item, the base item stays',
    (await tempCard.count()) === 0 && (await tacCard.count()) === 1);

  check('TAC tórax shows the «Consent» badge until it is authorized', /Consent/.test(await tacCard.textContent()));
  await tacCard.locator('input[data-flag="autorizado"]').check();
  check('ticking «Autorizado» clears the «Consent» badge', !/Consent/.test(await tacCard.textContent()), await tacCard.textContent());

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
  await B2.page.locator('#btn-open-settings').waitFor({ state: 'visible', timeout: 30000 });
  await dismissLearnHub(B2.page);
  check('R1 restarted: both handoffs still there', await until(async () => (await handoffs(B2.page)).length === 2, 15000));

  // ── Cambiar sala forces the Step 1 picker instead of re-deriving the home sala ──
  await enterGuardia(B2.page);
  await B2.page.locator('#guardia-btn-cambiar-sala').click();
  const salaAfterCambiar = await B2.page.evaluate(() => globalThis.localStorage.getItem('guardia.sala'));
  check('Cambiar sala clears the declared sala and shows the «Activar guardia» picker',
    salaAfterCambiar === null && await B2.page.locator('#guardia-census-grid', { hasText: 'Activar guardia' }).isVisible(),
    salaAfterCambiar);
  const picker = B2.page.locator('#guardia-sala-picker-select');
  const salaOpts = await picker.locator('option').evaluateAll((os) => os.map((o) => o.value));
  check('picker says the profile has no sala, and preselects one of the offered salas',
    /Tu perfil no tiene sala/.test(await B2.page.locator('.guardia-sala-picker').textContent()) && salaOpts.includes(await picker.inputValue()),
    { salaOpts, value: await picker.inputValue() });

  // A sala other than the team's: «Empezar guardia» saves it and the census narrows to it (empty)
  const otherSala = salaOpts[salaOpts.length - 1]; // 'Eme': not the team's sala
  await picker.selectOption(otherSala);
  await B2.page.locator('#guardia-sala-picker-start').click();
  const emptyCard = B2.page.locator('#guardia-census-grid .guardia-census-empty');
  await emptyCard.waitFor({ state: 'visible', timeout: 15000 });
  const savedSala = () => B2.page.evaluate(() => JSON.parse(globalThis.localStorage.getItem('guardia.sala') || 'null')?.sala || null);
  check('«Empezar guardia» saves the picked sala and the census shows the 0-patient state (filter off, no button)',
    (await savedSala()) === otherSala && /No hay pacientes visibles/.test(await emptyCard.textContent()) &&
    (await B2.page.locator('#btn-guardia-census-show-all').count()) === 0,
    { saved: await savedSala(), text: await emptyCard.textContent() });
  // ponytail: the «Censo: solo entregados» filter has no rendered control (#btn-guardia-mode-toggle is never in the DOM), so the filter-on empty state and «Ver censo completo» cannot be reached.

  // The picked sala survives a restart (23 h old is still valid) and expires after 24 h
  const ageSala = (page, hours) => page.evaluate((ms) => {
    const o = JSON.parse(globalThis.localStorage.getItem('guardia.sala'));
    o.at = new Date(Date.now() - ms).toISOString();
    globalThis.localStorage.setItem('guardia.sala', JSON.stringify(o));
  }, hours * 3600000);
  await ageSala(B2.page, 23);
  await B2.app.close();
  const B3 = await launchDevice('b', 3792);
  await B3.page.locator('#btn-open-settings').waitFor({ state: 'visible', timeout: 30000 });
  await dismissLearnHub(B3.page);
  await closeToasts(B3.page);
  await B3.page.locator('#header-mode-seg').click();
  await B3.page.locator('#header-mode-seg .header-mode-seg-btn[data-mode="guardia"]').click();
  check('after restart the 23 h old sala is still honored (census still narrowed to it)',
    await B3.page.locator('#guardia-census-grid .guardia-census-empty').waitFor({ state: 'visible', timeout: 20000 }).then(() => true, () => false));
  await ageSala(B3.page, 25);
  await B3.page.reload();
  await B3.page.locator('#btn-open-settings').waitFor({ state: 'visible', timeout: 30000 });
  await enterGuardia(B3.page).catch(() => {});
  check('a 25 h old sala has expired: the census is back to the team\'s sala',
    (await card(B3.page, P1).count()) === 1);

  // ── Orphan entregas: the R1 deletes P2 locally; its handoff stays on the guardia list ──
  await closeToasts(B3.page);
  await B3.page.locator('#header-mode-seg').click();
  await B3.page.locator('#header-mode-seg .header-mode-seg-btn[data-mode="sala"]').click();
  await goArea(B3.page, 'lab');
  const p2Card = B3.page.locator('.patient-card, [class*=patient-card]', { has: B3.page.locator(`.p-name[title*="${P2.exp}"]`) }).first();
  await p2Card.hover();
  await p2Card.locator('.btn-delete-card').click();
  const delOk = B3.page.locator('.wb-confirm-modal [data-wb-confirm-ok]');
  if (await delOk.isVisible({ timeout: 1500 }).catch(() => false)) await delOk.click();
  check('R1 deleted P2 locally', await until(async () => !(await patientVisible(B3.page, P2)), 10000));
  await enterGuardia(B3.page);
  const strip = B3.page.locator('#guardia-orphan-entregas-strip');
  check('the orphan strip lists the handoff of the deleted patient',
    await until(async () => (await strip.locator('.guardia-orphan-row').count()) === 1, 15000),
    { strip: await strip.textContent(), db: await api(B3.page, 'dbGuardiaCensus', {}).then((x) => ({ g: x?.guardias?.length, o: x?.orphans?.length })) });
  await strip.locator('.guardia-orphan-open-btn').click();
  const om = B3.page.locator('#entrega-modal');
  await om.waitFor({ state: 'visible', timeout: 15000 });
  await B3.page.waitForTimeout(800);
  check('the orphan handoff opens with its notes but no Esfuerzo/Pronóstico mark groups',
    (await om.locator('#entrega-handoff-notes').inputValue()) === NOTE2 && (await om.locator('.guardia-marks-group').count()) === 0,
    { marks: await om.locator('.guardia-marks-group').count() });
  await ownClose(om);
  await strip.locator('.guardia-orphan-delete-btn').click();
  const orphanConfirm = B3.page.locator('[role="dialog"]', { hasText: 'liberar la entrega' });
  await orphanConfirm.waitFor({ state: 'visible', timeout: 5000 });
  await orphanConfirm.locator('[data-wb-confirm-cancel]').click();
  await orphanConfirm.waitFor({ state: 'hidden', timeout: 5000 });
  check('«Cancelar» on the orphan delete keeps the row', (await strip.locator('.guardia-orphan-row').count()) === 1);
  await strip.locator('.guardia-orphan-delete-btn').click();
  await orphanConfirm.waitFor({ state: 'visible', timeout: 5000 });
  await orphanConfirm.locator('[data-wb-confirm-ok]').click();
  check('confirming the orphan delete releases the handoff and hides the strip',
    await until(async () => (await strip.locator('.guardia-orphan-row').count()) === 0, 15000));

  check('no uncaught page errors on either device', !A.pageErrors.length && !B.pageErrors.length && !B2.pageErrors.length && !B3.pageErrors.length,
    [...A.pageErrors, ...B.pageErrors, ...B2.pageErrors, ...B3.pageErrors].slice(0, 5));
  await A.app.close();
  await B3.app.close();
});
