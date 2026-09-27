#!/usr/bin/env node
/* global document, window */
/**
 * E2E: the four Resumen glance items, driven through the real Electron app
 * with a busy synthetic DEMO patient and a made-up expediente.
 *
 * Ways it can go wrong (each one is a check below):
 *   Care plan row (Soporte, Dieta)
 *     - Soporte / Dieta typed in Estado actual do not show above vitals
 *     - the litres are lost ("Puntillas nasales" without "2 L")
 *     - a click on the care plan does not open Estado actual
 *   Lines / tubes
 *     - an acceso added in Datos does not show, or shows the raw value ("cvc")
 *     - the day count is off by one (insertion day must be día 1)
 *     - an acceso with no date invents a day
 *     - a click on the lines does not open Datos
 *   Antibiotic day
 *     - "DIA 3" on the antibiotic line is dropped from Medicamentos
 *     - a non-antibiotic drug gets a token
 *   Cultures
 *     - a positive culture without antibiogram has no «ATB pendiente»
 *     - a culture with antibiogram shows «ATB pendiente»
 *     - a negative culture or a contaminated sample shows as a pill
 *     - the pill keeps the long sample name («Urocultivo por sonda»)
 *     - hover does not show the antibiogram of a culture that has one
 *     - newest culture is not first
 *     - cultures are lost when labs paint late (deferred fill)
 *     - a click on a culture pill does not open Laboratorio › Cultivos
 *   Fit
 *     - the Resumen scrolls at the maximized window size
 *   Another patient first (one lab draw, 35 pendientes, no eventualidades)
 *     - the Labs header drops «corte HH:MM · N en rango»
 *     - shown pendiente rows + «+N más» do not add up to all 35, or the card scrolls
 *     - an empty Eventualidades card shows
 *
 * Artifact: e2e-artifacts/resumen-glance/<run-id>/ (report.json + screenshots).
 *
 *   node scripts/e2e/resumen-glance.e2e.mjs
 */
import { createRun, onboardLocalOnly, openPatient, pasteAndSave, closeToasts } from './harness.mjs';
import { header, TABLE, fullLabs } from './some-fixtures.mjs';

