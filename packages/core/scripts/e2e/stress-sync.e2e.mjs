#!/usr/bin/env node
/* global window, document */
/**
 * E2E stress: Nube sync and bad timing between two devices (two profiles),
 * driven through the real Electron app against a LOCAL copy of the sync
 * Worker (nube-worker.mjs). Synthetic DEMO patients and made-up expedientes
 * only. Background: on 2026-09-17 a partial sync payload wiped Manejo /
 * estado actual for every patient — any data loss here is top severity.
 *
 * Ways it can go wrong (each one is a check below):
 *   Volume + odd names
 *     - some of 60+ patients (odd names too) never reach device B
 *     - a patient shows up twice on either device
 *   Big note
 *     - a 20 000-char eventualidad is cut, changed, or refused on the way to B
 *   Same patient, both devices at once
 *     - A and B add an eventualidad to the same patient at the same moment:
 *       one of the two is lost on either device
 *     - A and B edit estado actual (manejo por categoría) on the same patient
 *       at once: one side's edit is lost
 *   Offline, then reconnect
 *     - edits made on both devices while the Worker is down are lost, or only
 *       one side survives after reconnect
 *     - the Conexión status says «Nube al día» while changes are pending
 *   Fast double-click
 *     - a double-click on «Agregar» (eventualidad) saves the entry twice
 *     - a double-click on «Procesar receta» doubles the meds
 *   Switch patient during a save
 *     - an entry saved just before switching lands on the next patient
 *   Close the app during a save
 *     - an entry added right before close is gone after reopen, or never
 *       reaches B
 *   Team assignment change during sync (A, B in team 1; R4 device C makes team 2 and moves)
 *     - the R4 cannot make team 2 active, or never sees the patient
 *     - moving a patient to another team while B edits it loses B's edit
 *     - moving it back does not bring the patient (with all data) back to B
 *   Every scenario
 *     - A and B saved data differ once sync settles (per patient: name,
 *       eventualidades, estado actual, receta)
 *     - any field emptied that had content before
 *     - an uncaught page error on either device
 *
 * Artifact: e2e-artifacts/stress-sync/<run-id>/ (report.json, screenshots,
 * digests.json, console.json).
 *
 *   node scripts/e2e/stress-sync.e2e.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRun, dismissLearnHub, closeToasts, pasteAndSave, pasteAndProcess, openPatient } from './harness.mjs';
import { startWorker, stopWorker, nubeDevices, onboardNube, patientVisible, until } from './nube-worker.mjs';
import { fullLabs, header, TABLE } from './some-fixtures.mjs';

const tag = Date.now().toString(36).slice(-6);
const USER_A = { username: `demo_sa_${tag}`, name: 'Dr. Demo Sync Alfa' };
const USER_B = { username: `demo_sb_${tag}`, name: 'Dra. Demo Sync Bravo' };
const USER_C = { username: `demo_sc_${tag}`, name: 'Dr. Demo Sync Charlie', rank: 'R4' };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const d0 = new Date();
const TODAY = (h) => `${MON[d0.getMonth()]} ${d0.getDate()} ${d0.getFullYear()} ${h}:05AM`;
const DMY = `${String(d0.getDate()).padStart(2, '0')}/${String(d0.getMonth() + 1).padStart(2, '0')}/${d0.getFullYear()}`;
const bh = (hgb) => 'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE + `HGB\t\tA\t${hgb}\tg/dL\t12.20 - 18.10\n`;

const ODD = [
  'DEMO 😀 PACIENTE 🩺',
  'DEMO JOSÉ PEÑA MÜLLER',
  `DEMO O'BRIEN "EL"; DROP TABLE patients;--`,
  'DEMO <b>NEGRITA</b>',
  'DEMO Δ ΜΑΡΊΑ 测试',
].map((name, i) => ({ name, exp: `73000${String(i).padStart(2, '0')}-${i}`, room: String(500 + i) }));
const VOL = Array.from({ length: 60 }, (_, i) => ({ exp: `74${String(i).padStart(5, '0')}-${i % 10}`, name: `DEMO SYNC VOLUMEN ${i}`, room: String(100 + i) }));
const [PB, PC, PO, PD, PS1, PS2, PX, PT] = [
  ['BIG', 'NOTA GRANDE'], ['CON', 'CONCURRENTE'], ['OFF', 'FUERA DE LINEA'], ['DBL', 'DOBLE CLIC'],
  ['SW1', 'CAMBIO UNO'], ['SW2', 'CAMBIO DOS'], ['CLS', 'CIERRE'], ['TEAM', 'EQUIPO'],
].map(([k, n], i) => ({ key: k, exp: `75000${i}0-${i}`, name: `DEMO SYNC ${n}`, room: String(800 + i) }));
const FOCUS = [PB, PC, PO, PD, PS1, PS2, PX, PT];

// 20 000 chars, with accents and line breaks, easy to verify exactly. Upper case: eventualidades
// store clinical text in capitals by design (toClinicalHistoryText).
const BIG = Array.from({ length: 400 }, (_, i) => `L${String(i).padStart(3, '0')} nota demo ácido ñandú ${'x'.repeat(20)}`).join('\n').padEnd(20000, 'X').slice(0, 20000).toUpperCase();

const r = createRun('stress-sync');
const { check, shot } = r;
const launchDevice = nubeDevices(r);
const digests = {};

/** Saved (on-disk) state of one device, per patient, keyed by expediente. */
const digest = (page) =>
  page.evaluate(async () => {
    const b = (await window.electronAPI.dbClinicalLoadAll()).blobs;
    const J = (k) => { try { return JSON.parse(b[k] || 'null'); } catch { return null; } };
    const rec = J('medRecetaByPatient') || {};
    const out = {};
    const dup = [];
    for (const p of J('patients') || []) {
      if (!p || p.archived) continue;
      if (out[p.registro]) dup.push(p.registro);
      const ec = p.monitoreo?.estadoClinico || {};
      out[p.registro] = {
        name: p.nombre,
        ev: (p.eventualidades?.entries || []).map((e) => e.text).sort(),
        ec: Object.fromEntries(Object.entries(ec).filter(([, v]) => String(v || '').trim()).sort()),
        mm: Object.fromEntries(Object.entries(p.monitoreo?.manualMeds || {}).filter(([, v]) => v?.length).map(([k, v]) => [k, [...v].sort()]).sort()),
        meds: (rec[p.id]?.items || []).map((i) => i.nombreRaw).sort(),
      };
    }
    return { out, dup };
  });

