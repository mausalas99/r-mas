#!/usr/bin/env node
/* global document */
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
 *   Restart
 *     - the note, its past copies or the indicaciones are lost
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
import { createRun, onboardLocalOnly, closeToasts, pasteAndSave, openPatient, dismissLearnHub, until } from './harness.mjs';
import { fullLabs } from './some-fixtures.mjs';

const P1 = { exp: '7000621-1', name: 'DEMO NOTA UNO', room: '521' };
const P2 = { exp: '7000622-2', name: 'DEMO NOTA DOS', room: '522' };
const DOCTOR = 'Dr. Demo Nota';
const PROFESOR = 'Dra. Demo Profesora';
const DX_A = 'DEMO NEUMONIA ADQUIRIDA';
const DX_B = 'DEMO DIABETES TIPO 2';
const DX_C = 'DEMO ANEMIA NORMOCITICA';
const INTERROGATORIO = 'DEMO refiere disnea & tos; niega fiebre <38';
const EVOLUCION = 'N: DEMO alerta\nV: DEMO puntas nasales 2 L\nHD: DEMO estable';
const ESTUDIOS = '22/09/26\nDEMO QS normal';
const TX = ['DEMO CEFTRIAXONA 1 G IV CADA 24 H', 'DEMO BORRAR ESTA FILA', 'DEMO PARACETAMOL 1 G VO CADA 8 H'];

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
  await closeToasts(page);
  if (!(await page.locator('#ic-board-mount .p-name').locator('visible=true').count())) {
    await page.locator('#apptab-nota').click();
    await page.locator('.exp-group-pill[data-group="paciente"]').click();
    await page.locator('[data-ic-back-to-board]').click();
  }
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
  await page.locator('#apptab-nota').click();
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
const field = (page, arg) => page.locator(`#note-form [data-oninput-args='["${arg}"]']`);
const indField = (page, arg) => page.locator(`#indica-form [data-oninput-args='["${arg}"]']`);

await r.finish('Nota de evolución + Indicaciones: profile, census dx, rows, Word x2, past copies, restart', async () => {
  const { app, page, pageErrors } = await r.launch();
  await onboardLocalOnly(page);

  await page.locator('#profile-toggle-btn').click();
  await page.locator('#profile-doctor').fill(DOCTOR);
  await page.getByRole('button', { name: 'Guardar perfil' }).click();
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');

  await page.locator('#apptab-lab').click();
  await pasteAndSave(page, fullLabs(P1, 'Sep 22 2026 8:00AM'));
  await pasteAndSave(page, fullLabs(P2, 'Sep 22 2026 8:30AM'));
  await openPatient(page, P2);
  await openPatient(page, P1);

  // ── Sala › Resumen › Datos: census diagnoses ──────────────────────────
  await page.locator('#apptab-nota').click();
  await page.locator('.dash-name:visible').first().click();
  await page.locator('#patient-dx-paste').waitFor({ state: 'visible' });
  await page.locator('#patient-dx-paste').fill(`${DX_A.toLowerCase()} + ${DX_B.toLowerCase()}`);
  await page.getByRole('button', { name: 'Separar por +' }).click();
  const censoDx = await page.locator('#patient-dx-list input').evaluateAll((els) => els.map((e) => e.value).filter(Boolean));
  check('Datos: «Separar por +» makes two upper-case census diagnoses', censoDx.join('|') === `${DX_A}|${DX_B}`, censoDx);
  await page.keyboard.press('Escape');
  check('Escape closes «Datos del paciente»', await until(async () => !(await page.locator('#exp-datos-modal-backdrop.open').count()), 3000));

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
  check('board header: «+ Agregar» is the first button, ahead of «Actualizar pacientes»',
    /<div class="ic-board-header">\s*<button[^>]*data-ic-board-add/.test(boardHtml));
  const laneCount = (boardHtml.match(/<section class="ic-board-lane/g) || []).length;
  // 4 fixed lanes (guardia/postguardia/activo x2, all "no team today" with
  // no teams configured) plus a 5th "Sin equipo" lane for P1/P2, who have
  // no team assignment.
  check('board renders its lanes (4 fixed + «Sin equipo» for unassigned patients)', laneCount === 5, laneCount);
  check('no rollover button on the board (feature was removed)', !boardHtml.includes('Terminar guardia y repartir pacientes'));
  check('patients with no team land under «Sin equipo» instead of disappearing',
    boardHtml.includes('Sin equipo') && boardHtml.includes(P1.name) && boardHtml.includes(P2.name));

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

  await pickPatient(page, P1);
  await goClinico(page, 'notas');
  let s = await noteState(page);
  await r.shot(page, 'note-open');
  check('Médico comes from Mi Perfil', s.medico === DOCTOR && !s.profesor, { medico: s.medico, profesor: s.profesor });
  // «Profesor en nota» only shows in Interconsulta: set it now, the open note fills in.
  await page.locator('#profile-toggle-btn').click();
  await page.locator('#profile-profesor').fill(PROFESOR);
  await page.getByRole('button', { name: 'Guardar perfil' }).click();
  await page.waitForTimeout(400);
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

  // ── Restart ───────────────────────────────────────────────────────────
  const errors = [...pageErrors];
  await app.close();
  const again = await r.launch();
  await again.page.locator('#apptab-lab').waitFor({ state: 'visible', timeout: 30000 });
  await dismissLearnHub(again.page);
  await pickPatient(again.page, P1);
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
});
