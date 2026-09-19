import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderConsultaIcIdentityHtml,
  renderVisitSelectorHtml,
  renderFaseHtml,
  renderComorbilidadesHtml,
  renderInternamientoHtml,
  renderReingresoDesenlacesHtml,
  renderReingresoTmoStepHtml,
  renderSubjetivoObjetivoHtml,
  WORKUP_GROUP_COUNT,
  WORKUP_GROUP_TITLES,
  renderWorkupTabsHtml,
  LAB_ROWS_DEF,
  renderLabsStepHtml,
  ECHO_ROWS_DEF,
  renderEcoStepHtml,
  renderDeviceHtml,
  renderEcgHtml,
  renderScoresStepHtml,
  SCORE_ROWS_DEF,
  renderTratamientoActualHtml,
  renderApreciativoPlanHtml,
  CONSULTA_IC_STEP_COUNT,
  CONSULTA_IC_STEP_TITLES,
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

test('renderFaseHtml renders the enum select', () => {
  const entry = Object.assign(emptyConsultaEntry(), { faseSeguimiento: 'IC avanzada' });
  const html = renderFaseHtml(entry);
  assert.match(html, /data-hf-consulta="faseSeguimiento"/);
  assert.match(html, /selected>IC avanzada</);
});

test('renderComorbilidadesHtml collapses closed with no rows, open when rows exist', () => {
  const closed = renderComorbilidadesHtml(Object.assign(emptyConsultaEntry(), { comorbilidades: [] }));
  assert.match(closed, /Sin comorbilidades registradas/);
  assert.doesNotMatch(closed, /<details class="hf-section" open>/);
  const open = renderComorbilidadesHtml(
    Object.assign(emptyConsultaEntry(), { comorbilidades: [{ id: '1', value: 'DM2', otra: '' }] })
  );
  assert.match(open, /<details class="hf-section" open>/);
});

test('renderInternamientoHtml shows a "(valor previo)" fallback for a legacy escaloDiureticosVia value', () => {
  const entry = Object.assign(emptyConsultaEntry(), { escaloDiureticosVia: 'Intravenosa (legacy)' });
  const html = renderInternamientoHtml(entry);
  assert.match(html, /Intravenosa \(legacy\) \(valor previo\)/);
});

test('renderReingresoDesenlacesHtml collapses closed with no data, open when reingreso/muerte is set', () => {
  const closed = renderReingresoDesenlacesHtml(emptyConsultaEntry());
  assert.doesNotMatch(closed, /<details class="hf-section" open>/);
  const open = renderReingresoDesenlacesHtml(Object.assign(emptyConsultaEntry(), { reingresoHospitalario: true }));
  assert.match(open, /<details class="hf-section" open>/);
  assert.match(open, /data-hf-consulta-tri="reingresoHospitalario"/);
});

test('renderReingresoDesenlacesHtml stays closed when ta was touched then cleared (empty string, not null)', () => {
  const html = renderReingresoDesenlacesHtml(Object.assign(emptyConsultaEntry(), { ta: '' }));
  assert.doesNotMatch(html, /<details class="hf-section" open>/);
});

test('reingreso TA renders as two side-by-side sistólica/diastólica inputs, seeded by splitting "sis/dia"', () => {
  const html = renderReingresoDesenlacesHtml(Object.assign(emptyConsultaEntry(), { ta: '120/80' }));
  assert.match(html, /data-hf-consulta-ta="sistolica" value="120"/);
  assert.match(html, /data-hf-consulta-ta="diastolica" value="80"/);
  assert.doesNotMatch(html, /data-hf-consulta="ta"/); // old single TA input is gone
});

test('reingreso TA opens (has data) once ta is a non-empty split string', () => {
  const html = renderReingresoDesenlacesHtml(Object.assign(emptyConsultaEntry(), { ta: '120/80' }));
  assert.match(html, /<details class="hf-section" open>/);
});