/** Wait until both devices' saved data agree on `exps` (or every patient); return the last diff. */
async function settle(A, B, label, exps, timeout = 60000) {
  let last = null;
  const ok = await until(async () => {
    const [a, b] = [await digest(A.page), await digest(B.page)];
    const keys = exps || [...new Set([...Object.keys(a.out), ...Object.keys(b.out)])];
    const diff = keys.filter((k) => JSON.stringify(a.out[k]) !== JSON.stringify(b.out[k]));
    last = { a, b, diff };
    return diff.length === 0;
  }, timeout, 2000);
  digests[label] = { diff: last.diff, a: pick(last.a.out, last.diff), b: pick(last.b.out, last.diff) };
  return { ok, ...last };
}
const pick = (o, keys) => Object.fromEntries(keys.slice(0, 6).map((k) => [k, trim(o[k])]));
const trim = (v) => JSON.parse(JSON.stringify(v ?? null, (_k, x) => (typeof x === 'string' && x.length > 120 ? x.slice(0, 60) + `…(${x.length})` : x)));

/** Is `p` in this device's list? The list only renders rows in view, so search first. */
async function inList(page, p) {
  await page.locator('#patient-search').fill(p.exp);
  await page.waitForTimeout(350);
  const seen = await patientVisible(page, p);
  await page.locator('#patient-search').fill('');
  return seen;
}
async function openBySearch(page, p) {
  await closeToasts(page);
  await page.locator('#patient-search').fill(p.exp);
  await page.waitForTimeout(350);
  await openPatient(page, p);
  await page.locator('#patient-search').fill('');
}
async function openEventualidades(page) {
  await page.locator('#apptab-nota').click();
  await page.locator('.exp-group-pill[data-group="clinico"]').hover();
  await page.locator('.exp-group-section', { hasText: 'Eventualidades' }).click();
  await page.locator('#eventualidades-input').waitFor({ state: 'visible', timeout: 8000 });
}
async function addEv(page, p, text, { dbl = false, wait = true } = {}) {
  await openBySearch(page, p);
  await openEventualidades(page);
  await page.locator('#eventualidades-input').fill(text);
  if (dbl) await page.locator('#eventualidades-add').dblclick();
  else await page.locator('#eventualidades-add').click();
  if (wait) await until(() => page.getByText(text.slice(0, 40)).first().isVisible(), 8000);
}
async function importReceta(page, p, meds, { dbl = false } = {}) {
  await openBySearch(page, p);
  await page.locator('#apptab-med').click();
  await page.locator('#med-itab-receta').click();
  await page.locator('#med-import-open-btn').click();
  const lines = meds.map((m) => [`${DMY} 08:01 a.m.`, 'MEDICAMENTOS', m, 'VIA ORAL', '1 TAB //', 'CADA 24 HORAS', 'NW'].join('\t'));
  await page.locator('#med-input').fill(lines.join('\n'));
  const btn = page.getByRole('button', { name: 'Procesar receta' });
  if (dbl) await btn.dblclick();
  else await btn.click();
  await page.waitForTimeout(800);
}
async function openEstadoActual(page, p) {
  await openBySearch(page, p);
  await page.locator('#apptab-nota').click();
  await page.locator('.exp-group-pill[data-group="clinico"]').hover();
  await page.locator('.exp-group-section', { hasText: 'Estado actual' }).click();
  await page.locator('#ea-snapshot').waitFor({ state: 'visible', timeout: 8000 });
}
async function addManualMed(page, cat, text) {
  const block = page.locator(`[data-ea-med-cat="${cat}"]`);
  if (!(await block.count())) {
    await page.locator('[data-ea-med-pick-category]').selectOption(cat);
    await block.waitFor({ state: 'visible' });
  }
  await block.locator(`[data-ea-med-manual-toggle="${cat}"]`).click();
  await block.locator(`[data-ea-med-manual-input="${cat}"]`).fill(text);
  await block.locator(`[data-ea-med-manual-save="${cat}"]`).click();
  await page.locator(`[data-ea-med-cat="${cat}"]`, { hasText: text }).waitFor({ state: 'visible', timeout: 8000 });
}
/** Conexión dropdown status line (STATUS_LABELS) — opened and closed again. */
async function nubeStatusText(page) {
  await closeToasts(page);
  await page.locator('#btn-header-team-sync').click();
  await page.waitForTimeout(600);
  const t = await page.locator('#connection-dropdown, .connection-dropdown').first().innerText().catch(() => '');
  await page.locator('#btn-connection-dropdown-close').click().catch(() => {});
  const m = t.match(/Nube al día|Sincronizando…|Pendiente[^\n]*|Sin conexión Nube|Error[^\n]*/);
  return m ? m[0] : t.replace(/\s+/g, ' ').slice(0, 120);
}
const evOf = (dg, p) => dg.out[p.exp]?.ev || [];

