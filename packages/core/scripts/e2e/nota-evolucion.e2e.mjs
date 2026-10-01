#!/usr/bin/env node
/* global document, DataTransfer, ClipboardEvent, window, getComputedStyle */
/**
 * E2E: Nota de evolución and Indicaciones (Interconsulta › Clínico), driven
 * through the real Electron app. A busy day: the census diagnoses are set in
 * Sala, the note is written in Interconsulta, exported twice, then the
 * indicaciones sheet. Synthetic DEMO patients and made-up expedientes only.
 *
 * Ways it can go wrong (each one is a check below):
 *   Opening the note
 *     - Médico from «Mi Perfil» is not filled in, or a Profesor saved later
 *       does not reach the open note
 *     - the census diagnoses (set in Sala › Datos) do not reach the note
 *     - the N / V / HD / HI / NM format is missing, or estudios does not list
 *       the patient's pasted labs
 *     - Escape does not close «Datos del paciente»
 *   Interconsulta board & consult band (the note lives inside this mode)
 *     - entering Interconsulta does not hide the sidebar or show the board
 *     - the board drops a patient with no team instead of showing it under
 *       «Sin equipo»
 *     - Motivo de consulta / Seguimiento in the consult band do not save, or
 *       do not survive a patient switch
 *     - «Servicio solicitante» offers «Sala» as a consulting service, or a
 *       pick does not write back to the band
 *     - viewing a patient does not hide the board, or Escape does not return
 *       to the board
 *   Writing
 *     - a typed field is lost when the patient changes and comes back
 *     - a diagnosis is not upper case, or «×» removes the wrong row
 *     - «+ Agregar indicación» / «×» lose or reorder treatment rows
 *     - «Desde censo» replaces without asking, or the ask is not a
 *       consequence confirm; Cancelar still replaces; Reemplazar does not
 *     - one patient's note shows on another patient
 *   Word file
 *     - «Generar Nota (.docx)» writes no file, or the file misses a field,
 *       keeps a removed row, or breaks on "&" / "<"
 *     - Escape in «Anteriores» also drops the user back on the team board
 *     - the header's second (fallback) copy keeps the template's sample patient
 *     - «Anteriores» does not keep a copy, a second export the same day adds
 *       a second copy, or a new fecha does not add one
 *   Indicaciones
 *     - the fecha is not today
 *     - «+ Agregar sección» / «×» lose or keep the wrong extra section
 *     - «Generar Indicaciones (.docx)» misses a field or the extra section
 *     - leaving Interconsulta with no patient open does not bring back the
 *       empty state; an empty activo slot is still a drop target
 *   Restart
 *     - the note, its past copies or the indicaciones are lost
 *   Interconsultas teams through Nube (local Worker, second device)
 *     - the team on today's letter is not the guardia lane, or a missing
 *       postguardia team leaves a drop target
 *     - 2/5 teams and unknown team id: UNREACHABLE (second team is staged)
 *   Throughout
 *     - an uncaught page error
 *
 * Artifact: e2e-artifacts/nota-evolucion/<run-id>/ (report.json, screenshots, .docx + text).
 *
 *   npm run e2e:nota-evolucion
 */
import JSZip from 'jszip';
import fs from 'node:fs';
import path from 'node:path';
import { createRun, onboardLocalOnly, closeToasts, pasteAndSave, openPatient, dismissLearnHub, until, goArea, quietHints, waitForBoot, acceptAbxDias } from './harness.mjs';
import { fullLabs } from './some-fixtures.mjs';

const P1 = { exp: '7000621-1', name: 'DEMO NOTA UNO', room: '521' };
const P2 = { exp: '7000622-2', name: 'DEMO NOTA DOS', room: '522' };
const P3 = { exp: '7000623-3', name: 'DEMO NOTA TRES', room: '523' };
const DOCTOR = 'Dr. Demo Nota';
const PROFESOR = 'Dra. Demo Profesora';
const DX_A = 'DEMO NEUMONIA ADQUIRIDA';
const DX_B = 'DEMO DIABETES TIPO 2';
const DX_C = 'DEMO ANEMIA NORMOCITICA';
const INTERROGATORIO = 'DEMO refiere disnea & tos; niega fiebre <38';
const EVOLUCION = 'N: DEMO alerta\nV: DEMO puntas nasales 2 L\nHD: DEMO estable';
const ESTUDIOS = '22/09/26\nDEMO QS normal';
const TX = ['DEMO CEFTRIAXONA 1 G IV CADA 24 H', 'DEMO BORRAR ESTA FILA', 'DEMO PARACETAMOL 1 G VO CADA 8 H'];

function pad2(n) { return String(n).padStart(2, '0'); }
const SOAP_D = new Date(Date.now() - 2 * 86400000);
const SOAP_SOME = `${pad2(SOAP_D.getDate())}/${pad2(SOAP_D.getMonth() + 1)}/${SOAP_D.getFullYear()} 08:10:01 a.m.\tMEDICAMENTOS\tPARACETAMOL 1 G SOL INY 100 ML (*)\tVIA INTRAVENOSA\t1 G //\tCADA 8 HORAS\tNW`;

const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const todayDmy = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

const r = createRun('nota-evolucion');
const { check } = r;

async function docxText(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const xml = await zip.file('word/document.xml').async('string');
  return xml.replace(/<w:tab\/>/g, '\t').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '');
}

