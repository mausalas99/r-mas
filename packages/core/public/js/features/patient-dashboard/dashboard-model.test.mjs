import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deriveSnapshot } from '../estado-actual-data.mjs';
import { buildDashboardModel } from './dashboard-model.mjs';

const splitHistorialMonitoreo = {
  estadoClinico: {},
  confirmado: {},
  pendienteReceta: {},
  historial: [
    {
      id: '1',
      recordedAt: '2026-05-01T08:00:00.000Z',
      vitals: { tas: 100, tad: null },
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

describe('dashboard identity', () => {
  it('exposes edad, sexo and bed; omits sala', () => {
    const model = buildDashboardModel({
      patient: {
        nombre: 'PEREZ GOMEZ ANA',
        edad: '72',
        sexo: 'F',
        cama: '12',
        cuarto: '412',
        sala: '1',
        diagnosticosList: ['ICC'],
        interconsultServiceIds: ['card', 'nef'],
      },
      inner: 'resumen',
    });
    assert.equal(model.identity.nombre, 'PEREZ GOMEZ ANA');
    assert.equal(model.identity.edad, '72');
    assert.equal(model.identity.sexo, 'F');
    assert.equal(model.identity.cama, '12');
    assert.equal(model.identity.cuarto, '412');
    assert.equal(JSON.stringify(model.identity).includes('"sala"'), false);
    assert.deepEqual(model.identity.interconsultServiceIds, ['card', 'nef']);
    assert.equal(model.view, 'resumen');
  });

  it('marks pendientes as a child of resumen', () => {
    const model = buildDashboardModel({ patient: { nombre: 'X' }, inner: 'todo' });
    assert.equal(model.view, 'pendientes');
  });

  it('exposes filtered diagnosticos chips and passes through IC ids', () => {
    const model = buildDashboardModel({
      patient: {
        nombre: 'X',
        diagnosticosList: ['ICC', '', '  ', 'DM2'],
        interconsultServiceIds: ['card', 'unknown-svc'],
      },
      inner: 'resumen',
    });
    assert.deepEqual(model.identity.diagnosticos, ['ICC', 'DM2']);
    assert.deepEqual(model.identity.interconsultServiceIds, ['card', 'unknown-svc']);
  });

  it('keeps only the first three diagnosticos as primary chips', () => {
    const model = buildDashboardModel({
      patient: {
        nombre: 'X',
        diagnosticosList: ['IAMCEST', 'FEVI 35', 'Mobitz I', 'HAS', 'DM2', 'Obesidad'],
      },
      inner: 'resumen',
    });
    assert.deepEqual(model.identity.diagnosticos, ['IAMCEST', 'FEVI 35', 'Mobitz I']);
  });
});

describe('dashboard assembler', () => {
  it('vitals snapshot matches deriveSnapshot when tas/tad split across historial rows', () => {
    const model = buildDashboardModel({
      patient: { nombre: 'X', monitoreo: splitHistorialMonitoreo },
      inner: 'resumen',
    });
    assert.deepEqual(model.vitals, deriveSnapshot(splitHistorialMonitoreo));
    assert.equal(model.vitals.vitals.tas, 100);
    assert.equal(model.vitals.vitals.tad, 70);
    assert.equal(model.vitals.io.ing, 500);
    assert.deepEqual(model.vitals.glucometrias, [{ value: 142, time: '10:10' }]);
  });

  it('caps lists at 30: newest-first eventualidades keep the head, pendientes the tail', () => {
    const ev = Array.from({ length: 35 }, (_, i) => 'e' + i);
    const pe = Array.from({ length: 35 }, (_, i) => 'p' + i);
    const model = buildDashboardModel({ patient: { nombre: 'X' }, eventualidades: ev, pendientes: pe });
    assert.deepEqual(model.eventualidades, ev.slice(0, 30));
    assert.deepEqual(model.pendientes, pe.slice(5));
    assert.equal(model.eventualidadesTotal, 35);
    assert.equal(model.pendientesTotal, 35);
  });

  it('lists lines/tubes with their day (insertion day = día 1) and the newest positive cultures', () => {
    const model = buildDashboardModel({
      patient: {
        nombre: 'X',
        accesosList: [
          { via: 'cvc', fecha: '2026-09-20' },
          { via: 'foley', fecha: '25/09/2026' },
          { via: 'picc', fecha: '' },
          { via: '', fecha: '2026-09-01' },
        ],
      },
      refDate: new Date(2026, 8, 25, 23, 30),
      todayKey: '2026-9-25',
      labSets: [
        { id: 'a', fecha: '10/09/2026', hora: '08:00', resLabs: ['UROCULTIVO: E. COLI\nATB S: CIPRO'] },
        { id: 'b', fecha: '20/09/2026', hora: '08:00', resLabs: ['HEMOCULTIVO: S. AUREUS'] },
        { id: 'c', fecha: '21/09/2026', hora: '08:00', resLabs: ['UROCULTIVO: NEGATIVO'] },
        { id: 'd', fecha: '22/09/2026', hora: '08:00', resLabs: ['UROCULTIVO POR SONDA: MUESTRA CONTAMINADA'] },
      ],
    });
    assert.deepEqual(model.accesos, [
      { label: 'CVC', dia: 6 },
      { label: 'Sonda Foley', dia: 1 },
      { label: 'PICC', dia: null },
    ]);
    assert.deepEqual(
      model.labs.cultivos.map((c) => [c.sitio, c.organismo, c.atbPendiente, c.atb]),
      [
        ['Hemocultivo', 'S. aureus', true, []],
        ['Urocultivo', 'E. coli', false, [{ k: 'S', drugs: 'CIPRO' }]],
      ],
    );
    assert.equal(model.labs.cultivosTotal, 2);
  });

  it('composes non-empty labs and ea via child models', () => {
    const model = buildDashboardModel({
      patient: { nombre: 'X' },
      labSets: [
        { id: 'a', fecha: '13/08/2026', hora: '07:14', resLabs: ['BH\tHb 8.2*'] },
      ],
      eaInput: {
        soporte: 'Puntillas nasales',
        dieta: 'Hiposódica',
        soap: { diureticos: ['Furosemida 40 mg'] },
      },
      todayKey: '2026-8-13',
    });
    assert.ok(model.labs.envios.length > 0);
    assert.ok(model.ea.kpis.length > 0);
    assert.ok(model.ea.soap.length > 0);
  });

  it('skipLabs leaves glance pending without walking lab sets', () => {
    const model = buildDashboardModel({
      patient: { nombre: 'X' },
      labSets: [{ id: 'a', fecha: '13/08/2026', hora: '07:14', resLabs: ['BH\tHb 8.2*'] }],
      todayKey: '2026-8-13',
      skipLabs: true,
    });
    assert.equal(model.labs.pending, true);
    assert.deepEqual(model.labs.envios, []);
  });
});
