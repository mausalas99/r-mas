import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDashboardModel } from './dashboard-model.mjs';

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
