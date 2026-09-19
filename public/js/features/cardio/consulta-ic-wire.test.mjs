import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setPatients, setLabHistory } from '../../app-state.mjs';
import { rt } from '../app-tabs-runtime.mjs';
import { emptyCardio } from '../../../../lib/cardio/patient-cardio.mjs';
import { renderConsultaIc, clearConsultaIcDraftState } from './consulta-ic-wire.mjs';
import { CONSULTA_IC_STEP_COUNT } from './consulta-ic-html.mjs';

function mountContainer() {
  document.body.innerHTML = '<div id="consulta-ic-container"></div>';
}

function seedPatient(overrides) {
  var patient = Object.assign(
    { id: 'p1', nombre: 'Ana Test', registro: 'REG-1', edad: '60', cardio: emptyCardio() },
    overrides
  );
  setPatients([patient]);
  return patient;
}

describe('consulta-ic-wire', () => {
  beforeEach(() => {
    if (typeof document === 'undefined') return;
    mountContainer();
    clearConsultaIcDraftState();
    setLabHistory({});
    rt.getActiveId = function () {
      return 'p1';
    };
  });

  it('clears the container when there is no active patient', () => {
    if (typeof document === 'undefined') return;
    rt.getActiveId = function () {
      return null;
    };
    seedPatient();
    renderConsultaIc();
    assert.equal(document.getElementById('consulta-ic-container').innerHTML, '');
  });

  it('renders identity and creates today\'s consulta entry, seeded from the last ronda', () => {
    if (typeof document === 'undefined') return;
    var patient = seedPatient({
      cardio: Object.assign(emptyCardio(), {
        fenotipo: 'HFrEF',
        etiologia: 'Isquémica',
        rondasByDay: [{ date: '2026-01-05' }],
      }),
    });
    renderConsultaIc();
    var html = document.getElementById('consulta-ic-container').innerHTML;
    assert.match(html, /Ana Test/);
    assert.match(html, /REG-1/);
    assert.equal(patient.cardio.consultas.length, 1);
    assert.equal(patient.cardio.consultas[0].fenotipo, 'HFrEF');
    assert.equal(patient.cardio.consultas[0].etiologia, 'Isquémica');
  });

  it('persists a fase de seguimiento change from the DOM into cardio.consultas', () => {
    if (typeof document === 'undefined') return;
    var patient = seedPatient();
    renderConsultaIc();
    var select = document.querySelector('[data-hf-consulta="faseSeguimiento"]');
    assert.ok(select);
    select.value = 'IC avanzada';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    assert.equal(patient.cardio.consultas[0].faseSeguimiento, 'IC avanzada');
  });

  it('picking a past date locks the form; the wrong code stays locked; the right code unlocks it', async () => {
    if (typeof document === 'undefined') return;
    seedPatient();
    renderConsultaIc();
    var dateEl = document.querySelector('[data-hf-consulta-date]');
    dateEl.value = '2020-01-01';
    dateEl.dispatchEvent(new Event('change', { bubbles: true }));

    assert.equal(document.querySelector('[data-hf-consulta="contacto"]').disabled, true);

    document.querySelector('[data-hf-history-edit="unlock"]').click();
    await Promise.resolve();
    document.querySelector('[data-text-prompt-input]').value = 'wrong code';
    document.querySelector('[data-text-prompt-confirm]').click();
    await Promise.resolve();
    assert.equal(document.querySelector('[data-hf-consulta="contacto"]').disabled, true);

    document.querySelector('[data-hf-history-edit="unlock"]').click();
    await Promise.resolve();
    document.querySelector('[data-text-prompt-input]').value = 'entiendo, esto modifica un registro pasado';
    document.querySelector('[data-text-prompt-confirm]').click();
    await Promise.resolve();
    assert.equal(document.querySelector('[data-hf-consulta="contacto"]').disabled, false);
  });

  it('adds a comorbilidad row on click and re-renders with the new row present', () => {
    if (typeof document === 'undefined') return;
    var patient = seedPatient();
    renderConsultaIc();
    var addBtn = document.querySelector('[data-hf-comorb-action="add"]');
    assert.ok(addBtn);
    addBtn.click();
    assert.equal(patient.cardio.consultas[0].comorbilidades.length, 1);
    var row = document.querySelector('[data-hf-comorb-row]');
    assert.ok(row);
  });

  it('prefill-from-labs populates the lab draft, and saving writes a labSnapshots entry', () => {
    if (typeof document === 'undefined') return;
    var patient = seedPatient();
    setLabHistory({ p1: [{ resLabs: ['CARD: NT-PROBNP 2200 pg/mL'] }] });
    renderConsultaIc();

    // "Labs — nueva medición" is now paged into 3 chunks (23 lab rows split
    // 11/11/1): step 14 has the prefill button + first 11 fields, step 15
    // has the next 11 (including ntProBnp), step 16 has the last field
    // (troponina) + the save button. Fase(0) Comorb(1) Internamiento(2)
    // Subjetivo(3) Objetivo(4) Workup×5(5-9) LabsTable×4(10-13) then
    // Labs-nueva chunk0 lands on step 14 — advance the wizard there.
    function clickNext() {
      document.querySelector('[data-hf-consulta-step-action="next"]').click();
    }
    for (let i = 0; i < 14; i++) clickNext();

    var prefillBtn = document.querySelector('[data-hf-lab-action="prefill"]');
    assert.ok(prefillBtn);
    prefillBtn.click();

    clickNext(); // step 15: ntProBnp lives in the second chunk
    var ntField = document.querySelector('[data-hf-lab-new="ntProBnp"]');
    assert.ok(ntField);
    assert.equal(ntField.value, '2200');

    clickNext(); // step 16: last chunk carries the save button
    var saveBtn = document.querySelector('[data-hf-lab-action="save"]');
    assert.ok(saveBtn);
    saveBtn.click();

    assert.equal(patient.cardio.labSnapshots.length, 1);
    assert.equal(patient.cardio.labSnapshots[0].values.ntProBnp, 2200);
  });

  it('persists Subjetivo/Objetivo checklist edits into cardio.consultas, including a tri-state field', () => {
    if (typeof document === 'undefined') return;
    var patient = seedPatient();
    renderConsultaIc();
    document.querySelector('[data-hf-consulta-step-action="next"]').click(); // step 1: Internamiento + Subj/Obj

    var disnea = document.querySelector('[data-hf-consulta-subj="disneaEsfuerzo"]');
    assert.ok(disnea);
    disnea.value = 'Moderada';
    disnea.dispatchEvent(new Event('change', { bubbles: true }));

    var pvy = document.querySelector('[data-hf-consulta-obj-tri="ingurgitacionYugular"]');
    assert.ok(pvy);
    pvy.value = 'true';
    pvy.dispatchEvent(new Event('change', { bubbles: true }));

    var entry = patient.cardio.consultas[0];
    assert.equal(entry.subjetivo.disneaEsfuerzo, 'Moderada');
    assert.equal(entry.objetivo.ingurgitacionYugular, true);
  });

  it('clicking a step pill jumps directly to that step, skipping intermediate ones', () => {
    if (typeof document === 'undefined') return;
    seedPatient();
    renderConsultaIc();
    assert.match(document.getElementById('consulta-ic-container').innerHTML, /Paso 1 de 8/);

    var pill = document.querySelector('[data-hf-consulta-step-jump="4"]');
    assert.ok(pill);
    pill.click();
    assert.match(document.getElementById('consulta-ic-container').innerHTML, /Paso 5 de 8/);
    assert.ok(document.querySelector('[data-hf-consulta="ekgFecha"]')); // Eco/ECG/Dispositivo step

    // jump back to step 0 works too (no linear gate)
    document.querySelector('[data-hf-consulta-step-jump="0"]').click();
    assert.match(document.getElementById('consulta-ic-container').innerHTML, /Paso 1 de 8/);
  });

  it('splits TA into sistólica/diastólica inputs that join back into entry.ta as "sis/dia"', () => {
    if (typeof document === 'undefined') return;
    var patient = seedPatient();
    renderConsultaIc();
    // Reingreso y desenlaces is step index 6 ("Reingreso y TMO").
    document.querySelector('[data-hf-consulta-step-jump="6"]').click();

    var sis = document.querySelector('[data-hf-consulta-ta="sistolica"]');
    var dia = document.querySelector('[data-hf-consulta-ta="diastolica"]');
    assert.ok(sis);
    assert.ok(dia);

    sis.value = '120';
    sis.dispatchEvent(new Event('change', { bubbles: true }));
    assert.equal(patient.cardio.consultas[0].ta, '120'); // only one side filled yet

    dia.value = '80';
    dia.dispatchEvent(new Event('change', { bubbles: true }));
    assert.equal(patient.cardio.consultas[0].ta, '120/80');
  });

  it('"Editar en Manejo" button on Tratamiento actual switches the active app tab to "med"', () => {
    if (typeof document === 'undefined') return;
    seedPatient();
    renderConsultaIc();
    document.querySelector('[data-hf-consulta-step-jump="5"]').click(); // Tratamiento actual

    var btn = document.querySelector('[data-hf-goto-manejo]');
    assert.ok(btn);
    assert.doesNotThrow(function () {
      btn.click();
    });
    assert.equal(rt.getActiveAppTab(), 'med');
  });

  it('"Cerrar consulta" opens a date prompt; confirming saves entry.cerrada/proximaConsultaFecha and dispatches hf:consulta-cerrada', () => {
    if (typeof document === 'undefined') return;
    var patient = seedPatient();
    renderConsultaIc();
    document.querySelector('[data-hf-consulta-step-jump="' + (CONSULTA_IC_STEP_COUNT - 1) + '"]').click();

    var openBtn = document.querySelector('[data-hf-cerrar-consulta]');
    assert.ok(openBtn);
    openBtn.click();

    var dateInput = document.querySelector('[data-hf-cerrar-consulta-date]');
    assert.ok(dateInput);
    dateInput.value = '2026-04-15';
    dateInput.dispatchEvent(new Event('change', { bubbles: true }));

    var received = null;
    document.addEventListener('hf:consulta-cerrada', function (ev) {
      received = ev.detail;
    });

    document.querySelector('[data-hf-cerrar-consulta-confirm]').click();

    var entry = patient.cardio.consultas[0];
    assert.equal(entry.cerrada, true);
    assert.equal(entry.proximaConsultaFecha, '2026-04-15');
    assert.ok(received);
    assert.equal(received.patientId, 'p1');
    assert.equal(received.proximaConsultaFecha, '2026-04-15');
    // modal is closed and the read-only "Consulta cerrada" summary shows instead
    assert.equal(document.querySelector('[data-hf-modal-backdrop]'), null);
    assert.match(document.getElementById('consulta-ic-container').innerHTML, /Consulta cerrada/);
  });

  it('cancelling the "Cerrar consulta" prompt (closing without confirming) leaves the consulta open, no event', () => {
    if (typeof document === 'undefined') return;
    var patient = seedPatient();
    renderConsultaIc();
    document.querySelector('[data-hf-consulta-step-jump="' + (CONSULTA_IC_STEP_COUNT - 1) + '"]').click();
    document.querySelector('[data-hf-cerrar-consulta]').click();

    var fired = false;
    document.addEventListener('hf:consulta-cerrada', function () {
      fired = true;
    });
    document.querySelector('[data-hf-modal-close]').click();

    assert.equal(fired, false);
    assert.equal(patient.cardio.consultas[0].cerrada, false);
  });
});
