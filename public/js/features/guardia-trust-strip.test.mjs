import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGuardiaTrustStripHtml,
  resolveGuardiaTrustStripModel,
} from './guardia-trust-strip.mjs';

describe('guardia-trust-strip', () => {
  it('shows Nube connected + sala + equipo', () => {
    const model = resolveGuardiaTrustStripModel({
      cloudActive: true,
      room: { sala: 'Sala 2', turnKey: '2026-08' },
      teamName: 'Equipo B',
    });
    assert.equal(model.connected, true);
    assert.equal(model.chips[0].label, 'Nube · conectado');
    assert.equal(model.chips[0].tone, 'ok');
    assert.match(model.chips[1].label, /Sala 2/);
    assert.equal(model.chips[2].label, 'Equipo B');
    const html = buildGuardiaTrustStripHtml(model);
    assert.match(html, /guardia-trust-chip--ok/);
    assert.match(html, /Equipo B/);
  });

  it('warns when Nube is off', () => {
    const model = resolveGuardiaTrustStripModel({
      cloudActive: false,
      userSala: 'Torre HU',
      teamName: '',
    });
    assert.equal(model.chips[0].tone, 'warn');
    assert.match(model.chips[0].label, /Sin Nube/);
    assert.match(model.chips[1].label, /Torre HU/);
    assert.match(model.chips[2].label, /Sin equipo/);
  });
});

