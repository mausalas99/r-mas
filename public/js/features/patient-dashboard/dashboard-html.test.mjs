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
    assert.match(html, /dash-name/);
    assert.equal(html.includes('72'), false);
    assert.match(html, /Actualizar labs/);
    assert.match(html, /Servicios interconsultantes/);
    assert.match(html, /\+ Agregar/);
    assert.match(html, /Labs: Solo alterados/);
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
    const kpis = html.match(/<div class="ea-kpis">([\s\S]*?)<\/div>/);
    assert.ok(kpis);
    const children = kpis[1].match(/<div>/g) || [];
    assert.ok(children.length >= 1);
    assert.ok(children.length <= 4);
    assert.match(kpis[1], /Soporte/);
    assert.equal(kpis[1].includes('Furosemida'), false);
    assert.match(html, /Medicamentos/);
    assert.match(html, /Furosemida/);
    assert.equal(html.includes('Furosemida 40 mg'), false);
  });

  it('uses distinct empty copy for labs, eventualidades and pendientes', () => {
    const html = renderDashboardHtml(
      buildDashboardModel({
        patient: {
          nombre: 'X',
          monitoreo: splitHistorialMonitoreo,
        },
        inner: 'resumen',
        labSets: [],
        eaInput: {},
        eventualidades: [],
        pendientes: [],
        todayKey: '2026-8-13',
      }),
    );
    assert.match(html, /Labs: Solo alterados/);
    assert.match(html, /Sin labs de hoy/);
    assert.match(html, /Sin eventualidades/);
    assert.match(html, /Sin pendientes/);
    assert.equal(html.includes('Sin registros'), false);
  });

  it('omits Medicamentos when SOAP is empty', () => {
    const html = renderDashboardHtml(
      buildDashboardModel({
        patient: { nombre: 'X', monitoreo: splitHistorialMonitoreo },
        inner: 'resumen',
        eaInput: {},
        todayKey: '2026-8-13',
      }),
    );
    assert.equal(html.includes('Medicamentos'), false);
    assert.equal(html.includes('ea-soap'), false);
  });

  it('marks out-of-range vitals with .hi using EA ranges', () => {
    const model = modelWithVitals();
    model.vitals = {
      vitals: { tas: 128, tad: 93, fc: 84, fr: 20, temp: 36.7, sat: 99 },
      glucometrias: [{ value: 114 }],
      io: { ing: 0, egr: 10 },
      alteredAt: {},
    };
    const html = renderDashboardHtml(model);
    assert.match(html, /class="vital hi"><small>T\/A<\/small><b>128\/93<\/b>/);
    assert.match(html, /class="vital"><small>FC<\/small><b>84<\/b>/);
    assert.match(html, /class="vital"><small>FR<\/small><b>20<\/b>/);
    assert.doesNotMatch(html, /class="vital hi"><small>Glu/);
  });

  it('marks hyperglycaemia on Glu', () => {
    const model = modelWithVitals();
    model.vitals = {
      vitals: { fc: 84 },
      glucometrias: [{ value: 240 }],
      io: {},
      alteredAt: {},
    };
    const html = renderDashboardHtml(model);
    assert.match(html, /class="vital hi"><small>Glu<\/small><b>240<\/b>/);
  });

  it('colors SOAP chips and rest-card spines by category hue', () => {
    const html = renderDashboardHtml(modelWithVitals());
    assert.match(html, /class="med" style="--h:/);
    assert.match(html, /class="ea-cat" style="--h:/);
    assert.match(html, /data-dash-action="estadoActual" style="--spine-h:168"/);
    assert.match(html, /data-dash-action="eventualidades" style="--spine-h:52"/);
  });
});
