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
  it('omits cama and sala (those live in the census sidebar)', () => {
    const model = buildDashboardModel({
      patient: {
        nombre: 'PEREZ GOMEZ ANA',
        edad: '72',
        sexo: 'F',
        cama: '12',
        sala: '1',
        diagnosticosList: ['ICC'],
        interconsultServiceIds: ['card', 'nef'],
      },
      inner: 'resumen',
    });
    assert.equal(model.identity.nombre, 'PEREZ GOMEZ ANA');
    assert.match(model.identity.meta, /72/);
    assert.equal(model.identity.cama, undefined);
    assert.equal(JSON.stringify(model.identity).includes('Cama'), false);
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

  it('keeps the 3 most recent eventualidades when collect is newest-first', () => {
    const model = buildDashboardModel({
      patient: { nombre: 'X' },
      eventualidades: ['newest', 'mid', 'older', 'oldest'],
      pendientes: ['p1', 'p2', 'p3', 'p4'],
    });
    assert.deepEqual(model.eventualidades, ['newest', 'mid', 'older']);
    assert.deepEqual(model.pendientes, ['p2', 'p3', 'p4']);
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
});
