import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deriveSnapshot } from '../estado-actual-data.mjs';
import { buildDashboardModel } from './dashboard-model.mjs';
import { renderDashboardHtml } from './dashboard-html.mjs';

const splitHistorialMonitoreo = {
  estadoClinico: {
    soporte: 'Puntillas nasales',
    soporteLitros: '2',
    dieta: 'Hiposódica',
    diureticos: 'Furosemida 40 mg',
  },
  confirmado: {},
  pendienteReceta: {},
  historial: [
    {
      id: '1',
      recordedAt: '2026-05-01T08:00:00.000Z',
      vitals: { tas: 100, tad: null, fc: 92 },
      glucometrias: [{ value: 90, time: '08:05' }],
      io: { ing: 500, egr: 300 },
    },
    {
      id: '2',
      recordedAt: '2026-05-01T10:00:00.000Z',
      vitals: { tas: null, tad: 70 },
      glucometrias: [{ value: 142, time: '10:10' }],
      io: {},
    },
  ],
  textoGuardado: { text: '', savedAt: null },
};

function modelWithVitals() {
  return buildDashboardModel({
    patient: {
      nombre: 'PEREZ GOMEZ ANA',
      edad: '72',
      sexo: 'F',
      diagnosticosList: ['ICC', 'DM2'],
      interconsultServiceIds: ['card', 'nef'],
      monitoreo: splitHistorialMonitoreo,
    },
    inner: 'resumen',
    labSets: [{ id: 'a', fecha: '13/08/2026', hora: '07:14', resLabs: ['BH\tHb 8.2*'] }],
    eaInput: {
      soporte: 'Puntillas nasales',
      soporteLitros: '2',
      dieta: 'Hiposódica',
      soap: { diureticos: ['Furosemida 40 mg'] },
    },
    eventualidades: [{ at: '2026-08-13T07:40:00.000Z', text: 'Disnea al deambular' }],
    pendientes: [{ text: 'Control K y ECG hoy', dueDate: '2026-08-13' }],
    todayKey: '2026-8-13',
  });
}

describe('dashboard html', () => {
  it('renders Spanish glance with patient-dash root and no Generar nota', () => {
    const html = renderDashboardHtml(modelWithVitals());
    assert.match(html, /class="[^"]*patient-dash/);
    assert.match(html, /PEREZ GOMEZ ANA/);
    assert.match(html, /Actualizar labs/);
    assert.match(html, /Servicios interconsultantes/);
    assert.match(html, /\+ Agregar/);
    assert.match(html, /Labs de hoy/);
    assert.match(html, /Reportes completos/);
    assert.match(html, /Estado clínico/);
    assert.match(html, /Eventualidades/);
    assert.match(html, /Pendientes/);
    assert.match(html, /Cardiología/);
    assert.equal(html.includes('Generar nota'), false);
  });

  it('reads vitals from model.vitals.vitals not model.vitals.tas', () => {
    const model = modelWithVitals();
    assert.equal(model.vitals.tas, undefined);
    assert.deepEqual(model.vitals, deriveSnapshot(splitHistorialMonitoreo));
    assert.equal(model.vitals.vitals.tas, 100);
    assert.equal(model.vitals.vitals.tad, 70);
    const html = renderDashboardHtml(model);
    assert.match(html, /100\/70/);
    assert.match(html, />92</);
    assert.match(html, />142</);
  });

  it('puts four or fewer KPI cells inside .ea-kpis', () => {
    const html = renderDashboardHtml(modelWithVitals());
    const kpis = html.match(/<div class="ea-kpis">([\s\S]*?)<\/div>\s*<div class="ea-soap">/);
    assert.ok(kpis);
    const children = kpis[1].match(/<div>/g) || [];
    assert.ok(children.length >= 1);
    assert.ok(children.length <= 4);
    assert.match(kpis[1], /Soporte/);
  });
});
