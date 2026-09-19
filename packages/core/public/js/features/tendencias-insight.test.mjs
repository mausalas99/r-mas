import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTendDelta,
  isTendJump,
  alignSeriesToLabels,
  formatTendTooltipDelta,
  buildTendInsightHtml,
  distanceOutsideRef,
  classifyTendDeltaTone,
} from './tendencias-insight.mjs';

describe('tendencias-insight', () => {
  it('formats signed delta', () => {
    assert.equal(formatTendDelta(12, 10).text, '+2');
    assert.equal(formatTendDelta(8, 10).direction, 'down');
    assert.equal(formatTendDelta(null, 1), null);
  });

  it('detects percent jumps', () => {
    assert.equal(isTendJump(12, 10, { pctMin: 15 }), true);
    assert.equal(isTendJump(10.5, 10, { pctMin: 15 }), false);
  });

  it('aligns compare series to primary labels', () => {
    assert.deepEqual(
      alignSeriesToLabels(['a', 'b', 'c'], ['a', 'c'], [1, 3]),
      [1, null, 3],
    );
  });

  it('formats tooltip delta vs previous point', () => {
    assert.equal(formatTendTooltipDelta([1, 3, 2], 1), 'Δ +2');
    assert.equal(formatTendTooltipDelta([1, 3, 2], 0), null);
  });

  it('distanceOutsideRef is 0 in range and positive outside', () => {
    assert.equal(distanceOutsideRef(10, [8, 12]), 0);
    assert.equal(distanceOutsideRef(14, [8, 12]), 2);
    assert.equal(distanceOutsideRef(5, [8, 12]), 3);
    assert.equal(distanceOutsideRef(10, null), null);
  });

  it('classifies tone vs normality (not raw up/down)', () => {
    var wbc = [4, 11];
    // High WBC dropping toward normal → good
    assert.equal(classifyTendDeltaTone(12, 18, wbc), 'good');
    // High WBC rising further → bad
    assert.equal(classifyTendDeltaTone(20, 18, wbc), 'bad');
    var hb = [12, 16];
    // Low Hb dropping further → bad
    assert.equal(classifyTendDeltaTone(7.4, 7.7, hb), 'bad');
    // Low Hb rising toward normal → good
    assert.equal(classifyTendDeltaTone(9, 7.4, hb), 'good');
    // Both in range → neutral (white)
    assert.equal(classifyTendDeltaTone(13.5, 13.0, hb), 'neutral');
    // Leaving range → bad
    assert.equal(classifyTendDeltaTone(11.5, 12.5, hb), 'bad');
    // Returning into range → good
    assert.equal(classifyTendDeltaTone(12.5, 11.5, hb), 'good');
    // No ref → neutral
    assert.equal(classifyTendDeltaTone(20, 18, null), 'neutral');
  });

  it('builds percent-only insight with clinical tone class', () => {
    var html = buildTendInsightHtml((s) => s, 12, 18, true, [4, 11]);
    assert.match(html, /tend-insight/);
    assert.match(html, /−33%/); // (12-18)/18
    assert.doesNotMatch(html, /\+12|−6|\(−/);
    assert.match(html, /tend-insight-delta--down/);
    assert.match(html, /tend-insight-delta--good/);
    assert.doesNotMatch(html, /Fuera de rango/);
  });

  it('hides flat zero delta', () => {
    assert.equal(buildTendInsightHtml((s) => s, 10, 10, false, [8, 12]), '');
  });

  it('marks in-range movement as neutral', () => {
    var html = buildTendInsightHtml((s) => s, 13.2, 13.0, false, [12, 16]);
    assert.match(html, /tend-insight-delta--neutral/);
    assert.doesNotMatch(html, /tend-insight-delta--good|tend-insight-delta--bad/);
  });

  it('shows only relative percent for Hto-like drop', () => {
    var html = buildTendInsightHtml((s) => s, 23.3, 25.3, true, [36, 53]);
    assert.match(html, /−8%/);
    assert.doesNotMatch(html, /−2/);
  });
});
