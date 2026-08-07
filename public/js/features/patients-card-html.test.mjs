import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { registerPatientsRuntime } from './patients-runtime-state.mjs';
import { renderPatientCardHtml } from './patients-card-html.mjs';

const patient = {
  id: 'p1',
  nombre: 'PEREZ TRISTAN, ANGELITA',
  cuarto: '201',
  cama: '2',
  servicio: 'Medicina Interna',
};

describe('patients-card-html', () => {
  it('oculta servicio en tarjetas del sidebar en modo sala', () => {
    registerPatientsRuntime({
      getSettings: () => ({ appMode: 'sala' }),
      getActiveId: () => null,
    });
    const html = renderPatientCardHtml(patient);
    assert.match(html, /PEREZ TRISTAN, ANGELITA/);
    assert.match(html, /Cto\. 201/);
    assert.match(html, /Cama 2/);
    assert.doesNotMatch(html, /Medicina Interna/);
    assert.doesNotMatch(html, /patient-card-svc/);
  });

  it('muestra servicio en tarjetas del sidebar en interconsulta', () => {
    registerPatientsRuntime({
      getSettings: () => ({ appMode: 'interconsulta' }),
      getActiveId: () => null,
    });
    const html = renderPatientCardHtml(patient);
    assert.match(html, /Medicina Interna/);
    assert.match(html, /patient-card-svc/);
  });
});