test('renderSubjetivoObjetivoHtml renders structured checklists, not free-text narratives', () => {
  const entry = emptyConsultaEntry();
  const html = renderSubjetivoObjetivoHtml(entry, { previo: null, actual: { nyha: 'II' } });
  assert.match(html, /data-hf-consulta-subj="disneaEsfuerzo"/);
  assert.match(html, /data-hf-consulta-subj="ortopnea"/);
  assert.match(html, /data-hf-consulta-subj="nota"/);
  assert.match(html, /data-hf-consulta-obj-tri="ingurgitacionYugular"/);
  assert.match(html, /data-hf-consulta-obj="ruidosCardiacos"/);
  assert.match(html, /data-hf-consulta-obj-tri="estertores"/);
  assert.match(html, /data-hf-consulta-obj="edemaMi"/);
  assert.match(html, /data-hf-consulta-obj="fc"/);
  // NYHA shown read-only from the Scores step's data, not re-entered here
  assert.match(html, /NYHA actual<\/span> <b>II<\/b>/);
  assert.doesNotMatch(html, /data-hf-consulta="subjetivo"/);
  assert.doesNotMatch(html, /data-hf-consulta="objetivo"/);
});

test('renderSubjetivoObjetivoHtml falls back to a read-only legacy narrative when the entry predates the checklist', () => {
  const entry = Object.assign(emptyConsultaEntry(), { subjetivo: 'Se siente mejor', objetivo: 'Edema en descenso' });
  const html = renderSubjetivoObjetivoHtml(entry, { previo: null, actual: null });
  assert.match(html, /Se siente mejor/);
  assert.match(html, /Edema en descenso/);
  assert.match(html, /texto libre previo, solo lectura/);
  assert.doesNotMatch(html, /data-hf-consulta-subj="disneaEsfuerzo"/);
  assert.doesNotMatch(html, /data-hf-consulta-obj-tri="ingurgitacionYugular"/);
});

test('workup renders as a 9-tab segmented control, one subsystem visible at a time', () => {
  assert.equal(WORKUP_GROUP_COUNT, 9);
  assert.equal(WORKUP_GROUP_TITLES.length, 9);
  const tab0 = renderWorkupTabsHtml(emptyWorkup(), 0);
  assert.match(tab0, /data-hf-workup-tab="0"/);
  assert.match(tab0, /hf-seg-tab--active/);
  assert.match(tab0, /data-hf-workup="hierro\.estadoEstudio"/);
  assert.doesNotMatch(tab0, /data-hf-workup="valvular\.severidad"/);
  const tabLast = renderWorkupTabsHtml(emptyWorkup(), 8);
  assert.match(tabLast, /data-hf-workup="valvular\.severidad"/);
  assert.doesNotMatch(tabLast, /data-hf-workup="hierro\.estadoEstudio"/);
  // out-of-range index clamps instead of throwing
  assert.doesNotThrow(() => renderWorkupTabsHtml(emptyWorkup(), 99));
});

test('renderLabsStepHtml shows two glance cards (table + nueva medición) opening modals, no raw table', () => {
  const model = { previo: { values: { cr: 1.1 } }, actual: { values: { cr: 1.4, tfge: 55, ntProBnp: 900 } }, draft: {} };
  const html = renderLabsStepHtml(model);
  assert.match(html, /data-hf-modal-open="labs-table"/);
  assert.match(html, /data-hf-modal-open="labs-new"/);
  assert.doesNotMatch(html, /hf-prev-actual-table/);
  assert.match(html, /1\.4 mg\/dL/);
});

test('LAB_ROWS_DEF/ECHO_ROWS_DEF still cover every original row (no fields dropped)', () => {
  assert.match(LAB_ROWS_DEF.map((r) => r.key).join(','), /troponina/);
  assert.equal(LAB_ROWS_DEF.length, 23);
  assert.match(ECHO_ROWS_DEF.map((r) => r.key).join(','), /lineasBPorCampo/);
  assert.equal(ECHO_ROWS_DEF.length, 34);
});

test('renderEcoStepHtml shows glance cards for the echo table plus inline ECG/Dispositivo', () => {
  const model = { previo: {}, actual: { fevi: 45 }, draft: {} };
  const html = renderEcoStepHtml(model, emptyDevice(), emptyConsultaEntry());
  assert.match(html, /data-hf-modal-open="eco-table"/);
  assert.match(html, /data-hf-modal-open="eco-new"/);
  assert.match(html, /FEVI 45 %/);
  assert.match(html, /data-hf-consulta="ekgFecha"/); // ECG stays inline
  assert.match(html, /data-hf-device="tipo"/); // Dispositivo stays inline
});

test('renderDeviceHtml/renderEcgHtml carry tri-state and enum fields', () => {
  const device = renderDeviceHtml(emptyDevice());
  assert.match(device, /data-hf-device-tri="tieneIndicacion"/);
  assert.match(device, /data-hf-device="tipo"/);
  const ecg = renderEcgHtml(emptyConsultaEntry());
  assert.match(ecg, /data-hf-consulta="ekgDescripcion"/);
});