/** Wait for a .docx newer than `since` in the stubbed Downloads dir; copy it to the artifact. */
async function newDocx(since, label) {
  let file = null;
  await until(async () => {
    const hits = fs.readdirSync(r.downloadsDir).filter((f) => f.endsWith('.docx'))
      .map((f) => path.join(r.downloadsDir, f)).filter((f) => fs.statSync(f).mtimeMs > since);
    file = hits[0] || null;
    return !!file;
  }, 20000, 250);
  if (!file) return { name: null, text: '' };
  await new Promise((res) => setTimeout(res, 300)); // let the write finish
  const text = await docxText(file);
  fs.copyFileSync(file, path.join(r.artifactDir, `${label}.docx`));
  fs.writeFileSync(path.join(r.artifactDir, `${label}.txt`), text);
  return { name: path.basename(file), text };
}

/** Interconsulta has no side list: Resumen › «← Tablero», then the patient's card on the team board. */
async function pickPatient(page, p) {
  await waitForBoot(page);
  await closeToasts(page);
  const board = page.locator('#ic-board-mount');
  if (!(await board.isVisible())) {
    await goArea(page, 'nota');
    await board.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
  }
  // The Paciente tab may already land on the board; otherwise Resumen › «← Tablero».
  if (!(await board.isVisible())) {
    await page.locator('.exp-group-pill[data-group="paciente"]').click();
    await page.locator('[data-ic-back-to-board]').click();
  }
  await board.locator('.sv-name').first().waitFor({ state: 'visible' });
  await openPatient(page, p);
}

/** Header mode switch: 'sala' | 'interconsulta'. */
async function setMode(page, mode) {
  await closeToasts(page);
  await page.locator('#header-mode-seg').hover();
  const btn = page.locator(`#header-mode-seg button[data-mode="${mode}"]`);
  await btn.waitFor({ state: 'visible' });
  await page.waitForTimeout(400); // expand animation
  await btn.click();
  await page.waitForTimeout(600);
  await closeToasts(page);
}

/** Interconsulta › Clínico › section ('notas' | 'indica'). */
async function goClinico(page, section) {
  await closeToasts(page);
  await goArea(page, 'nota');
  const sec = page.locator(`.exp-group-section[data-section="${section}"]`);
  await page.locator('.exp-group-pill[data-group="clinico"]').hover({ timeout: 5000 }).catch(() => {});
  await sec.click();
  await page.locator(section === 'notas' ? '#btn-gen' : '#btn-gen-ind').waitFor({ state: 'visible' });
}

const noteState = (page) =>
  page.evaluate(() => {
    const byArg = (arg) => document.querySelector(`#note-form [data-oninput-args='["${arg}"]']`)?.value ?? null;
    return {
      fecha: byArg('fecha'),
      hora: byArg('hora'),
      interrogatorio: byArg('interrogatorio'),
      evolucion: byArg('evolucion'),
      estudios: byArg('estudios'),
      ta: byArg('ta'),
      fc: byArg('fc'),
      medico: byArg('medico'),
      profesor: byArg('profesor'),
      dx: [...document.querySelectorAll('#dx-list input')].map((i) => i.value),
      tx: [...document.querySelectorAll('#tx-list input')].map((i) => i.value),
      pastLabel: [...document.querySelectorAll('#note-form button')].find((b) => /^Anteriores/.test(b.textContent))?.textContent.trim() || null,
    };
  });
/** Sala/IC chrome: body classes, board, consult band, patient view vs empty state, sidebar. */
const chromeState = (page) => page.evaluate(() => ({
  band: document.querySelectorAll('.ic-consult-band').length,
  back: document.querySelectorAll('[data-ic-back-to-board]').length,
  icMode: document.documentElement.classList.contains('ic-board-mode'),
  boardOpen: document.documentElement.classList.contains('ic-board-view-open'),
  boardHidden: document.getElementById('ic-board-mount').hidden,
  patientView: getComputedStyle(document.getElementById('patient-view')).display !== 'none',
  emptyState: getComputedStyle(document.getElementById('empty-state')).display !== 'none',
  sidebar: (() => { const a = document.querySelector('aside.patient-sidebar'); return !!a && a.getClientRects().length > 0; })(),
}));
/** IC team board lanes as data. */
const boardLanes = (page) => page.locator('#ic-board-mount').evaluate((mount) =>
  [...mount.querySelectorAll('.ic-board-lane')].map((l) => ({
    role: l.dataset.role,
    title: l.querySelector('.ic-board-lane__title')?.textContent.trim(),
    empty: [...l.querySelectorAll('.ic-board-lane__body > .ic-board-empty')].map((e) => e.textContent.trim()).join('|'),
    drop: l.getAttribute('data-drop-team-id'),
  })));
const field = (page, arg) => page.locator(`#note-form [data-oninput-args='["${arg}"]']`);
const indField = (page, arg) => page.locator(`#indica-form [data-oninput-args='["${arg}"]']`);

