#!/usr/bin/env node
/* global document */
/**
 * E2E: paste anywhere with an interconsulta «SUGERENCIAS POR MEDICINA INTERNA»
 * note fills the open patient's Indicaciones. Real Electron app, real
 * clipboard, synthetic DEMO interconsulta patients and made-up values only.
 *
 * Ways it can go wrong (each one is a check below):
 *   - the paste is not caught, or lands in Labs / Medicamentos instead
 *   - a section goes to the wrong box, or keeps its «1.» numbers
 *   - PLAN DE LÍQUIDOS / IMAGEN / RECOMENDACIONES are lost (no fixed box)
 *   - the note's date is not used as the Indicaciones date
 *   - a second paste over content does not ask, or «Reemplazar» keeps old
 *     lines, or «Agregar al final» drops them
 *   - in Sala mode (no Indicaciones tab) the paste is swallowed instead of
 *     reaching the text box the user pasted into
 *   - the preview does not show the pasted sections
 *   - an uncaught page error
 *
 * Artifact: e2e-artifacts/ic-sugerencias-paste/<run-id>/ (report.json + screenshots).
 *
 *   node scripts/e2e/ic-sugerencias-paste.e2e.mjs
 */
import { createRun, onboardLocalOnly, closeToasts, goArea, until } from './harness.mjs';

const r = createRun('ic-sugerencias-paste');
const { check } = r;

const NOTE_A = [
  'SUGERENCIAS POR MEDICINA INTERNA',
  '03/03/2030',
  'DIETA',
  '',
  '1. INICIAR DIETA BLANDA DE 1500 KCAL CON 60 G DE PROTEINA.',
  '',
  'PLAN DE LÍQUIDOS',
  '',
  '1. SIN CAMBIOS EN EL MANEJO ACTUAL',
  '',
  'CUIDADOS:',
  '',
  '1. CUANTIFICAR DIURESIS DE 24 HORAS.',
  '2. GLUCOMETRÍAS CAPILARES CADA 8 HORAS.',
  '',
  'MEDICAMENTOS:',
  '',
  '1. AJUSTAR INSULINA GLARGINA A 8 UI SC CADA 24 HORAS.',
  '2. CONTINUAR PARACETAMOL 500 MG VO CADA 8 HORAS',
  '',
  'RESTO DE INDICACIONES SIN CAMBIOS POR PARTE DEL SERVICIO TRATANTE.',
  'LABORATORIOS:',
  '',
  '1. ELECTROLITOS SÉRICOS DE CONTROL EN AM.',
  '',
  'IMAGEN:',
  '',
  '1. SIN CAMBIOS',
  '',
  'RECOMENDACIONES:',
  '',
  '1. AVISAR ANTE GLUCOSA MENOR DE 70 MG/DL.',
].join('\n');

const NOTE_B = [
  'SUGERENCIAS POR MEDICINA INTERNA',
  '04/03/2030',
  'DIETA',
  '1. DIETA NORMAL DEMO.',
  'MEDICAMENTOS:',
  '1. SUSPENDER PARACETAMOL.',
  'RECOMENDACIONES:',
  '1. VIGILAR DEMO.',
].join('\n');

async function setMode(page, mode) {
  await closeToasts(page);
  await page.locator('#header-mode-seg').hover();
  const btn = page.locator(`#header-mode-seg button[data-mode="${mode}"]`);
  await btn.waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
  await btn.click();
  await page.waitForTimeout(600);
  await closeToasts(page);
}

async function pasteAnywhere(app, page, text) {
  await closeToasts(page);
  await app.evaluate(({ clipboard }, t) => clipboard.writeText(t), text);
  await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
  await page.keyboard.press('ControlOrMeta+V');
  await page.waitForTimeout(700);
}

/** Indicaciones form as plain data ({} when the form is not on screen). */
function readIndica(page) {
  return page.evaluate(() => {
    const form = document.getElementById('indica-form');
    if (!form || !form.offsetParent) return {};
    const out = { otros: [] };
    for (const k of ['dieta', 'cuidados', 'estudios', 'medicamentos', 'interconsultas']) {
      const ta = form.querySelector(`textarea[data-oninput-args='["${k}"]']`);
      out[k] = ta ? ta.value : null;
    }
    const fecha = form.querySelector(`input[data-oninput-args='["fecha"]']`);
    out.fecha = fecha ? fecha.value : null;
    form.querySelectorAll('#otros-list .otros-item').forEach((it) => {
      out.otros.push({ titulo: it.querySelector('input').value, contenido: it.querySelector('textarea').value });
    });
    return out;
  });
}

async function answerConfirm(page, which) {
  const btn = page.locator(which === 'replace' ? '[data-wb-confirm-secondary]' : '[data-wb-confirm-ok]');
  const shown = await btn.isVisible({ timeout: 4000 }).catch(() => false);
  if (shown) await btn.click();
  await page.waitForTimeout(700);
  return shown;
}