test('renderScoresStepHtml shows one glance card opening the scores modal', () => {
  const html = renderScoresStepHtml({ previo: null, actual: { nyha: 'II', kccq: 70 } });
  assert.match(html, /data-hf-modal-open="scores"/);
  assert.match(html, /NYHA II/);
  assert.equal(SCORE_ROWS_DEF.length, 7);
});

test('renderTratamientoActualHtml shows read-only fantasticos, collapses "dosis máxima tolerada" behind a toggle', () => {
  const fantasticos = emptyFantasticos();
  fantasticos[0].drug = 'Sacubitrilo/Valsartán';
  const entry = Object.assign(emptyConsultaEntry(), { gdmtMaxTolerada: { bb: true, arm: null } });
  const html = renderTratamientoActualHtml(fantasticos, entry);
  assert.match(html, /Sacubitrilo\/Valsartán/);
  assert.match(html, /data-hf-consulta-gdmt="bb"/);
  assert.doesNotMatch(html, /data-hf-consulta="scoreTmo"/); // TMO moved to its own step
  assert.match(html, /<details open>/); // bb has data -> tolerada toggle starts open
  assert.match(html, /data-hf-goto-manejo/); // jumps to the top-level Manejo tab to edit GDMT
});

test('renderReingresoTmoStepHtml shows reingreso fields always-visible and collapses TMO behind a toggle', () => {
  const entry = Object.assign(emptyConsultaEntry(), { reingresoHospitalario: true, scoreTmo: 5 });
  const html = renderReingresoTmoStepHtml(entry);
  assert.match(html, /data-hf-consulta-tri="reingresoHospitalario"/);
  assert.match(html, /data-hf-consulta="scoreTmo"/);
  assert.match(html, /data-hf-consulta-dosis-titulada="bb"/);
});

test('renderApreciativoPlanHtml collapses apreciativo, keeps plan always visible', () => {
  const closed = renderApreciativoPlanHtml(emptyConsultaEntry());
  assert.match(closed, /data-hf-consulta="plan"/);
  assert.doesNotMatch(closed, /<details class="hf-section" open>/);
  const open = renderApreciativoPlanHtml(Object.assign(emptyConsultaEntry(), { apreciativo: 'Mejoría clínica' }));
  assert.match(open, /<details class="hf-section" open>/);
});

test('renderApreciativoPlanHtml shows the "cerrar consulta" button when open, the closed summary once cerrada', () => {
  const open = renderApreciativoPlanHtml(emptyConsultaEntry());
  assert.match(open, /data-hf-cerrar-consulta>Cerrar consulta y agendar próxima</);

  const cerrada = renderApreciativoPlanHtml(
    Object.assign(emptyConsultaEntry(), { cerrada: true, proximaConsultaFecha: '2026-04-01' })
  );
  assert.doesNotMatch(cerrada, /data-hf-cerrar-consulta>/);
  assert.match(cerrada, /Consulta cerrada/);
  assert.match(cerrada, /2026-04-01/);
});

function fullCtx(step, extra) {
  return Object.assign(
    {
      patient: { nombre: 'Ana', registro: 'R-1', edad: '55' },
      entry: emptyConsultaEntry(),
      existingDates: [],
      workup: emptyWorkup(),
      workupTab: 0,
      device: emptyDevice(),
      labs: { previo: null, actual: null, draft: {} },
      echo: { previo: null, actual: null, draft: {} },
      scores: { previo: null, actual: null, draft: {} },
      fantasticos: emptyFantasticos(),
      step: step,
      openModal: null,
    },
    extra
  );
}

test('CONSULTA_IC_STEP_TITLES/COUNT: 8-step wizard (was 32 in the rejected paging version)', () => {
  assert.equal(CONSULTA_IC_STEP_TITLES.length, CONSULTA_IC_STEP_COUNT);
  assert.equal(CONSULTA_IC_STEP_COUNT, 8);
});

test('renderConsultaIcHtml is a step wizard: identity/date always shown, one step body at a time', () => {
  const html0 = renderConsultaIcHtml(fullCtx(0));
  assert.match(html0, /Ana/);
  assert.match(html0, /Fase y comorbilidades/);
  assert.doesNotMatch(html0, /data-hf-workup-tab/);

  const html2 = renderConsultaIcHtml(fullCtx(2));
  assert.match(html2, /data-hf-workup-tab="0"/);

  for (let i = 0; i < CONSULTA_IC_STEP_COUNT; i++) {
    const html = renderConsultaIcHtml(fullCtx(i));
    assert.match(html, /Ana/);
    assert.match(html, new RegExp('Paso ' + (i + 1) + ' de ' + CONSULTA_IC_STEP_COUNT));
  }

  const lastHtml = renderConsultaIcHtml(fullCtx(CONSULTA_IC_STEP_COUNT - 1));
  assert.match(lastHtml, /Impresión \/ Plan/);
  assert.match(lastHtml, /data-hf-consulta="plan"/);
});