await r.finish('Nota de evolución + Indicaciones: profile, census dx, rows, Word x2, past copies, restart', async () => {
  const { app, page, pageErrors } = await r.launch();
  await quietHints(page); // the ⌘K hint bubble sits over the page toolbar under the top bar
  await onboardLocalOnly(page);

  await page.locator('#profile-toggle-btn').click();
  await page.locator('#profile-doctor-pick').selectOption('__otro__');
  await page.locator('#profile-doctor').fill(DOCTOR);
  await page.waitForTimeout(900); // Mi perfil saves on its own
  await page.keyboard.press('Escape');

  // ── Leave Interconsulta with no patient open → Sala's empty state ──────
  await goArea(page, 'nota');
  await setMode(page, 'interconsulta');
  await setMode(page, 'sala');
  const noPatient = await chromeState(page);
  check('IC → Sala with no patient open: body classes clear, sidebar back, the empty state shows (no patient view)',
    !noPatient.icMode && !noPatient.boardOpen && noPatient.boardHidden && noPatient.emptyState && !noPatient.patientView && noPatient.sidebar, noPatient);

  await goArea(page, 'lab');
  await pasteAndSave(page, fullLabs(P1, 'Sep 22 2026 8:00AM'));
  await pasteAndSave(page, fullLabs(P2, 'Sep 22 2026 8:30AM'));
  await openPatient(page, P2);
  await openPatient(page, P1);

  // ── Sala › Resumen › Datos: census diagnoses ──────────────────────────
  await goArea(page, 'nota');
  await page.locator('.dash-name:visible').first().click();
  // Datos has no separate paste box any more: pasting "DX1 + DX2" into the
  // first diagnosis row splits it into rows.
  await page.locator('#patient-dx-1').waitFor({ state: 'visible' });
  await page.locator('#patient-dx-1').evaluate((el, text) => {
    const dt = new DataTransfer();
    dt.setData('text/plain', text);
    el.focus();
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }, `${DX_A.toLowerCase()} + ${DX_B.toLowerCase()}`);
  const censoDx = await page.locator('#patient-dx-list input').evaluateAll((els) => els.map((e) => e.value).filter(Boolean));
  check('Datos: pasting «DX1 + DX2» makes two upper-case census diagnoses', censoDx.join('|') === `${DX_A}|${DX_B}`, censoDx);
  await page.keyboard.press('Escape');
  check('Escape closes «Datos del paciente»', await until(async () => !(await page.locator('#exp-datos-modal-backdrop.open').count()), 3000));

  // ── Sala › Resumen: no consult band; Interconsultantes catalog ────────
  check('Sala mode shows no Interconsulta consult band', (await page.locator('.ic-consult-band').count()) === 0);
  await page.locator('[data-dash-action="ic-add"]').first().click();
  const icPanel = page.locator('#patient-ic-panel');
  await icPanel.waitFor({ state: 'visible' });
  const icChips = await icPanel.locator('[data-ic-toggle]').evaluateAll((els) => els.map((e) => e.textContent.trim()));
  check('Sala › Interconsultantes offers no «Sala» service', icChips.length > 20 && !icChips.includes('Sala'), icChips.length);
  const icHues = await icPanel.locator('.ic-cat').evaluateAll((cats) =>
    cats.map((c) => [...new Set([...c.querySelectorAll('.svc')].map((b) => b.style.getPropertyValue('--h').trim()))].join(',')));
  check('service chips take one hue per category (médicas 245, quirúrgicas 168, soporte 52)', icHues.join('|') === '245|168|52', icHues);
  const cardCount = () => page.locator('[data-dash-action="ic-toggle"][data-ic-id="card"]').count();
  const counts = [];
  for (let i = 0; i < 3; i += 1) {
    await icPanel.locator('[data-ic-toggle="card"]').click();
    counts.push(await cardCount());
  }
  check('toggling a service on, off, on adds it once, removes it, adds it once again (no duplicate)', counts.join(',') === '1,0,1', counts);
  await icPanel.locator('[data-ic-done]').click();
  await icPanel.waitFor({ state: 'hidden' });

  // ── Interconsulta › Nota de evolución ─────────────────────────────────
  await setMode(page, 'interconsulta');

  // ── Board chrome (the old top INTERCONSULTA bar is retired/always hidden;
  //    the board itself is the real UI a user sees) ─────────────────────
  check('entering Interconsulta hides the sidebar and shows the board',
    await page.evaluate(() =>
      document.documentElement.classList.contains('ic-board-mode') &&
      document.documentElement.classList.contains('ic-board-view-open') &&
      !document.getElementById('ic-board-mount').hidden));
  check('the retired top INTERCONSULTA bar stays hidden', await page.locator('#interconsulta-mode-frame').isHidden());
  let boardHtml = await page.locator('#ic-board-mount').innerHTML();
  check('board header: «+ Agregar» comes ahead of «Actualizar pacientes»',
    /<div class="ic-board-header">[\s\S]*data-ic-board-add[\s\S]*data-ic-board-refresh/.test(boardHtml));
  const laneCount = (boardHtml.match(/<section class="ic-board-lane /g) || []).length;
  // 4 fixed team rows (guardia/activo x2/postguardia, all "no team today" with
  // no teams configured) plus the «Por asignar» tray for P1/P2, who have no team.
  check('board renders its rows (4 fixed + «Por asignar» tray)', laneCount === 5, laneCount);
  check('no rollover button on the board (feature was removed)', !boardHtml.includes('Terminar guardia y repartir pacientes'));
  check('patients with no team land in «Por asignar» instead of disappearing',
    boardHtml.includes('Por asignar') && boardHtml.includes(P1.name) && boardHtml.includes(P2.name));

  await pickPatient(page, P1);

  // ── Consult band: Servicio solicitante / Motivo / Seguimiento ─────────
  let band = page.locator('.ic-consult-band');
  await band.waitFor({ state: 'visible' });
  check('board hides and the consult band shows while viewing a patient',
    (await page.locator('#ic-board-mount').isHidden()) && (await band.count()) === 1);
  await band.locator('[data-consult-field="reason"]').fill('DEMO valoración por deterioro');
  await band.locator('[data-consult-field="reason"]').dispatchEvent('change');
  await band.locator('[data-consult-field="followUpStatus"]').selectOption('en_curso');
  await page.waitForTimeout(300);
  await pickPatient(page, P2);
  await pickPatient(page, P1);
  band = page.locator('.ic-consult-band');
  check('Motivo de consulta / Seguimiento written in the consult band survive a patient switch',
    (await band.locator('[data-consult-field="reason"]').inputValue()) === 'DEMO valoración por deterioro' &&
    (await band.locator('[data-consult-field="followUpStatus"]').inputValue()) === 'en_curso');

  await band.locator('[data-ic-req-trigger]').click();
  const svcPanel = page.locator('#patient-svc-pick-panel');
  await svcPanel.waitFor({ state: 'visible' });
  const svcHtml = await svcPanel.innerHTML();
  check('«Servicio solicitante» never offers «Sala» as a consulting service', !/>Sala<\/button>/i.test(svcHtml));
  const svcHues = [...svcHtml.matchAll(/--h:(\d+)"\s+data-svc-pick="([^"]+)"/g)].map((m) => m[1]);
  check('each requesting service in the picker has its own hue (not shared by category)',
    svcHues.length > 0 && new Set(svcHues).size === svcHues.length, svcHues.length);
  await svcPanel.locator('[data-svc-pick="cxgen"]').click();
  await svcPanel.waitFor({ state: 'hidden' });
  const pickedLabel = (await page.locator('.ic-consult-band [data-ic-req-trigger]').innerText()).trim();
  check('picking a service writes it back onto the consult band trigger', pickedLabel === 'Cirugía general', pickedLabel);

  // ── Escape from a patient in Interconsulta returns to the board ───────
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check('Escape from the patient view returns to the board',
    !(await page.locator('#ic-board-mount').isHidden()) && (await page.locator('.ic-consult-band').count()) === 0);

  // Board controls: refresh + «+ Agregar» present, no «← Tablero» on the board itself.
  check('board has «Actualizar pacientes» and «+ Agregar», and no «← Tablero» button',
    (await page.locator('#ic-board-mount [data-ic-board-refresh]').count()) === 1 &&
    /\+ Agregar/.test(await page.locator('#ic-board-mount [data-ic-board-add]').innerText()) &&
    (await page.locator('[data-ic-back-to-board]').count()) === 0);

  // Leaving Interconsulta with a patient open: band gone, chrome and patient view back.
  await pickPatient(page, P1);
  check('viewing a patient in Interconsulta: «← Tablero» and the consult band show',
    (await page.locator('[data-ic-back-to-board]').count()) === 1 && (await page.locator('.ic-consult-band').count()) === 1);
  await setMode(page, 'sala');
  const salaChrome = await chromeState(page);
  check('IC → Sala with a patient open: band and «← Tablero» go, body classes clear, sidebar and patient view return',
    salaChrome.band === 0 && salaChrome.back === 0 && !salaChrome.icMode && !salaChrome.boardOpen && salaChrome.boardHidden &&
    salaChrome.patientView && !salaChrome.emptyState && salaChrome.sidebar, salaChrome);
  await setMode(page, 'interconsulta');

  // ── Team board, on the demo set (⌥⌘⇧I): roles, buckets, lanes, drag ────
  await page.locator('#ic-board-mount').waitFor({ state: 'visible' });
  await page.locator('body').click({ position: { x: 5, y: 5 } }).catch(() => {});
  await page.keyboard.press('Alt+Control+Shift+KeyI');
  await page.locator('#ic-board-mount .ic-row--guardia').waitFor({ state: 'visible' });
  await page.locator('#ic-board-mount [data-role="guardia"] .ic-card').first().waitFor({ state: 'visible' });
  await closeToasts(page);
  const lanes = () => page.locator('#ic-board-mount').evaluate((mount) =>
    [...mount.querySelectorAll('.ic-board-lane')].map((l) => ({
      role: l.dataset.role,
      title: l.querySelector('.ic-board-lane__title')?.textContent.trim(),
      headFirst: l.firstElementChild?.classList.contains('ic-row__head') && l.lastElementChild?.classList.contains('ic-board-lane__body'),
      note: l.querySelector('.ic-row__note')?.textContent.trim() || '',
      drop: l.getAttribute('data-drop-team-id'),
      buckets: [...l.querySelectorAll('.ic-row__bucket > .sv-label')].map((d) => d.textContent.trim()),
      ids: [...l.querySelectorAll('.ic-card[data-patient-id]')].map((c) => c.getAttribute('data-patient-id')),
    })));
  let L = await lanes();
  const byRole = (role) => L.filter((l) => l.role === role);
  check('demo board: real patients are hidden while the demo shows',
    !(await page.locator('#ic-board-mount').innerText()).includes(P1.name) && L.reduce((n, l) => n + l.ids.length, 0) === 12,
    L.map((l) => l.ids.length));
  check('lane layout: guardia, 2 activo, postguardia, then «Sin equipo»; every lane has its head before its body',
    L.map((l) => l.role).join(',') === 'guardia,activo,activo,postguardia,sin-equipo' && L.every((l) => l.headFirst), L.map((l) => l.role));
  const letter = (l) => 'ABCD'.indexOf(/Equipo Demo ([A-D])/.exec(l.title || '')?.[1] ?? '?');
  const gL = letter(byRole('guardia')[0]);
  const pL = letter(byRole('postguardia')[0]);
  const aL = byRole('activo').map(letter);
  check('team roles: the guardia letter is on guardia, the letter before it is postguardia, the other two are activo',
    gL >= 0 && pL === (gL + 3) % 4 && aL.every((x) => x >= 0 && x !== gL && x !== pL) && new Set([gL, pL, ...aL]).size === 4,
    { gL, pL, aL });
  check('guardia lane has Preop / Pendientes / Under; VPO and today\'s new consults are in Preop, older follow-ups in Pendientes',
    byRole('guardia')[0].buckets.join('|') === 'Preop / Nuevas hoy · 4|Pendientes · 2', byRole('guardia')[0].buckets);
  check('activo lanes have Pendientes and Under only (no Preop)',
    byRole('activo').every((l) => l.buckets.join('|') === 'Pendientes · 2'), byRole('activo').map((l) => l.buckets));
  check('postguardia lane says «No presencial hoy», keeps its buckets and stays a drop target',
    /No presencial hoy/.test(byRole('postguardia')[0].note) && byRole('postguardia')[0].buckets.length === 0 && !!byRole('postguardia')[0].drop,
    byRole('postguardia')[0]);
  check('every lane body is a drop target; «Sin equipo» uses an empty team id',
    L.every((l) => l.drop !== null && l.drop !== undefined) && byRole('sin-equipo')[0].drop === '' && byRole('sin-equipo')[0].ids.length === 2, L.map((l) => l.drop));

  // Drag a today's-new consult from guardia to the first activo lane → it becomes «Pendientes» there.
  const card = page.locator('#ic-board-mount .ic-card[data-patient-id="ic-demo-new-1"]');
  const activo1Id = byRole('activo')[0].drop;
  await card.dragTo(page.locator(`#ic-board-mount [data-drop-team-id="${activo1Id}"]`));
  await until(async () => (await lanes()).find((l) => l.drop === activo1Id)?.ids.includes('ic-demo-new-1'), 4000);
  L = await lanes();
  const g2 = byRole('guardia')[0];
  const a2 = L.find((l) => l.drop === activo1Id);
  check('drag reassign: the card moves lane; on an activo team it counts under Pendientes, not Preop',
    a2.ids.includes('ic-demo-new-1') && !g2.ids.includes('ic-demo-new-1') &&
    g2.buckets[0] === 'Preop / Nuevas hoy · 3' && a2.buckets.join('|') === 'Pendientes · 3', { g: g2.buckets, a: a2.buckets });
  // The change survives leaving and re-entering the board.
  await page.locator('#ic-board-mount .ic-card[data-patient-id="ic-demo-fu-1"]').click();
  await page.locator('.ic-consult-band').waitFor({ state: 'visible' });
  await page.keyboard.press('Escape');
  await page.locator('#ic-board-mount').waitFor({ state: 'visible' });
  L = await lanes();
  check('the drag reassignment is kept after opening a patient and coming back',
    L.find((l) => l.drop === activo1Id).ids.includes('ic-demo-new-1'));
  await page.locator('body').click({ position: { x: 5, y: 5 } }).catch(() => {});
  await page.keyboard.press('Alt+Control+Shift+KeyI');
  await until(async () => (await page.locator('#ic-board-mount .ic-card[data-patient-id^="ic-demo"]').count()) === 0, 5000);
  await page.locator('#ic-board-mount .ic-card .sv-name').first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  await closeToasts(page);
  const offTxt = await page.locator('#ic-board-mount').innerText();
  check('demo off: the demo patients go and the real patients are back on the board', /DEMO (NOTA )?DOS/.test(offTxt) && !/Equipo Demo/.test(offTxt), offTxt.slice(0, 300));

  await pickPatient(page, P1);
  await goClinico(page, 'notas');
  let s = await noteState(page);
  await r.shot(page, 'note-open');
  check('Médico comes from Mi Perfil', s.medico === DOCTOR && !s.profesor, { medico: s.medico, profesor: s.profesor });
  // «Profesor en nota» only shows in Interconsulta: set it now, the open note fills in.
  await page.locator('#profile-toggle-btn').click();
  await page.locator('#profile-profesor').fill(PROFESOR);
  await page.waitForTimeout(900); // Mi perfil saves on its own
  await page.keyboard.press('Escape');
  await closeToasts(page);
  s = await noteState(page);
  check('Profesor saved later in Mi Perfil fills the open note', s.profesor === PROFESOR, s.profesor);
  check('census diagnoses are in the note', s.dx.join('|') === `${DX_A}|${DX_B}`, s.dx);
  check('evolución starts with the N / V / HD / HI / NM format; estudios lists the pasted labs',
    /^N: \[Neurológico\]\nV: /.test(s.evolucion || '') && /^22\/09\nBH\t/.test(s.estudios || '') && /\nQS\t/.test(s.estudios || ''), { evolucion: s.evolucion, estudios: s.estudios });
  check('no past copies yet', s.pastLabel === 'Anteriores (0)', s.pastLabel);

  await field(page, 'fecha').fill('22/09/2026');
  await field(page, 'hora').fill('08:15');
  await field(page, 'interrogatorio').fill(INTERROGATORIO);
  await field(page, 'evolucion').fill(EVOLUCION);
  await field(page, 'estudios').fill(ESTUDIOS);
  await field(page, 'ta').fill('120/70');
  await field(page, 'fr').fill('18');
  await field(page, 'fc').fill('88');
  await field(page, 'temp').fill('36.8');
  await field(page, 'peso').fill('70');

  // Diagnoses: add a lower-case one, remove the second.
  await page.locator('#dx-list .btn-add-row').click();
  await page.locator('#dx-list input').nth(2).fill(DX_C.toLowerCase());
  await page.locator('#dx-list .btn-remove').nth(1).click();
  s = await noteState(page);
  check('dx typed in lower case is kept upper case; «×» removes the right row', s.dx.join('|') === `${DX_A}|${DX_C}`, s.dx);

  // «Desde censo»: Cancelar keeps, Reemplazar replaces.
  await page.getByRole('button', { name: 'Desde censo' }).click();
  const confirmModal = await page.locator('[data-wb-confirm-backdrop]').innerHTML();
  check('«Desde censo» asks first, as a consequence confirm',
    /wb-confirm-modal--consequence/.test(confirmModal) && /¿Reemplazar los diagnósticos de la nota con los del censo del paciente\?/.test(confirmModal));
  await page.locator('[data-wb-confirm-cancel]').click();
  await page.locator('[data-wb-confirm-cancel]').waitFor({ state: 'detached' });
  const afterCancel = (await noteState(page)).dx;
  await page.getByRole('button', { name: 'Desde censo' }).click();
  await page.locator('[data-wb-confirm-ok]').click();
  await page.locator('[data-wb-confirm-ok]').waitFor({ state: 'detached' });
  const afterReplace = (await noteState(page)).dx;
  check('«Desde censo»: Cancelar keeps the note dx, Reemplazar brings the census dx',
    afterCancel.join('|') === `${DX_A}|${DX_C}` && afterReplace.join('|') === `${DX_A}|${DX_B}`, { afterCancel, afterReplace });
  await page.locator('#dx-list .btn-add-row').click();
  await page.locator('#dx-list input').nth(2).fill(DX_C);

  // Treatment rows: three, remove the middle one.
  await page.locator('#tx-list input').first().fill(TX[0]);
  for (let i = 1; i < 3; i += 1) {
    await page.locator('#tx-list .btn-add-row').click();
    await page.locator('#tx-list input').nth(i).fill(TX[i]);
  }
  await page.locator('#tx-list .btn-remove').nth(1).click();
  s = await noteState(page);
  check('treatment: «×» removes the middle row, order kept', s.tx.join('|') === `${TX[0]}|${TX[2]}`, s.tx);

  // ── Scope: patient two, then back ─────────────────────────────────────
  await pickPatient(page, P2);
  await goClinico(page, 'notas');
  const p2 = await noteState(page);
  check('patient two\'s note shows none of patient one\'s text', !p2.interrogatorio && !p2.dx.includes(DX_C) && !p2.tx.some(Boolean), p2);
  await pickPatient(page, P1);
  await goClinico(page, 'notas');
  s = await noteState(page);
  check('patient one\'s note is intact after switching patients',
    s.interrogatorio === INTERROGATORIO && s.evolucion === EVOLUCION && s.ta === '120/70' && s.dx.join('|') === `${DX_A}|${DX_B}|${DX_C}` && s.tx.join('|') === `${TX[0]}|${TX[2]}`, s);
  await r.shot(page, 'note-filled');

  // ── Word, first export ────────────────────────────────────────────────
  let t0 = Date.now();
  await closeToasts(page);
  await page.locator('#btn-gen').click();
  const doc1 = await newDocx(t0, 'nota-1');
  const toast1 = (await page.locator('.toast').allInnerTexts()).join(' | ');
  check('«Generar Nota (.docx)» writes a file and says so', !!doc1.name && /Nota guardada/.test(toast1), { name: doc1.name, toast1 });
  const want = [P1.name, '22/09/2026', 'DEMO refiere disnea &amp; tos; niega fiebre &lt;38', 'DEMO puntas nasales 2 L', 'DEMO QS normal', DX_A, DX_B, DX_C, TX[0], TX[2], '120/70', '88', '36.8', DOCTOR, PROFESOR];
  // The hospital format prints the free text in capitals.
  const missing = want.filter((w) => !doc1.text.toUpperCase().includes(w.toUpperCase()));
  check('the .docx holds every field (and keeps "&" / "<")', missing.length === 0, missing);
  // The header sits in a text box twice (Word's copy and the fallback copy other viewers show).
  const count = (text, w) => text.split(w).length - 1;
  check('both header copies name this patient (no template sample patient left)',
    count(doc1.text, P1.exp) === 2 && count(doc1.text.toUpperCase(), P1.name) >= 2,
    { exp: count(doc1.text, P1.exp), name: count(doc1.text.toUpperCase(), P1.name) });
  check('the .docx drops the removed treatment row', !doc1.text.toUpperCase().includes('DEMO BORRAR ESTA FILA'));
  s = await noteState(page);
  check('first export keeps one past copy', s.pastLabel === 'Anteriores (1)', s.pastLabel);

  // Same fecha again: replaces that day's copy. New fecha: adds one.
  await field(page, 'interrogatorio').fill(INTERROGATORIO + ' DEMO SEGUNDA');
  t0 = Date.now();
  await closeToasts(page);
  await page.locator('#btn-gen').click();
  await newDocx(t0, 'nota-2-same-day');
  const sameDay = (await noteState(page)).pastLabel;
  await field(page, 'fecha').fill(todayDmy);
  t0 = Date.now();
  await closeToasts(page);
  await page.locator('#btn-gen').click();
  await newDocx(t0, 'nota-3-today');
  const newDay = (await noteState(page)).pastLabel;
  check('same-day export replaces its copy; a new fecha adds one', sameDay === 'Anteriores (1)' && newDay === 'Anteriores (2)', { sameDay, newDay });
  await page.getByRole('button', { name: 'Anteriores (2)' }).click();
  const past = page.locator('#past-docs-backdrop');
  await past.waitFor({ state: 'visible' });
  await past.locator('.past-docs-item', { hasText: '22/09/2026' }).click();
  const pastText = await past.locator('.past-docs-view').innerText();
  await r.shot(page, 'past-notes');
  check('the 22/09/2026 copy holds the second (same-day) text', pastText.includes('DEMO SEGUNDA') && pastText.includes(DX_C), pastText.slice(0, 300));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check('Escape closes Anteriores and stays on the note (not the team board)', (await past.count()) === 0 && (await page.locator('#btn-gen').isVisible()));

  // ── Indicaciones ──────────────────────────────────────────────────────
  await goClinico(page, 'indica');
  const indFecha = await indField(page, 'fecha').inputValue();
  check('indicaciones fecha is today', indFecha === todayDmy, indFecha);
  await indField(page, 'medicos').fill('R2 DEMO / R1 DEMO');
  await indField(page, 'dieta').fill('DEMO DIETA BLANDA');
  await indField(page, 'cuidados').fill('DEMO SV CADA 4 H');
  await indField(page, 'estudios').fill('DEMO BH QS MAÑANA');
  await indField(page, 'medicamentos').fill('DEMO OMEPRAZOL 40 MG IV CADA 24 H');
  await indField(page, 'interconsultas').fill('DEMO CARDIOLOGIA');
  await page.getByRole('button', { name: '+ Agregar sección' }).click();
  await page.getByRole('button', { name: '+ Agregar sección' }).click();
  await page.locator('#otros-list input').nth(0).fill('DEMO SECCION QUITAR');
  await page.locator('#otros-list input').nth(1).fill('DEMO OXIGENO');
  await page.locator('#otros-list textarea').nth(1).fill('DEMO PUNTAS 2 L');
  await page.locator('#otros-list .btn-remove-otro').nth(0).click();
  const otros = await page.locator('#otros-list input').evaluateAll((els) => els.map((e) => e.value));
  check('«×» removes the right extra section', otros.join('|') === 'DEMO OXIGENO', otros);
  t0 = Date.now();
  await closeToasts(page);
  await page.locator('#btn-gen-ind').click();
  const ind = await newDocx(t0, 'indicaciones');
  const toastI = (await page.locator('.toast').allInnerTexts()).join(' | ');
  const wantI = ['DEMO DIETA BLANDA', 'DEMO SV CADA 4 H', 'DEMO BH QS MAÑANA', 'DEMO OMEPRAZOL 40 MG IV CADA 24 H', 'DEMO CARDIOLOGIA', 'DEMO OXIGENO', 'DEMO PUNTAS 2 L', 'R2 DEMO / R1 DEMO'];
  const missingI = wantI.filter((w) => !ind.text.toUpperCase().includes(w.toUpperCase()));
  check('«Generar Indicaciones (.docx)» writes a file with every field', !!ind.name && /Indicaciones guardadas/.test(toastI) && missingI.length === 0, { name: ind.name, toastI, missingI });
  check('the indicaciones .docx drops the removed section', !ind.text.toUpperCase().includes('DEMO SECCION QUITAR'));
  await r.shot(page, 'indicaciones');

  // ── Interconsulta › Manejo › «Abrir plantilla SOAP» → «Insertar en evolución» ──
  await closeToasts(page);
  await goArea(page, 'med');
  await page.locator('#med-itab-receta').click();
  await page.locator('#med-import-open-btn').click();
  await page.locator('#med-input').fill(SOAP_SOME);
  await page.getByRole('button', { name: 'Procesar receta' }).click();
  await page.waitForTimeout(400);
  await acceptAbxDias(page);
  await closeToasts(page);
  await page.getByRole('button', { name: 'Abrir plantilla SOAP' }).click();
  await page.locator('#soap-modal-backdrop.open').waitFor({ state: 'visible' });
  await page.locator('#soap-dieta').fill('SUPLEMENTO');
  await page.locator('#soap-kcalkg').fill('25');
  await page.locator('#soap-kcal').fill('1750');
  await page.locator('#soap-ing').fill('500');
  await page.locator('#soap-egr').fill('300');
  await page.locator('#soap-modal-backdrop .btn-soap-insert').click();
  await page.locator('#soap-modal-backdrop.open').waitFor({ state: 'hidden' });
  const soapToast = (await page.locator('.toast').allInnerTexts()).join(' | ');
  await goClinico(page, 'notas');
  const soapEv = (await noteState(page)).evolucion || '';
  const nmLine = soapEv.split('\n').find((l) => l.startsWith('NM:')) || '';
  check('plantilla SOAP → «Insertar en evolución»: the NM line starts with the diet, then INGRESOS; no «CALCULADA A», no «KCAL/KG»',
    nmLine.startsWith('NM: DIETA SUPLEMENTO || INGRESOS 500 CC, DIURESIS 300 CC, BALANCE') && !/CALCULADA A|KCAL\/KG/.test(nmLine), { nmLine, soapToast, soapEv: soapEv.slice(0, 200) });

  // ── Restart ───────────────────────────────────────────────────────────
  const errors = [...pageErrors];
  await app.close();
  const again = await r.launch();
  await again.page.locator('.topbar-area-btn').waitFor({ state: 'visible', timeout: 30000 });
  await dismissLearnHub(again.page);
  await pickPatient(again.page, P1);
  const svcAfter = (await again.page.locator('.ic-consult-band [data-ic-req-trigger]').innerText()).trim();
  check('restart: the picked «Servicio solicitante» is kept', svcAfter === 'Cirugía general', svcAfter);
  await goClinico(again.page, 'notas');
  s = await noteState(again.page);
  await r.shot(again.page, 'after-restart');
  check('restart: the note, its dx, rows and two past copies are kept',
    s.interrogatorio === INTERROGATORIO + ' DEMO SEGUNDA' && s.fecha === todayDmy && s.dx.join('|') === `${DX_A}|${DX_B}|${DX_C}` && s.tx.join('|') === `${TX[0]}|${TX[2]}` && s.pastLabel === 'Anteriores (2)', s);
  await goClinico(again.page, 'indica');
  const keptI = { dieta: await indField(again.page, 'dieta').inputValue(), otros: await again.page.locator('#otros-list input').evaluateAll((els) => els.map((e) => e.value)) };
  check('restart: indicaciones and the extra section are kept', keptI.dieta === 'DEMO DIETA BLANDA' && keptI.otros.join('|') === 'DEMO OXIGENO', keptI);
  check('no uncaught page errors', !errors.length && !again.pageErrors.length, [...errors, ...again.pageErrors].slice(0, 5));
  await again.app.close();

  // ── IC teams made through Nube (local Worker, same pattern as nube-sync) ─
  // One R2 in Interconsultas makes the guardia team, then a second IC team.
  // The second one is staged for next month (resolveRotationActiveForNewTeam:
  // the sala already has an active team) and only R4/Admin can move it into
  // this rotation; self-changing the rank to R4 in ⇄ Cuenta does not stick.
  // So the 2-team, 5-team and unknown-team boards cannot be built from one
  // device: UNREACHABLE, checked below as the staged team missing from the board.
  const { startWorker, nubeDevices, onboardNube, openNubeView, flat } = await import('./nube-worker.mjs');
  check('local Worker answers /ping', await startWorker());
  const { page: ic } = await nubeDevices(r)('ic', 3793);
  await onboardNube(ic, { username: `demo_ic_${Date.now().toString(36)}`, name: 'Dr. Demo Interconsulta', rank: 'R2', sala: 'Interconsultas' });
  const letterOf = (d) => 'ABCD'[(d.getDate() - 1) % 4];
  const gLetter = letterOf(new Date());
  const pLetter = letterOf(new Date(Date.now() - 86400000));
  const otherLetter = [...'ABCD'].find((x) => x !== gLetter && x !== pLetter);
  const createIcTeam = async (name, letter, first) => {
    await closeToasts(ic);
    if (first) await ic.getByRole('button', { name: 'Abrir Mi rotación' }).click();
    else await openNubeView(ic, 'equipo');
    await ic.locator('#btn-clinical-team-create-open').click();
    await ic.locator('#clinical-team-create-sala').selectOption('Interconsultas');
    await ic.locator('#clinical-team-create-name').fill(name);
    await ic.locator('#clinical-team-create-day').selectOption(letter);
    await ic.locator('#clinical-team-create-form [type="submit"]').click();
    await until(async () => !(await ic.locator('#clinical-teams-backdrop.open').count()) && !(await ic.locator('#connection-dropdown.open').count()), 8000, 100);
    await ic.locator('#btn-connection-dropdown-close').click().catch(() => {});
    await ic.keyboard.press('Escape');
    await dismissLearnHub(ic);
  };
  const T_G = `EQUIPO DEMO IC ${gLetter}`;
  const T_2 = `EQUIPO DEMO IC ${otherLetter}`;
  await createIcTeam(T_G, gLetter, true);
  await createIcTeam(T_2, otherLetter, false);
  await goArea(ic, 'lab');
  await pasteAndSave(ic, fullLabs(P3, 'Sep 22 2026 9:00AM'));
  await openPatient(ic, P3);
  await setMode(ic, 'interconsulta');
  // Entering with a patient open lands on that patient; Escape goes back to the board.
  await goArea(ic, 'nota');
  if (await ic.locator('.ic-consult-band').isVisible().catch(() => false)) await ic.keyboard.press('Escape');
  await ic.locator('#ic-board-mount .ic-board-lane').first().waitFor({ state: 'attached' });
  const icChrome = await chromeState(ic);
  check('Nube Interconsultas user: the IC board shows (IC classes on, board not hidden)', icChrome.icMode && icChrome.boardOpen && !icChrome.boardHidden, icChrome);
  const icL = await boardLanes(ic);
  await r.shot(ic, 'ic-nube-board');
  const role = (x) => icL.filter((l) => l.role === x);
  check('Nube IC team on today\'s letter heads the guardia lane and is a drop target',
    role('guardia')[0]?.title === T_G && !!role('guardia')[0]?.drop, role('guardia'));
  check('no postguardia team: the lane says «Sin equipo.» and is not a drop target',
    role('postguardia')[0]?.empty === 'Sin equipo.' && role('postguardia')[0]?.drop === null, role('postguardia'));
  check('UNREACHABLE — 2/5 IC teams and an unknown team id: a 2nd IC team made while one is active is staged for next month and stays off the board (both activo slots empty)',
    !icL.some((l) => (l.title || '').includes(T_2)) && role('activo').every((l) => l.empty === 'Sin equipo asignado.'), icL);

  // ── ⇄ Cuenta rank: an R2 moves freely among R1–R3, never to R4 ──────────
  // Only an R4 or Admin grants R4. A Nube pull used to put the room's old rank
  // back after «Perfil guardado.», and the session kept the picked one.
  const dbRank = () => ic.evaluate(async () => {
    const st = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
    return (await window.electronAPI.dbClinicalProfileGet({ userId: st.clinicalUserId }))?.profile?.rank;
  });
  await closeToasts(ic);
  // Rank lives in the «Mi perfil» window now (not under ⇄ → Cuenta).
  await ic.locator('#profile-toggle-btn').evaluate((b) => b.click());
  const rankSel = ic.locator('#clinical-profile-rank');
  await rankSel.waitFor({ timeout: 10000 });
  const rankOpts = await rankSel.locator('option').allTextContents();
  check('⇄ Cuenta: an R2 is offered R1–R3 only (no R4)', rankOpts.join('|') === 'R1|R2|R3', rankOpts);
  await ic.waitForTimeout(800); // let the modal finish fading in / rebuilding
  await rankSel.selectOption('R3');
  const pickedRank = await rankSel.inputValue();
  await ic.locator('#profile-modal #clinical-profile-form [type="submit"]').click();
  const toastSel = ic.locator('.toast', { hasText: /Perfil guardado|No se guardó/ });
  await toastSel.first().waitFor({ timeout: 15000 }).catch(() => {});
  const rankToast = flat(await toastSel.first().textContent().catch(() => ''));
  // A sync round after the save must not put R2 back.
  const rankNow = await dbRank();
  await ic.waitForTimeout(4000);
  const rankAfter = await dbRank();
  check('choosing R3 says «Perfil guardado.» and R3 is still saved after a Nube sync', /Perfil guardado\./.test(rankToast) && rankAfter === 'R3', { rankToast, rankAfter, pickedRank, rankNow });
  await closeToasts(ic);
  await ic.keyboard.press('Escape');
  await openNubeView(ic, 'equipo');
  await ic.locator('.clinical-teams-leave-btn, .clinical-teams-section').first().waitFor({ timeout: 8000 }).catch(() => {});
  const editBtns = await ic.locator('.clinical-teams-edit-btn:visible').count();
  check('Mi rotación as an R3: no R4-only «Editar» team buttons', editBtns === 0, editBtns);
});