await r.finish('Nube sync + bad timing: volume, big note, same-patient edits, offline, double-click, switch, close, team move', async () => {
  check('local Worker answers /ping', await startWorker());

  let A = await launchDevice('a', 3791);
  await onboardNube(A.page, USER_A);
  const B = await launchDevice('b', 3792);
  await onboardNube(B.page, USER_B);

  await A.page.getByRole('button', { name: 'Abrir Mi rotación' }).click();
  await A.page.locator('#btn-clinical-team-create-open').click();
  await A.page.locator('#clinical-team-create-name').fill('EQUIPO DEMO SYNC');
  await A.page.locator('#clinical-team-create-sala').selectOption('Sala 1').catch(() => {});
  await A.page.locator('#clinical-team-create-form [type="submit"]').click();
  await B.page.getByRole('button', { name: 'Abrir Mi rotación' }).click();
  const joinBtn = B.page.getByRole('button', { name: 'Unirme' });
  check('B sees A\'s team and joins', await until(() => joinBtn.isVisible(), 20000));
  await joinBtn.click();
  for (const dv of [A, B]) {
    await closeToasts(dv.page);
    await dv.page.locator('#btn-connection-dropdown-close').click().catch(() => {});
    await dv.page.keyboard.press('Escape');
    await dismissLearnHub(dv.page);
    await dv.page.locator('#apptab-lab').click();
  }

  // ── Volume + odd names: 73 patients pasted on A ──────────────────────────
  for (const p of [...ODD, ...FOCUS]) await pasteAndSave(A.page, fullLabs(p, TODAY(6)));
  const t0 = Date.now();
  for (const p of VOL) {
    await pasteAndProcess(A.page, header(p, TODAY(7)) + bh(String(8 + (p.exp.charCodeAt(6) % 5))));
    await A.page.waitForTimeout(250);
  }
  await A.page.waitForTimeout(1500);
  const aAll = await digest(A.page);
  const total = ODD.length + FOCUS.length + VOL.length;
  check(`A saved all ${total} patients`, Object.keys(aAll.out).length === total, { saved: Object.keys(aAll.out).length, pasteMs: Date.now() - t0 });
  const bVol = await until(async () => Object.keys((await digest(B.page)).out).length >= total, 120000, 3000);
  const bAll = await digest(B.page);
  const missingOnB = Object.keys(aAll.out).filter((k) => !bAll.out[k]);
  check(`B received all ${total} patients`, bVol && missingOnB.length === 0, { onB: Object.keys(bAll.out).length, missing: missingOnB.slice(0, 10) });
  check('odd names arrive on B unchanged', ODD.every((p) => bAll.out[p.exp]?.name === aAll.out[p.exp]?.name),
    ODD.map((p) => [aAll.out[p.exp]?.name, bAll.out[p.exp]?.name]).filter(([a, b]) => a !== b));
  check('no duplicate patients on A or B after volume', !aAll.dup.length && !bAll.dup.length, { a: aAll.dup, b: bAll.dup });
  await shot(B.page, 'b-73-patients');

  // ── Big note: 20 000-char eventualidad ───────────────────────────────────
  await addEv(A.page, PB, BIG, { wait: false });
  await A.page.waitForTimeout(1500);
  const aBig = evOf(await digest(A.page), PB);
  check('A: 20 000-char eventualidad saved whole', aBig.length === 1 && aBig[0] === BIG, { count: aBig.length, len: aBig[0]?.length });
  const bigOk = await until(async () => evOf(await digest(B.page), PB)[0] === BIG, 45000, 2000);
  check('B: 20 000-char eventualidad arrives exact', bigOk, { len: evOf(await digest(B.page), PB)[0]?.length });
  await shot(A.page, 'a-big-note');

  // ── Same patient, both devices at once ───────────────────────────────────
  await Promise.all([openBySearch(A.page, PC), openBySearch(B.page, PC)]);
  await Promise.all([openEventualidades(A.page), openEventualidades(B.page)]);
  await A.page.locator('#eventualidades-input').fill('DEMO CONCURRENTE DESDE A');
  await B.page.locator('#eventualidades-input').fill('DEMO CONCURRENTE DESDE B');
  await Promise.all([A.page.locator('#eventualidades-add').click(), B.page.locator('#eventualidades-add').click()]);
  let s = await settle(A, B, 'concurrent-ev', [PC.exp], 45000);
  const conc = evOf(s.a, PC);
  check('same-time eventualidades: both devices keep BOTH entries',
    s.ok && conc.includes('DEMO CONCURRENTE DESDE A') && conc.includes('DEMO CONCURRENTE DESDE B'),
    { a: evOf(s.a, PC), b: evOf(s.b, PC) });
  await shot(B.page, 'b-concurrent-ev');

  await Promise.all([openEstadoActual(A.page, PC), openEstadoActual(B.page, PC)]);
  await Promise.all([addManualMed(A.page, 'abx', 'DEMO ABX DESDE A'), addManualMed(B.page, 'analgesia', 'DEMO ANALGESIA DESDE B')]);
  const eaTrail = [];
  for (const ms of [0, 3000, 10000]) {
    await A.page.waitForTimeout(ms);
    const [a, b] = [await digest(A.page), await digest(B.page)];
    eaTrail.push({ ms, a: [a.out[PC.exp]?.ec, a.out[PC.exp]?.mm], b: [b.out[PC.exp]?.ec, b.out[PC.exp]?.mm] });
  }
  digests['ea-trail'] = eaTrail;
  s = await settle(A, B, 'concurrent-estado-actual', [PC.exp], 45000);
  const ecA = JSON.stringify([s.a.out[PC.exp]?.ec, s.a.out[PC.exp]?.mm]);
  check('same-time estado actual (manejo): both devices keep BOTH categories',
    s.ok && /DEMO ABX DESDE A/.test(ecA) && /DEMO ANALGESIA DESDE B/.test(ecA),
    { a: [s.a.out[PC.exp]?.ec, s.a.out[PC.exp]?.mm], b: [s.b.out[PC.exp]?.ec, s.b.out[PC.exp]?.mm] });
  await shot(A.page, 'a-concurrent-estado-actual');

  // ── Offline edits on both devices, then reconnect ────────────────────────
  await stopWorker();
  await addEv(A.page, PO, 'DEMO OFFLINE DESDE A');
  await addEv(B.page, PO, 'DEMO OFFLINE DESDE B');
  await importReceta(A.page, PO, ['DEMO PARACETAMOL OFFLINE A']);
  await A.page.waitForTimeout(3000);
  const offStatus = await nubeStatusText(A.page);
  check('offline with pending changes: status is NOT «Nube al día»', !/Nube al día/.test(offStatus), offStatus);
  await shot(A.page, 'a-offline-status');
  check('Worker comes back', await startWorker());
  let t = Date.now();
  s = await settle(A, B, 'offline-reconnect', [PO.exp], 240000);
  const offlineMs = Date.now() - t;
  const off = evOf(s.a, PO);
  check('offline edits on both devices: both survive reconnect on both',
    s.ok && off.includes('DEMO OFFLINE DESDE A') && off.includes('DEMO OFFLINE DESDE B'), { a: evOf(s.a, PO), b: evOf(s.b, PO) });
  check('offline receta from A reaches B (≤ 4 min)', (s.b.out[PO.exp]?.meds || []).includes('DEMO PARACETAMOL OFFLINE A'), { meds: s.b.out[PO.exp]?.meds, ms: offlineMs });
  check('offline edits reach the other device within 60 s of reconnect', s.ok && offlineMs <= 60000, { ms: offlineMs });
  await until(async () => /Nube al día/.test(await nubeStatusText(A.page)), 30000, 3000);
  const backStatus = await nubeStatusText(A.page);
  check('after reconnect and drain: status says «Nube al día»', /Nube al día/.test(backStatus), backStatus);

  // ── Fast double-click ────────────────────────────────────────────────────
  await addEv(A.page, PD, 'DEMO DOBLE CLIC EV', { dbl: true });
  await A.page.waitForTimeout(1200);
  const dblEv = evOf(await digest(A.page), PD).filter((t) => t === 'DEMO DOBLE CLIC EV').length;
  check('double-click «Agregar» saves the eventualidad once', dblEv === 1, dblEv);
  await importReceta(A.page, PD, ['DEMO OMEPRAZOL DBL', 'DEMO ENOXAPARINA DBL'], { dbl: true });
  await A.page.waitForTimeout(1200);
  const dblMeds = (await digest(A.page)).out[PD.exp]?.meds || [];
  check('double-click «Procesar receta» keeps 2 meds, not 4', dblMeds.length === 2, dblMeds);
  await shot(A.page, 'a-double-click');

  // ── Switch patient right after save ──────────────────────────────────────
  await addEv(A.page, PS1, 'DEMO SWITCH EV PS1', { wait: false });
  await openBySearch(A.page, PS2);
  await A.page.waitForTimeout(1500);
  let dg = await digest(A.page);
  check('switching patient right after save: entry stays on its patient',
    evOf(dg, PS1).includes('DEMO SWITCH EV PS1') && !evOf(dg, PS2).includes('DEMO SWITCH EV PS1'), { ps1: evOf(dg, PS1), ps2: evOf(dg, PS2) });
  await openEventualidades(A.page);
  await A.page.locator('#eventualidades-input').fill('DEMO SWITCH TYPED NOT SAVED');
  await openBySearch(A.page, PS1);
  await openEventualidades(A.page);
  const leaked = await A.page.locator('#eventualidades-input').inputValue();
  check('unsaved typed text does not move to the next patient', leaked !== 'DEMO SWITCH TYPED NOT SAVED', leaked);

  // ── Close the app right after save ───────────────────────────────────────
  await addEv(A.page, PX, 'DEMO CIERRE INMEDIATO EV', { wait: false });
  await importReceta(A.page, PX, ['DEMO CIERRE RECETA']);
  await A.app.close();
  A = await launchDevice('a', 3791);
  await A.page.locator('#apptab-lab').waitFor({ timeout: 30000 });
  await dismissLearnHub(A.page);
  await A.page.waitForTimeout(3000);
  dg = await digest(A.page);
  check('closed right after save: eventualidad still there after reopen', evOf(dg, PX).includes('DEMO CIERRE INMEDIATO EV'), evOf(dg, PX));
  check('closed right after save: receta still there after reopen', (dg.out[PX.exp]?.meds || []).includes('DEMO CIERRE RECETA'), dg.out[PX.exp]?.meds);
  t = Date.now();
  s = await settle(A, B, 'close-mid-save', [PX.exp], 240000);
  check('closed right after save: entry and receta reach B (≤ 4 min)', s.ok && evOf(s.b, PX).includes('DEMO CIERRE INMEDIATO EV'), { b: s.b.out[PX.exp], ms: Date.now() - t });
  check('restarted A: all patients still there, no duplicates', Object.keys(dg.out).length === total && !dg.dup.length, { n: Object.keys(dg.out).length, dup: dg.dup });

  // ── Team assignment change during sync ───────────────────────────────────
  let teamDone = false;
  let step = 'C creates the second team';
  let C = null;
  try {
    // A resident has one active team: a team they create while the sala is mid-rotation
    // is staged («próxima rotación»), and joining another team leaves the first. So the
    // move is done the real way: an R4 (device C) makes team 2 active and moves PT.
    C = await launchDevice('c', 3793);
    await onboardNube(C.page, USER_C);
    await dismissLearnHub(C.page);
    await C.page.evaluate(() => document.querySelector('#btn-sidebar-mi-rotacion').click());
    await C.page.locator('#btn-clinical-team-create-open').click();
    await C.page.locator('#clinical-team-create-name').fill('EQUIPO DEMO OTRO');
    await C.page.locator('#clinical-team-create-sala').selectOption('Sala 1').catch(() => {});
    await C.page.getByRole('button', { name: 'Crear equipo vacío' }).last().click();
    await C.page.getByText('Equipo vacío creado').first().waitFor({ timeout: 20000 });
    step = 'C makes the second team active';
    const editBtn = C.page.locator('div, li, article').filter({ hasText: 'EQUIPO DEMO OTRO' }).filter({ hasNotText: 'EQUIPO DEMO SYNC' }).locator('.clinical-teams-edit-btn').first();
    const otroId = await editBtn.getAttribute('data-team-id');
    await editBtn.click();
    const panel = C.page.locator(`.clinical-teams-edit-panel[data-team-id="${otroId}"]`);
    await panel.locator('.clinical-teams-edit-rotation-active').selectOption('1');
    await panel.getByRole('button', { name: 'Guardar cambios' }).click();
    await C.page.getByText('Equipo actualizado').first().waitFor({ timeout: 20000 });
    await closeToasts(C.page);
    await C.page.keyboard.press('Escape');
    step = 'C sees PT';
    let lastErr = '';
    const cSees = await until(() => inList(C.page, PT).catch((e) => { lastErr = String(e.message).split('\n')[0]; return false; }), 90000);
    if (!cSees) throw new Error(`R4 never sees PT (${lastErr || 'not in list'}; ${await C.page.locator('.p-name').count()} rows)`);
    step = 'open PT on B and C';
    await openBySearch(C.page, PT);
    await openBySearch(B.page, PT);
    await openEventualidades(B.page);
    await B.page.locator('#eventualidades-input').fill('DEMO EQUIPO EV DESDE B');
    step = 'open team select on C';
    // C opens the patient data pane and moves PT to the other team while B saves.
    await C.page.locator('#apptab-nota').click();
    await C.page.getByRole('button', { name: 'Datos', exact: true }).click();
    const sel = C.page.locator('#patient-team-assign-select');
    await sel.waitFor({ state: 'visible', timeout: 8000 });
    const opts = await sel.locator('option').evaluateAll((os) => os.map((o) => [o.value, o.textContent.trim()]));
    const home = await sel.inputValue();
    const other = opts.find(([v, t]) => v && v !== home && /OTRO/.test(t))?.[0];
    if (!other) {
      const teams = await C.page.evaluate(async () => ((await window.electronAPI.dbClinicalTeamsList({})).teams || []).map((t) => [t.name, t.rotation_active, t.archived_at ? 'archived' : '']));
      throw new Error(`no second team in select: ${JSON.stringify(opts)} db: ${JSON.stringify(teams)}`);
    }
    await Promise.all([B.page.locator('#eventualidades-add').click(), sel.selectOption(other)]);
    await C.page.waitForTimeout(8000);
    await shot(B.page, 'b-after-team-move');
    dg = await digest(B.page);
    check('team move during B\'s save: B keeps its own saved entry', evOf(dg, PT).includes('DEMO EQUIPO EV DESDE B') || !dg.out[PT.exp], evOf(dg, PT));
    const cEv = await until(async () => evOf(await digest(C.page), PT).includes('DEMO EQUIPO EV DESDE B'), 45000, 2000);
    check('team move during B\'s save: B\'s entry still reaches the R4 who moved it', cEv, evOf(await digest(C.page), PT));
    step = 'C moves PT back';
    await sel.selectOption(home).catch(async () => {
      await C.page.getByRole('button', { name: 'Datos', exact: true }).click();
      await C.page.locator('#patient-team-assign-select').selectOption(home);
    });
    const back = await until(async () => (await inList(A.page, PT)) && inList(B.page, PT), 60000);
    s = await settle(A, B, 'team-move-back', [PT.exp], 60000);
    check('moved back: patient visible on A and B again with all data', back && s.ok && evOf(s.a, PT).includes('DEMO EQUIPO EV DESDE B'), { visible: back, a: s.a.out[PT.exp], b: s.b.out[PT.exp] });
    teamDone = true;
  } catch (e) {
    await shot(C?.page || A.page, 'team-move-crash').catch(() => {});
    check('team move scenario ran', false, `${step}: ${String(e.message).split('\n')[0]}`);
  }
  await C?.app.close().catch(() => {});
  await A.page.keyboard.press('Escape').catch(() => {});

  // ── Whole census: A and B agree, nothing emptied ─────────────────────────
  s = await settle(A, B, 'final', null, 60000);
  check('final: A and B saved data identical for every patient', s.ok, { diff: s.diff.slice(0, 10) });
  const emptied = FOCUS.filter((p) => ['BIG', 'CON', 'OFF', 'DBL', 'SW1', 'CLS'].includes(p.key) || (p.key === 'TEAM' && teamDone)).filter((p) => !evOf(s.a, p).length);
  check('final: no focus patient lost its eventualidades', emptied.length === 0, emptied.map((p) => p.key));
  check('final: no duplicates on either device', !s.a.dup.length && !s.b.dup.length, { a: s.a.dup, b: s.b.dup });
  await shot(A.page, 'a-final');
  await shot(B.page, 'b-final');

  for (const [name, dv] of [['a', A], ['b', B]]) {
    await closeToasts(dv.page);
    await dv.page.locator('#btn-header-team-sync').click();
    const navOptions = dv.page.locator('[data-cloud-action="nav-options"]');
    if (await navOptions.isVisible().catch(() => false)) await navOptions.click();
    await dv.page.locator('.cloud-sync-view[data-cloud-view="options"] [data-cloud-action="nav-view"][data-cloud-view="nube"]').click().catch(() => {});
    await dv.page.waitForTimeout(1500);
    digests['diag-' + name] = await dv.page.locator('[data-cloud-nube-diagnostics-host]').innerText().catch(() => '');
    await dv.page.locator('#btn-connection-dropdown-close').click().catch(() => {});
  }
  fs.writeFileSync(path.join(r.artifactDir, 'digests.json'), JSON.stringify(digests, null, 1));
  check('no uncaught page errors on A or B', !A.pageErrors.length && !B.pageErrors.length, [...A.pageErrors, ...B.pageErrors].slice(0, 5));
  await A.app.close();
  await B.app.close();
});
