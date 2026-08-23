import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderConsultaIcIdentityHtml,
  renderVisitSelectorHtml,
  renderFaseComorbilidadesHtml,
  renderInternamientoHtml,
  renderWorkupHtml,
  renderLabsHtml,
  renderEchoHtml,
  renderDeviceHtml,
  renderScoresHtml,
  renderTratamientoActualHtml,
  renderConsultaIcHtml,
} from './consulta-ic-html.mjs';
import { emptyConsultaEntry } from '../../../../lib/cardio/consulta-seguimiento.mjs';
import { emptyWorkup } from '../../../../lib/cardio/hf-workup.mjs';
import { emptyDevice } from '../../../../lib/cardio/hf-device.mjs';
import { emptyFantasticos } from '../../../../lib/cardio/med-segments.mjs';

test('renderConsultaIcIdentityHtml shows nombre/registro/edad, falling back to expediente', () => {
  const html = renderConsultaIcIdentityHtml({ nombre: 'Juan Pérez', expediente: 'EXP-9', edad: '68' });
  assert.match(html, /Juan Pérez/);
  assert.match(html, /EXP-9/);
  assert.match(html, />68</);
});

test('renderConsultaIcIdentityHtml falls back to placeholders when empty', () => {
  const html = renderConsultaIcIdentityHtml({});
  assert.match(html, /Paciente/);
  assert.match(html, /—/);
});

test('renderVisitSelectorHtml carries the current date and existing visit list', () => {
  const html = renderVisitSelectorHtml({ date: '2026-03-01', existingDates: ['2026-03-01', '2026-01-10'] });
  assert.match(html, /data-hf-consulta-date/);
  assert.match(html, /value="2026-03-01"/);
  assert.match(html, /2026-03-01, 2026-01-10/);
});

test('renderFaseComorbilidadesHtml renders the enum select and comorbilidad rows', () => {
  const entry = Object.assign(emptyConsultaEntry(), { faseSeguimiento: 'IC avanzada', comorbilidades: [] });
  const html = renderFaseComorbilidadesHtml(entry);
  assert.match(html, /data-hf-consulta="faseSeguimiento"/);
  assert.match(html, /selected>IC avanzada</);
  assert.match(html, /Sin comorbilidades registradas/);
});

test('renderInternamientoHtml shows a "(valor previo)" fallback for a legacy escaloDiureticosVia value', () => {
  const entry = Object.assign(emptyConsultaEntry(), { escaloDiureticosVia: 'Intravenosa (legacy)' });
  const html = renderInternamientoHtml(entry);
  assert.match(html, /Intravenosa \(legacy\) \(valor previo\)/);
});

test('renderWorkupHtml covers every workup sub-section with its data-hf-workup path', () => {
  const html = renderWorkupHtml(emptyWorkup());
  assert.match(html, /data-hf-workup="hierro\.estadoEstudio"/);
  assert.match(html, /data-hf-workup-tri="hierro\.deficienciaHierro"/);
  assert.match(html, /data-hf-workup="fa\.cha2ds2vasc"/);
  assert.match(html, /data-hf-workup="valvular\.severidad"/);
  assert.match(html, /data-hf-workup="sueno\.stopbang"/);
});

test('renderLabsHtml shows the Previo/Actual table plus a draft "Nueva medición" form', () => {
  const html = renderLabsHtml({
    previo: { values: { cr: 1.1 } },
    actual: { values: { cr: 1.4 } },
    draft: { date: '2026-03-01', cr: '' },
  });
  assert.match(html, /Previo/);
  assert.match(html, />1\.1 mg\/dL</);
  assert.match(html, />1\.4 mg\/dL</);
  assert.match(html, /data-hf-lab-new="cr"/);
  assert.match(html, /data-hf-lab-action="prefill"/);
  assert.match(html, /data-hf-lab-action="save"/);
});

test('renderEchoHtml renders the full field set and a save action', () => {
  const html = renderEchoHtml({ previo: null, actual: null, draft: {} });
  assert.match(html, /data-hf-echo-new="fevi"/);
  assert.match(html, /data-hf-echo-new="vexus"/);
  assert.match(html, /data-hf-echo-action="save"/);
});

test('renderDeviceHtml carries tri-state and enum device fields', () => {
  const html = renderDeviceHtml(emptyDevice());
  assert.match(html, /data-hf-device-tri="tieneIndicacion"/);
  assert.match(html, /data-hf-device="tipo"/);
});

test('renderScoresHtml renders NYHA as an enum select and numeric fields for the rest', () => {
  const html = renderScoresHtml({ previo: null, actual: null, draft: {} });
  assert.match(html, /data-hf-score-new="nyha"/);
  assert.match(html, /data-hf-score-new="kccq"/);
  assert.match(html, /data-hf-score-action="save"/);
});

test('renderTratamientoActualHtml shows read-only fantasticos and editable máxima-tolerada flags', () => {
  const fantasticos = emptyFantasticos();
  fantasticos[0].drug = 'Sacubitrilo/Valsartán';
  const html = renderTratamientoActualHtml(fantasticos, { bb: true, arm: null });
  assert.match(html, /Sacubitrilo\/Valsartán/);
  assert.match(html, /data-hf-consulta-gdmt="bb"/);
  assert.match(html, /data-hf-consulta-gdmt="arm"/);
});

function fullCtx(step) {
  return {
    patient: { nombre: 'Ana', registro: 'R-1', edad: '55' },
    entry: emptyConsultaEntry(),
    existingDates: [],
    workup: emptyWorkup(),
    device: emptyDevice(),
    labs: { previo: null, actual: null, draft: {} },
    echo: { previo: null, actual: null, draft: {} },
    scores: { previo: null, actual: null, draft: {} },
    fantasticos: emptyFantasticos(),
    step: step,
  };
}

test('renderConsultaIcHtml is a step wizard: identity/date always shown, one step body at a time', () => {
  const html0 = renderConsultaIcHtml(fullCtx(0));
  assert.match(html0, /Ana/);
  assert.match(html0, /Fase \/ Comorbilidades/);
  assert.doesNotMatch(html0, /Workup/);

  const html1 = renderConsultaIcHtml(fullCtx(1));
  assert.match(html1, /Ana/);
  assert.match(html1, /Workup/);
  assert.doesNotMatch(html1, /Fase \/ Comorbilidades/);

  const html2 = renderConsultaIcHtml(fullCtx(2));
  assert.match(html2, /Labs Previo \/ Actual/);

  const html3 = renderConsultaIcHtml(fullCtx(3));
  assert.match(html3, /Eco Previo \/ Actual/);
  assert.match(html3, /ECG/);
  assert.match(html3, /Dispositivo/);

  const html4 = renderConsultaIcHtml(fullCtx(4));
  assert.match(html4, /Scores Previo \/ Actual/);
  assert.match(html4, /Tratamiento actual/);

  const html5 = renderConsultaIcHtml(fullCtx(5));
  assert.match(html5, /Apreciativo \/ Plan/);
});
