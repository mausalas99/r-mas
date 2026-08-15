import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deriveSnapshot } from '../estado-actual-data.mjs';
import { buildDashboardModel } from './dashboard-model.mjs';
import { renderDashboardHtml, renderLabsHtml } from './dashboard-html.mjs';

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
      cuarto: '412',
      cama: '2',
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
    // Age/sex/cuarto/cama header meta was redundant with the sidebar card — dropped from the glance header.
    assert.equal(html.includes('72 a'), false);
    assert.equal(/Cama\s*2/.test(html), false);
    assert.match(html, /Actualizar labs/);
    assert.match(html, /Servicios interconsultantes/);
    assert.match(html, /\+ Agregar/);
    assert.match(html, /Labs: Solo alterados/);
    assert.equal(html.includes('Reportes completos'), false);
    assert.equal(html.includes('Abrir EA'), false);
    assert.equal(html.includes('Ver todas'), false);
    assert.equal(html.includes('Ver pendientes'), false);
    assert.match(html, /Eventualidades/);
    assert.match(html, /Disnea al deambular/);
    assert.match(html, /Pendientes/);
    assert.match(html, /Control K y ECG hoy/);
    assert.match(html, /Cardiología/);
    assert.equal(html.includes('Estado clínico'), false);
    assert.equal(html.includes('ea-kpis'), false);
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

  it('puts SOAP under Medicamentos and omits Estado clínico', () => {
    const html = renderDashboardHtml(modelWithVitals());
    assert.equal(html.includes('Estado clínico'), false);
    assert.equal(html.includes('ea-kpis'), false);
    assert.equal(html.includes('Sin plan de cuidado'), false);
    assert.match(html, /bento vitals-labs/);
    assert.match(html, /Medicamentos/);
    assert.match(html, /Furosemida/);
    assert.match(html, /soap-pack/);
    assert.match(html, /data-soap="HD"/);
    assert.match(html, />HD </);
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

  it('pending labs keep the card without claiming there are none', () => {
    const html = renderLabsHtml({ labs: { envios: [], pending: true } });
    assert.match(html, /data-dash-labs/);
    assert.match(html, /Labs: Solo alterados/);
    assert.equal(html.includes('Sin labs de hoy'), false);
  });

  it('shows at most 2 lab draws in resumen', () => {
    const draw = (time) => ({ time, groups: [] });
    const html = renderLabsHtml({
      labs: { envios: [draw('01:00'), draw('07:00'), draw('15:00')], pending: false },
    });
    assert.equal((html.match(/data-dash-action="labs-envio"/g) || []).length, 2);
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
    assert.equal(html.includes('soap-pack'), false);
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

  it('labels each altered lab chip with the analyte, not a bare number', () => {
    const html = renderDashboardHtml(modelWithVitals());
    assert.match(html, /class="abn">Hb 8\.2\*</);
    assert.equal(/class="abn">8\.2\*</.test(html), false);
  });

  it('renders SOAP as a zoned list without category pills', () => {
    const html = renderDashboardHtml(modelWithVitals());
    assert.match(html, /class="soap-pack"/);
    assert.match(html, /class="name">Furosemida/);
    assert.match(html, /data-soap="HD"/);
    assert.equal(html.includes('--spine-h'), false);
    assert.equal(html.includes('ea-cat'), false);
  });

  it('does not paint dose or frequency on glance med rows', () => {
    const model = modelWithVitals();
    model.ea = {
      kpis: model.ea.kpis,
      soap: [
        {
          letter: 'HD',
          subtitle: 'Hemo',
          items: [
            { name: 'Ticagrelor', token: '', emphasis: false },
            { name: 'ASA', token: '', emphasis: false },
          ],
        },
        {
          letter: 'NM',
          subtitle: 'Soporte',
          items: [{ name: 'Calcio/Vitamina D', token: '', emphasis: false }],
        },
      ],
    };
    const html = renderDashboardHtml(model);
    assert.match(html, /class="name">Ticagrelor/);
    assert.match(html, /class="name">Calcio\/Vitamina D/);
    assert.equal(html.includes('c/12'), false);
    assert.equal(/1\s*tableta/i.test(html), false);
    assert.equal(html.includes('class="meta"'), false);
  });
});
