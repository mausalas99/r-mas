import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatElapsedSeconds,
  resolveLoadingVariant,
  loadingVariantForMotionMode,
  buildLoadingStateHtml,
} from './ui-loading-state.mjs';

describe('ui-loading-state', () => {
  it('formats elapsed under and over a minute', () => {
    assert.equal(formatElapsedSeconds(0), '0.0s');
    assert.equal(formatElapsedSeconds(12.34), '12.3s');
    assert.equal(formatElapsedSeconds(65.2), '1m 5.2s');
  });

  it('defaults unknown variants to Dots', () => {
    assert.equal(resolveLoadingVariant('nope'), 'Dots');
    assert.equal(resolveLoadingVariant('Drive'), 'Drive');
  });

  it('downgrades Drive to Dots unless expresivo', () => {
    assert.equal(loadingVariantForMotionMode('mixto', 'Drive'), 'Dots');
    assert.equal(loadingVariantForMotionMode('expresivo', 'Drive'), 'Drive');
    assert.equal(loadingVariantForMotionMode('mixto', 'Dots'), 'Dots');
  });

  it('builds html with label, elapsed, and reduced-motion freeze', () => {
    var html = buildLoadingStateHtml({
      label: 'Exportando',
      variant: 'Dots',
      elapsedText: '1.2s',
      reducedMotion: true,
    });
    assert.match(html, /Exportando/);
    assert.match(html, /1\.2s/);
    assert.match(html, /ui-loading-state/);
    assert.match(html, /animation:none/);
    assert.doesNotMatch(html, /ui-loading-label--shimmer/);
  });
});