const P = { exp: '7000411-1', name: 'DEMO GLANCE EXTRAS', room: '511' };
const P2 = { exp: '7000412-2', name: 'DEMO GLANCE PENDIENTES', room: '512' };
const PEND_N = 35;

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function when(dayOff, h, m) {
  const d = new Date(Date.now() + dayOff * 86400000);
  return `${MON[d.getMonth()]} ${d.getDate()} ${d.getFullYear()} ${h % 12 || 12}:${String(m).padStart(2, '0')}${h < 12 ? 'AM' : 'PM'}`;
}
function isoDay(dayOff) {
  const d = new Date(Date.now() + dayOff * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const headerSol = (p, w, sol) => header(p, w).replace(/Solicitud:\t\d+/, `Solicitud:\t${sol}`);

const URO_ATB =
  'BACTERIOLOGIA\nUROCULTIVO POR SONDA\nPRODUCTO\t\n*\nMICROORGANISMO\t\n*\nKlebsiella pneumoniae\n' +
  'CUENTA DE KASS\t\n*\n25,000 UFC/mL\nANTIBIOGRAMA\t\n*\nCEFTRIAXONA\n>32\tR\nAMIKACINA\n<=2\tS\n';
const HEMO_NO_ATB =
  'BACTERIOLOGIA\nHEMOCULTIVO\nPRODUCTO\n*\nPERIFERICO IZQUIERDO\nMICROORGANISMO\n*\nStaphylococcus aureus\n' +
  'CUENTA\n*\n2 colonias\n';
const URO_CONTAMINADA =
  'BACTERIOLOGIA\nUROCULTIVO POR SONDA\nPRODUCTO\t\n*\nMICROORGANISMO\t\n*\nMuestra contaminada\n';
const BH_TODAY =
  'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE + 'HGB\t\tA\t8.20\tg/dL\t12.20 - 18.10\n';

const MEDS = [
  ['abx', 'MEROPENEM 1 G IV C/8 H DIA 3'],
  ['antihta', 'LOSARTÁN 50 MG VO C/12 H'],
  ['diureticos', 'FUROSEMIDA 40 MG IV C/12 H'],
  ['antitromboticos', 'ENOXAPARINA 40 MG SC C/24 H'],
  ['analgesia', 'PARACETAMOL 1 G IV C/8 H'],
  ['nm', 'INSULINA GLARGINA 10 UI SC C/24 H'],
];

const r = createRun('resumen-glance');
const { check, shot } = r;

async function openEstadoActual(page) {
  await closeToasts(page);
  await page.locator('#apptab-nota').click();
  await page.locator('.exp-group-pill[data-group="clinico"]').hover();
  await page.locator('.exp-group-section', { hasText: 'Estado actual' }).click();
  await page.locator('#ea-snapshot').waitFor({ state: 'visible' });
}

async function addMeds(page) {
  for (const [cat, text] of MEDS) {
    const block = page.locator(`[data-ea-med-cat="${cat}"]`);
    if (!(await block.count())) {
      await page.locator('[data-ea-med-pick-category]').selectOption(cat);
      await block.waitFor({ state: 'visible' });
    }
    await block.locator(`[data-ea-med-manual-toggle="${cat}"]`).click();
    await block.locator(`[data-ea-med-manual-input="${cat}"]`).fill(text);
    await block.locator(`[data-ea-med-manual-save="${cat}"]`).click();
    await page.locator(`[data-ea-med-cat="${cat}"]`, { hasText: text }).waitFor({ state: 'visible' });
  }
}

async function openResumen(page) {
  await closeToasts(page);
  await page.locator('#apptab-nota').click();
  await page.locator('button:visible', { hasText: /^\s*Resumen\s*$/ }).first().click().catch(() => {});
  await page.locator('#patient-dashboard-mount .labs-card').waitFor({ timeout: 5000 });
  await page.waitForTimeout(400);
}

function readDash() {
  const root = document.querySelector('#patient-dashboard-mount');
  const dash = root.querySelector('.dash');
  const ctx = [...root.querySelectorAll('.ctx-group')].map((g) => ({
    action: g.getAttribute('data-dash-action'),
    pills: [...g.querySelectorAll('.ctx-pill')].map((p) => p.textContent.replace(/\s+/g, ' ').trim()),
  }));
  const cultivos = [...root.querySelectorAll('.labs-card .cult')].map((c) => ({
    text: ['.cult-sitio', '.cult-org', '.cult-date'].map((q) => c.querySelector(q).textContent).join(' · '),
    pending: c.classList.contains('is-pending'),
    atb: [...c.querySelectorAll('.cult-pop-row')].map((r) => r.textContent),
  }));
  const meds = [...root.querySelectorAll('.meds-card .med')].map((m) => ({
    name: m.querySelector('.name').textContent,
    token: (m.querySelector('.meta') || {}).textContent || '',
    key: !!m.querySelector('.meta.is-key'),
  }));
  const ctxEl = root.querySelector('.dash-context');
  const vitals = root.querySelector('.vitals-labs');
  return {
    ctx,
    ctxAboveVitals: !!(ctxEl && vitals && ctxEl.getBoundingClientRect().bottom <= vitals.getBoundingClientRect().top + 1),
    cultivos,
    meds,
    fit: { scrollHeight: dash.scrollHeight, clientHeight: dash.clientHeight, w: window.innerWidth, h: window.innerHeight },
  };
}

await r.finish('Resumen glance: care plan, lines/tubes, antibiotic day, cultures', async () => {
  const { page, pageErrors } = await r.launch();
  await onboardLocalOnly(page);
  await page.locator('#apptab-lab').click();
  // Another patient first: one draw, many pendientes, no eventualidades.
  await pasteAndSave(page, fullLabs(P2, when(0, 7, 15)));
  await openPatient(page, P2);
  await page.locator('#apptab-nota').click();
  await page.locator('button:visible', { hasText: /^\s*Pendientes\s*$/ }).first().click();
  await page.locator('.todo-toolbar-add-btn:visible').waitFor();
  const addModal = page.locator('.wb-todo-add-modal');
  for (let i = 1; i <= PEND_N; i++) {
    await page.locator('.todo-toolbar-add-btn:visible').click();
    await addModal.locator('.wb-todo-add-text').fill(`DEMO PENDIENTE ${i}`);
    await addModal.locator('[data-wb-todo-add-ok]').click();
    await addModal.waitFor({ state: 'detached' });
  }
  await openResumen(page);
  const p2 = await page.evaluate(() => {
    const root = document.querySelector('#patient-dashboard-mount');
    const dash = root.querySelector('.dash');
    const pend = root.querySelector('.card[data-dash-action="pendientes"]');
    return {
      labsMeta: (root.querySelector('.labs-card .card-h-meta') || {}).textContent || '',
      shown: pend ? [...pend.querySelectorAll('[data-fit-item]')].filter((el) => !el.hidden).length : 0,
      more: pend ? (pend.querySelector('[data-fit-more]') || {}).textContent || '' : '',
      eventualidades: root.querySelectorAll('.card[data-dash-action="eventualidades"]').length,
      fit: { scrollHeight: dash.scrollHeight, clientHeight: dash.clientHeight },
    };
  });
  const moreN = +((p2.more.match(/\+(\d+) más/) || [])[1] || 0);
  check('Labs header reads «corte HH:MM · N en rango» for a single draw', /corte \d{2}:\d{2} · \d+ en rango/.test(p2.labsMeta.replace(/\s+/g, ' ')), p2.labsMeta);
  check(`pendientes: shown rows + «+N más» = ${PEND_N}, no scroll`, p2.shown >= 1 && p2.shown + moreN === PEND_N && p2.fit.scrollHeight <= p2.fit.clientHeight + 1, { ...p2, moreN });
  check('no Eventualidades card when the patient has none', p2.eventualidades === 0, p2.eventualidades);

  await closeToasts(page);
  await page.locator('#apptab-lab').click();

  await pasteAndSave(page, headerSol(P, when(-6, 7, 0), '2600411101') + URO_ATB);
  await pasteAndSave(page, headerSol(P, when(-2, 7, 0), '2600411102') + HEMO_NO_ATB);
  await pasteAndSave(page, headerSol(P, when(-1, 7, 0), '2600411104') + URO_CONTAMINADA);
  await pasteAndSave(page, headerSol(P, when(0, 1, 10), '2600411103') + BH_TODAY);
  await openPatient(page, P);

  await openEstadoActual(page);
  await addMeds(page);
  await page.locator('[data-ea-ec="dieta"]').fill('BLANDA PICADA');
  await page.locator('[data-ea-ec="dieta"]').press('Tab');
  await page.locator('[data-ea-ec="soporte"]').selectOption('Puntillas nasales');
  await page.locator('[data-ea-ec="soporteLitros"]').fill('2');
  await page.locator('[data-ea-ec="soporteLitros"]').press('Tab');

  await openResumen(page);
  // Lines/tubes through Datos, like a user: CVC placed 3 days ago, Foley today, PICC with no date.
  await page.locator('#patient-dashboard-mount .dash-name').click();
  await page.locator('#patient-accesos-list').waitFor({ state: 'visible' });
  const setAcceso = async (i, via, fecha) => {
    const rows = page.locator('#patient-accesos-list .patient-acceso-row');
    if ((await rows.count()) <= i) await page.locator('[data-onclick="addPatientAccesoRow"]').click();
    const row = rows.nth(i);
    await row.locator('.patient-acceso-via').selectOption(via);
    if (fecha) {
      await row.locator('.patient-acceso-fecha').evaluate((el, v) => {
        el.value = v;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, fecha);
    }
  };
  await setAcceso(0, 'cvc', isoDay(-3));
  await setAcceso(1, 'foley', isoDay(0));
  await setAcceso(2, 'picc', '');
  await page.keyboard.press('Escape');
  await openResumen(page);

  const d = await page.evaluate(readDash);
  await shot(page, 'resumen-busy');

  const care = d.ctx.find((g) => g.action === 'estadoActual');
  const lines = d.ctx.find((g) => g.action === 'datos');
  check('care plan row sits above vitals', d.ctxAboveVitals, d.ctx);
  check('care plan shows Soporte with litres', !!care && care.pills.some((p) => /^Soporte Puntillas nasales 2 L$/i.test(p)), care);
  check('care plan shows Dieta', !!care && care.pills.some((p) => /^Dieta Blanda Picada$/i.test(p)), care);
  check('lines: CVC placed 3 days ago is día 4', !!lines && lines.pills.includes('CVC día 4'), lines);
  check('lines: Foley placed today is día 1', !!lines && lines.pills.includes('Sonda Foley día 1'), lines);
  check('lines: PICC with no date shows no day', !!lines && lines.pills.includes('PICC'), lines);

  const mero = d.meds.find((m) => /meropenem/i.test(m.name));
  check('antibiotic keeps its day as a key token', !!mero && /^día \d+$/.test(mero.token) && mero.key, mero);
  check('non-antibiotic drugs have no token', d.meds.filter((m) => !/meropenem/i.test(m.name)).every((m) => !m.token), d.meds);

  check('two positive cultures; negative and contaminated none', d.cultivos.length === 2 && !d.cultivos.some((c) => /contamin/i.test(c.text)), d.cultivos);
  check('short sample names: Hemocultivo, Urocultivo', !!d.cultivos[1] && /^Hemocultivo · /.test(d.cultivos[0].text) && /^Urocultivo · /.test(d.cultivos[1].text), d.cultivos);
  check('newest culture first: S. aureus with ATB pendiente', !!d.cultivos[0] && /aureus/i.test(d.cultivos[0].text) && d.cultivos[0].pending, d.cultivos);
  check('culture with antibiogram has no ATB pendiente', !!d.cultivos[1] && /klebsiella/i.test(d.cultivos[1].text) && !d.cultivos[1].pending, d.cultivos);
  check('culture pill reads SITIO · ORGANISMO · dd/mm', !!d.cultivos[0] && /^Hemocultivo · Staphylococcus aureus · \d{2}\/\d{2}$/.test(d.cultivos[0].text), d.cultivos);
  const withAtb = page.locator('#patient-dashboard-mount .cult', { hasText: /klebsiella/i });
  await withAtb.hover();
  await page.waitForTimeout(200);
  const pop = await withAtb.locator('.cult-pop').evaluate((el) => {
    const r = el.getBoundingClientRect();
    const dash = document.querySelector('#patient-dashboard-mount .dash');
    return { shown: r.width > 0, text: el.textContent, inView: r.bottom <= window.innerHeight, dashScroll: dash.scrollHeight - dash.clientHeight };
  });
  await shot(page, 'culture-hover-antibiogram');
  check('hover shows the antibiogram (R and S rows)', pop.shown && /RCFTX/.test(pop.text) && /SAMIK/.test(pop.text), pop);
  check('culture without antibiogram has no hover panel', !d.cultivos[0].atb.length, d.cultivos[0]);
  await page.mouse.move(5, 5);
  check('Resumen fits the maximized window, no scroll', d.fit.scrollHeight <= d.fit.clientHeight + 1, d.fit);

  // Deferred labs paint: cultures must come back with the late labs fill too.
  await page.evaluate(() => window.renderPatientDashboard(null, { deferLabs: true }));
  await page.waitForTimeout(1200);
  const late = await page.evaluate(readDash);
  check('cultures survive the deferred labs fill', late.cultivos.length === 2, late.cultivos);

  await page.locator('#patient-dashboard-mount .cult').first().click();
  await page.locator('#cultivos-table-container, #lab-inner-cult-mount').locator('visible=true').first().waitFor({ timeout: 5000 }).catch(() => {});
  const cult = await page.evaluate(() => {
    const vis = (el) => !!el && el.getBoundingClientRect().width > 0;
    return { labMount: vis(document.getElementById('lab-inner-cult-mount')), table: vis(document.getElementById('cultivos-table-container')), tabs: [...document.querySelectorAll('[data-lab-inner].active, .exp-segment-btn.active')].map((b) => b.textContent.trim()) };
  });
  await shot(page, 'culture-pill-opens-cultivos');
  check('culture pill click opens Cultivos', cult.labMount || cult.table, cult);
  await openResumen(page);

  await page.locator('#patient-dashboard-mount .ctx-group[data-dash-action="estadoActual"]').click();
  check('care plan click opens Estado actual', await page.locator('#ea-snapshot').isVisible().catch(() => false));
  await openResumen(page);
  await page.locator('#patient-dashboard-mount .ctx-group[data-dash-action="datos"]').click();
  check('lines click opens Datos', await page.locator('#patient-accesos-list').isVisible().catch(() => false));
  await page.keyboard.press('Escape');

  await page.setViewportSize({ width: 1280, height: 800 });
  await openResumen(page);
  const small = await page.evaluate(readDash);
  await shot(page, 'resumen-1280x800');
  check('Resumen fits 1280x800, no scroll', small.fit.scrollHeight <= small.fit.clientHeight + 1, small.fit);

  check('no page errors', !pageErrors.length, pageErrors);
});
