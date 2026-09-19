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
    assert.match(html, /id="ic-assigned"/);
    assert.match(html, /\+ Agregar/);
    assert.match(html, /Labs: fuera de rango/);
    assert.equal(html.includes('Reportes completos'), false);
    assert.equal(html.includes('Abrir EA'), false);
    assert.equal(html.includes('Ver todas'), false);
    assert.equal(html.includes('Ver pendientes'), false);
    assert.match(html, /Eventualidades/);
    assert.match(html, /Disnea al deambular/);
    assert.match(html, /Pendientes/);
    assert.match(html, /Control K y ECG hoy/);
    assert.match(html, /Cardiología/);
    // Diagnosis chips and interconsult service chips share one row, not two stacked rows.
    assert.match(html, /<div class="chips" id="ic-assigned">[^]*?ICC[^]*?Cardiología[^]*?<\/div>/);
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
    assert.match(html, /class="card-h">Labs</);
    assert.match(html, /Sin labs de hoy/);
    assert.match(html, /Sin eventualidades/);
    assert.match(html, /Sin pendientes/);
    assert.equal(html.includes('Sin registros'), false);
  });

  it('pending labs keep the card without claiming there are none', () => {
    const html = renderLabsHtml({ labs: { envios: [], pending: true } });
    assert.match(html, /data-dash-labs/);
    assert.match(html, /class="card-h">Labs</);
    assert.equal(html.includes('Sin labs de hoy'), false);
  });

  it('shows at most 2 lab draws in resumen', () => {
    const draw = (time, label) => ({
      time,
      groups: [{ tipo: 'QS', chips: [{ label: label, value: '1*' }] }],
    });
    const html = renderLabsHtml({
      labs: { envios: [draw('01:00', 'A'), draw('07:00', 'B'), draw('15:00', 'C')], pending: false },
    });
    assert.equal((html.match(/data-dash-action="labs-envio"/g) || []).length, 2);
  });

  it('marks overdue pendientes with the vencido row style, not eventualidades', () => {
    const html = renderDashboardHtml(
      buildDashboardModel({
        patient: { nombre: 'X', monitoreo: splitHistorialMonitoreo },
        inner: 'resumen',
        eaInput: {},
        eventualidades: [{ at: '2026-08-13T07:40:00.000Z', text: 'Disnea al deambular', dueDate: '2020-01-01' }],
        pendientes: [
          { text: 'Control K vencido', dueDate: '2020-01-01' },
          { text: 'Retirar sonda mañana', dueDate: '2099-01-01' },
        ],
        todayKey: '2026-8-13',
      }),
    );
    assert.match(html, /<li class="is-overdue"><b class="due-tag">Vencido<\/b> Control K vencido<\/li>/);
    assert.match(html, /<li><time>[^<]*<\/time> Retirar sonda mañana<\/li>/);
    assert.match(html, /<li><time>Vence<\/time> Disnea al deambular<\/li>/);
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

  it('marks the vitals card compact when only I/O has a value and no vitals are recorded', () => {
    const model = modelWithVitals();
    model.vitals = {
      vitals: {},
      glucometrias: [],
      io: { ing: 0, egr: 0 },
      alteredAt: {},
    };
    const html = renderDashboardHtml(model);
    assert.match(html, /class="card clickable vitals-card vitals-card--empty"/);
  });

  it('does not mark the vitals card compact when core vitals are recorded', () => {
    const model = modelWithVitals();
    model.vitals = {
      vitals: { fc: 84 },
      glucometrias: [],
      io: {},
      alteredAt: {},
    };
    const html = renderDashboardHtml(model);
    assert.match(html, /class="card clickable vitals-card" type="button"/);
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
    assert.match(html, /class="draw-label">Hb</);
    assert.match(html, /class="draw-value abn">8\.2</);
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

  it('shows the last-vitals time and altered count in the Signos vitales header', () => {
    const model = buildDashboardModel({
      patient: {
        nombre: 'PEREZ GOMEZ ANA',
        monitoreo: {
          historial: [
            {
              id: '1',
              recordedAt: '2026-05-01T08:00:00.000Z',
              vitals: { tas: 100, tad: 70, fc: 92, temp: 39.5 },
            },
          ],
        },
      },
      inner: 'resumen',
    });
    const html = renderDashboardHtml(model);
    assert.match(html, /card-h-meta/);
    assert.match(html, /toma \d{2}:\d{2}/);
    assert.match(html, /vitals-alert-count">1 fuera de rango/);
  });

  it('splits labs into a fuera-de-rango draw table and an en-rango one-liner', () => {
    const html = renderLabsHtml({
      labs: {
        envios: [
          {
            id: 'a',
            hora: '07:14',
            groups: [{ tipo: 'BH', chips: [{ label: 'Hb', value: '8.2*', delta: '-0.4', trend: 'down' }] }],
          },
        ],
        enRangoCount: 12,
        pending: false,
      },
    });
    assert.match(html, /class="draw-head-label">LABS FUERA DE RANGO/);
    assert.match(html, /class="draw-cell">/);
    assert.match(html, /class="draw-delta">.*-0\.4<\/span>/);
    assert.match(html, /class="labs-en-rango">12 valores en rango<\/p>/);
  });

  it('sorts worsening (trend down) chips by drop magnitude, worst first', () => {
    const html = renderLabsHtml({
      labs: {
        envios: [
          {
            id: 'a',
            hora: '07:14',
            groups: [
              {
                tipo: 'QS',
                chips: [
                  { label: 'Cr', value: '1.4*', delta: '-0.2', trend: 'down' },
                  { label: 'Hb', value: '7.0*', delta: '-3.5', trend: 'down' },
                ],
              },
            ],
          },
        ],
        enRangoCount: 0,
        pending: false,
      },
    });
    const hbIdx = html.indexOf('draw-label">Hb');
    const crIdx = html.indexOf('draw-label">Cr');
    assert.ok(hbIdx !== -1 && crIdx !== -1);
    assert.ok(hbIdx < crIdx, 'larger drop (Hb -3.5) should render before smaller drop (Cr -0.2)');
  });

  it('orders non-worsening chips by clinical-importance list, not appearance order', () => {
    const html = renderLabsHtml({
      labs: {
        envios: [
          {
            id: 'a',
            hora: '07:14',
            groups: [
              {
                tipo: 'QS',
                chips: [
                  { label: 'COL', value: '250*' },
                  { label: 'K', value: '5.8*', trend: 'up', delta: '+0.3' },
                ],
              },
            ],
          },
        ],
        enRangoCount: 0,
        pending: false,
      },
    });
    const kIdx = html.indexOf('draw-label">K');
    const colIdx = html.indexOf('draw-label">COL');
    assert.ok(kIdx !== -1 && colIdx !== -1);
    assert.ok(kIdx < colIdx, 'K outranks COL on the clinical-importance list');
  });

  it('caps the visible draw cells at 8 and updates the N of M count', () => {
    const chips = [];
    for (let i = 0; i < 17; i += 1) {
      chips.push({ label: 'X' + i, value: (i + 1) + '*' });
    }
    const html = renderLabsHtml({
      labs: {
        envios: [{ id: 'a', hora: '07:14', groups: [{ tipo: 'QS', chips }] }],
        enRangoCount: 0,
        pending: false,
      },
    });
    assert.equal((html.match(/class="draw-cell"/g) || []).length, 8);
    assert.match(html, /LABS FUERA DE RANGO &middot; 8 DE 17/);
    assert.match(html, /el resto en Laboratorio/);
  });

  it('drops a label repeated across draws from the older draw, keeps it in the newer one', () => {
    const html = renderLabsHtml({
      labs: {
        envios: [
          {
            id: 'older',
            hora: '04:21',
            groups: [{ tipo: 'QS', chips: [{ label: 'Lactato', value: '3.1*', delta: '+0.2', trend: 'up' }] }],
          },
          {
            id: 'newer',
            hora: '07:38',
            groups: [{ tipo: 'QS', chips: [{ label: 'Lactato', value: '2.8*', delta: '-0.3', trend: 'down' }] }],
          },
        ],
        enRangoCount: 0,
        pending: false,
      },
    });
    assert.equal((html.match(/draw-label">Lactato/g) || []).length, 1);
    assert.match(html, /data-lab-set-id="newer"[^]*draw-label">Lactato/);
  });

  it('drops an older draw entirely when dedup empties it, keeping only the newer card', () => {
    const html = renderLabsHtml({
      labs: {
        envios: [
          {
            id: 'older',
            hora: '04:21',
            groups: [{ tipo: 'QS', chips: [{ label: 'Lactato', value: '3.1*' }] }],
          },
          {
            id: 'newer',
            hora: '07:38',
            groups: [{ tipo: 'QS', chips: [{ label: 'Lactato', value: '2.8*' }] }],
          },
        ],
        enRangoCount: 0,
        pending: false,
      },
    });
    assert.equal((html.match(/data-dash-action="labs-envio"/g) || []).length, 1);
    assert.match(html, /data-lab-set-id="newer"/);
    assert.equal(html.includes('data-lab-set-id="older"'), false);
  });

  it('keeps the N DE M denominator counting all altered labs, duplicates included', () => {
    const html = renderLabsHtml({
      labs: {
        envios: [
          {
            id: 'older',
            hora: '04:21',
            groups: [
              {
                tipo: 'QS',
                chips: [
                  { label: 'Lactato', value: '3.1*' },
                  { label: 'pO2', value: '55*' },
                ],
              },
            ],
          },
          {
            id: 'newer',
            hora: '07:38',
            groups: [
              {
                tipo: 'QS',
                chips: [
                  { label: 'Lactato', value: '2.8*' },
                  { label: 'pH', value: '7.2*' },
                ],
              },
            ],
          },
        ],
        enRangoCount: 0,
        pending: false,
      },
    });
    // 4 chips total across both envios (Lactato duplicated, counted once per envio for M).
    assert.match(html, /LABS FUERA DE RANGO &middot; 1 DE 4/);
    assert.match(html, /LABS FUERA DE RANGO &middot; 2 DE 4/);
  });

  it('omits the header meta line when there are no vitals at all', () => {
    const model = buildDashboardModel({
      patient: { nombre: 'PEREZ GOMEZ ANA' },
      inner: 'resumen',
    });
    const html = renderDashboardHtml(model);
    assert.equal(html.includes('card-h-meta'), false);
  });
});