await r.finish('IC «SUGERENCIAS» paste anywhere → Indicaciones', async () => {
  const { app, page, pageErrors } = await r.launch();
  await onboardLocalOnly(page);
  await setMode(page, 'interconsulta');
  await page.locator('body').click({ position: { x: 5, y: 5 } }).catch(() => {});
  await page.keyboard.press('Meta+Alt+Shift+KeyI');
  await page.waitForTimeout(600);
  const board = page.locator('#ic-board-mount');
  if (!(await board.isVisible())) await goArea(page, 'nota');
  await board.locator('.ic-card').first().waitFor({ state: 'visible', timeout: 8000 });
  await board.locator('.ic-card').first().click();
  await page.locator('.ic-consult-band').waitFor({ state: 'visible', timeout: 8000 });

  // ── First paste: empty indicaciones → no question, fills every box ───────
  await pasteAnywhere(app, page, NOTE_A);
  await answerConfirm(page, 'replace'); // a format profile may pre-fill the doc
  const a = await until(async () => {
    const v = await readIndica(page);
    return v.dieta ? v : null;
  }, 6000).then(() => readIndica(page));
  await r.shot(page, 'after-first-paste');
  check('Indicaciones opens with DIETA filled, number removed', a.dieta === 'INICIAR DIETA BLANDA DE 1500 KCAL CON 60 G DE PROTEINA.', a);
  check('CUIDADOS has both items', a.cuidados === 'CUANTIFICAR DIURESIS DE 24 HORAS.\nGLUCOMETRÍAS CAPILARES CADA 8 HORAS.', a.cuidados);
  check('MEDICAMENTOS keeps the «RESTO DE INDICACIONES…» line', /PARACETAMOL[\s\S]*RESTO DE INDICACIONES/.test(a.medicamentos || ''), a.medicamentos);
  check('LABORATORIOS goes to Estudios', a.estudios === 'ELECTROLITOS SÉRICOS DE CONTROL EN AM.', a.estudios);
  const titles = (a.otros || []).map((o) => o.titulo);
  check('PLAN DE LÍQUIDOS, IMAGEN, RECOMENDACIONES kept as Otros sections',
    JSON.stringify(titles) === JSON.stringify(['PLAN DE LÍQUIDOS', 'IMAGEN', 'RECOMENDACIONES']), a.otros);
  check('the note date is the Indicaciones date', a.fecha === '03/03/2030', a.fecha);

  // ── Second paste, «Reemplazar»: only the new note is left ────────────────
  await pasteAnywhere(app, page, NOTE_B);
  check('a paste over content asks first', await answerConfirm(page, 'replace'));
  const b = await readIndica(page);
  check('Reemplazar: MEDICAMENTOS is only the new line', b.medicamentos === 'SUSPENDER PARACETAMOL.', b.medicamentos);
  check('Reemplazar: old CUIDADOS and Otros are gone',
    b.cuidados === '' && JSON.stringify(b.otros) === JSON.stringify([{ titulo: 'RECOMENDACIONES', contenido: 'VIGILAR DEMO.' }]), b);

  // ── Third paste, «Agregar al final»: lines added under the old ones ──────
  await pasteAnywhere(app, page, NOTE_A);
  await answerConfirm(page, 'append');
  const c = await readIndica(page);
  check('Agregar: DIETA keeps the old line and adds the new one',
    c.dieta === 'DIETA NORMAL DEMO.\nINICIAR DIETA BLANDA DE 1500 KCAL CON 60 G DE PROTEINA.', c.dieta);
  const rec = (c.otros || []).find((o) => o.titulo === 'RECOMENDACIONES');
  check('Agregar: same-title Otros section gets the lines added, not doubled',
    (c.otros || []).filter((o) => o.titulo === 'RECOMENDACIONES').length === 1 &&
      rec && rec.contenido === 'VIGILAR DEMO.\nAVISAR ANTE GLUCOSA MENOR DE 70 MG/DL.', c.otros);
  await r.shot(page, 'after-append');

  // ── Preview shows the pasted sections ────────────────────────────────────
  await page.locator('#btn-gen-ind').click();
  await page.waitForTimeout(1200);
  const previewText = await page.evaluate(() => {
    const frames = Array.from(document.querySelectorAll('iframe'));
    const f = frames.find((x) => x.offsetParent && x.contentDocument && /INDICACIONES/.test(x.contentDocument.body.innerText));
    return f ? f.contentDocument.body.innerText : document.body.innerText;
  });
  check('preview lists PLAN DE LÍQUIDOS and the new DIETA', /PLAN DE LÍQUIDOS/.test(previewText) && /DIETA BLANDA/.test(previewText));
  await r.shot(page, 'preview');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // ── Sala mode: the paste reaches the text box ────────────────────────────
  await setMode(page, 'sala');
  await closeToasts(page);
  await app.evaluate(({ clipboard }, t) => clipboard.writeText(t), NOTE_B);
  await page.locator('#patient-search').fill('');
  await page.locator('#patient-search').focus();
  await page.keyboard.press('ControlOrMeta+V');
  await page.waitForTimeout(600);
  const searchVal = await page.locator('#patient-search').inputValue();
  check('Sala mode: the paste goes into the focused box, not swallowed', /SUGERENCIAS/.test(searchVal), searchVal.slice(0, 80));
  await page.locator('#patient-search').fill('');

  check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 5));
  await app.close();
});
