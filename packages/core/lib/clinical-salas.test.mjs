import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLINICAL_SALA_VALUES,
  clinicalSalaRoomSlug,
  clinicalSalaUsesAbcOnlyRotation,
  clinicalServiceForSala,
} from './clinical-salas.mjs';

describe('rotation salas', () => {
  it('three salas, one Rotación service, one room slug each, ABCD-only', () => {
    const slugs = { 'UCI': 'rotacion-uci', 'PostQx': 'rotacion-postqx', 'Subespecialidad': 'rotacion-sub' };
    assert.ok(!CLINICAL_SALA_VALUES.includes('Rotación'));
    for (const [sala, slug] of Object.entries(slugs)) {
      assert.ok(CLINICAL_SALA_VALUES.includes(sala));
      assert.equal(clinicalServiceForSala(sala), 'Rotación');
      assert.equal(clinicalSalaRoomSlug(sala), slug);
      assert.equal(clinicalSalaUsesAbcOnlyRotation(sala), true);
    }
    assert.equal(clinicalServiceForSala('rotacion uci'), 'Rotación');
    assert.equal(clinicalSalaRoomSlug('Rotación'), '');
  });
});