test('renderConsultaIcHtml renders the requested modal (labs-table) with its close button, none when openModal is null', () => {
  const withModal = renderConsultaIcHtml(fullCtx(3, { openModal: 'labs-table' }));
  assert.match(withModal, /data-hf-modal-backdrop/);
  assert.match(withModal, /data-hf-modal-close/);
  assert.match(withModal, /Labs — Previo \/ Actual/);

  const withoutModal = renderConsultaIcHtml(fullCtx(3, { openModal: null }));
  assert.doesNotMatch(withoutModal, /data-hf-modal-backdrop/);
});

test('renderConsultaIcHtml labs-new modal carries prefill + save + all 22 fields', () => {
  const html = renderConsultaIcHtml(fullCtx(3, { openModal: 'labs-new', labs: { previo: null, actual: null, draft: { date: '2026-03-01' } } }));
  assert.match(html, /data-hf-lab-action="prefill"/);
  assert.match(html, /data-hf-lab-action="save"/);
  assert.match(html, /data-hf-lab-new="troponina"/);
});

test('renderConsultaIcHtml eco-new modal carries save + all fields + nota', () => {
  const html = renderConsultaIcHtml(fullCtx(4, { openModal: 'eco-new' }));
  assert.match(html, /data-hf-echo-new="fevi"/);
  assert.match(html, /data-hf-echo-new="date"/);
  assert.match(html, /data-hf-echo-new="nota"/);
  assert.match(html, /data-hf-echo-action="save"/);
});

test('renderConsultaIcHtml scores modal carries the table plus entry fields and save', () => {
  const html = renderConsultaIcHtml(
    fullCtx(5, { openModal: 'scores', scores: { previo: { kccq: 60 }, actual: { kccq: 70 }, draft: {} } })
  );
  assert.match(html, /hf-prev-actual-table/);
  assert.match(html, /data-hf-score-new="kccq"/);
  assert.match(html, /data-hf-score-action="save"/);
});

test('renderConsultaIcHtml cerrar-consulta modal carries the date input, seeded from the draft, plus confirm', () => {
  const html = renderConsultaIcHtml(
    fullCtx(CONSULTA_IC_STEP_COUNT - 1, { openModal: 'cerrar-consulta', cerrarConsultaDraft: { date: '2026-04-01' } })
  );
  assert.match(html, /data-hf-cerrar-consulta-date/);
  assert.match(html, /value="2026-04-01"/);
  assert.match(html, /data-hf-cerrar-consulta-confirm/);
});

test('renderConsultaIcHtml shows a clickable step-pill row (8 pills), current step highlighted, not a linear gate', () => {
  const html = renderConsultaIcHtml(fullCtx(3));
  assert.match(html, /class="hf-wizard-steps"/);
  for (let i = 0; i < CONSULTA_IC_STEP_COUNT; i++) {
    assert.match(html, new RegExp('data-hf-consulta-step-jump="' + i + '"'));
  }
  // current step (index 3) is marked is-current; others are not
  assert.match(html, /class="hf-wizard-step is-current" data-hf-consulta-step-jump="3"/);
  assert.doesNotMatch(html, /class="hf-wizard-step is-current" data-hf-consulta-step-jump="0"/);
  // every pill is a plain clickable button regardless of step reached — no
  // "disabled"/linear-gate markup on any of them
  assert.doesNotMatch(html, /data-hf-consulta-step-jump="[0-9]" disabled/);
});

test('renderEcoStepHtml gives ECG and Dispositivo equal-width (50/50) columns, not the old 32/68 split', () => {
  const model = { previo: {}, actual: { fevi: 45 }, draft: {} };
  const html = renderEcoStepHtml(model, emptyDevice(), emptyConsultaEntry());
  assert.match(html, /class="hf-eco-ecg-col" style="flex:1 1 0;min-width:0"/);
  assert.match(html, /class="hf-eco-device-col" style="flex:1 1 0;min-width:0"/);
  assert.doesNotMatch(html, /flex:0 1 32%/);
});
