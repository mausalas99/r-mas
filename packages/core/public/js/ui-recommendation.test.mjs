import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildConfidenceMeterHtml,
  buildRecommendationCardHtml,
} from './ui-recommendation.mjs';

describe('ui-recommendation', () => {
  it('builds meter bars for signal strength', () => {
    var html = buildConfidenceMeterHtml(2, 'var(--green)');
    assert.match(html, /ui-rec-meter/);
    assert.equal((html.match(/ui-rec-meter-bar/g) || []).length, 3);
  });

  it('renders title, alternatives drawer, and accept CTA', () => {
    var html = buildRecommendationCardHtml({
      title: '¿Aplicar evolución?',
      bodyHtml: '<p>Texto</p>',
      signal: 3,
      confidenceLabel: 'Alta confianza',
      primaryLabel: 'Aceptar',
      alternativesOpen: true,
      alternatives: [{ key: 'keep', short: 'Conservar borrador', label: 'Sin cambios', signal: 1 }],
    });
    assert.match(html, /¿Aplicar evolución\?/);
    assert.match(html, /data-rec-accept/);
    assert.match(html, /data-rec-alt="keep"/);
    assert.match(html, /grid-template-rows:1fr/);
  });
});
