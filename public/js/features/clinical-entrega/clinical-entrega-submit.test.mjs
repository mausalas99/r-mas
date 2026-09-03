import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { collectEntregaFormPayload } from './clinical-entrega-submit.mjs';

describe('clinical-entrega-submit', () => {
  it('collectEntregaFormPayload rejects a missing form', () => {
    assert.deepEqual(collectEntregaFormPayload(null), {
      ok: false,
      error: 'Formulario de entrega no disponible',
    });
  });
});
