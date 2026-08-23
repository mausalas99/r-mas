import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setPatients, setLabHistory } from '../../app-state.mjs';
import { rt } from '../app-tabs-runtime.mjs';
import { emptyCardio } from '../../../../lib/cardio/patient-cardio.mjs';
import { renderConsultaIc, clearConsultaIcDraftState } from './consulta-ic-wire.mjs';

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

    // Labs is step 2 ("Fase..." -> "Workup" -> "Labs"); advance the wizard.
    document.querySelector('[data-hf-consulta-step-action="next"]').click();
    document.querySelector('[data-hf-consulta-step-action="next"]').click();

    var prefillBtn = document.querySelector('[data-hf-lab-action="prefill"]');
    assert.ok(prefillBtn);
    prefillBtn.click();

    var ntField = document.querySelector('[data-hf-lab-new="ntProBnp"]');
    assert.ok(ntField);
    assert.equal(ntField.value, '2200');

    var saveBtn = document.querySelector('[data-hf-lab-action="save"]');
    assert.ok(saveBtn);
    saveBtn.click();

    assert.equal(patient.cardio.labSnapshots.length, 1);
    assert.equal(patient.cardio.labSnapshots[0].values.ntProBnp, 2200);
  });
});
