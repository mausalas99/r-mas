import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeTendRef,
  yScaleBoundsForRef,
  tendRefBandOptions,
  createTendRefBandPlugin,
} from './tendencias-ui-detail.mjs';

describe('tendencias-ref-band', () => {
  it('normalizes and rejects invalid refs', () => {
    assert.deepEqual(normalizeTendRef([12, 16]), { lo: 12, hi: 16 });
    assert.deepEqual(normalizeTendRef([16, 12]), { lo: 12, hi: 16 });
    assert.equal(normalizeTendRef(null), null);
    assert.equal(normalizeTendRef([5, 5]), null);
  });

  it('expands y bounds to include ref when it is close to the series', () => {
    var b = yScaleBoundsForRef([10, 11], [12, 16]);
    assert.ok(b.min < 10);
    assert.ok(b.max > 16);
  });

  it('keeps the domain on the data when ref is far away, so trend is not flattened', () => {
    var b = yScaleBoundsForRef([38, 45, 30, 50, 40], [150, 400]);
    assert.ok(b.max < 150, 'ref band should stay out of view, got max=' + b.max);
  });

  it('builds plugin options', () => {
    assert.equal(tendRefBandOptions(null).display, false);
    var o = tendRefBandOptions([4, 11], true);
    assert.equal(o.display, true);
    assert.equal(o.lo, 4);
    assert.equal(o.compact, true);
  });

  it('plugin draws when config present', () => {
    var plugin = createTendRefBandPlugin();
    var fills = 0;
    var chart = {
      options: { plugins: { tendRefBand: { display: true, lo: 12, hi: 16 } } },
      scales: {
        y: {
          getPixelForValue(v) {
            return 100 - v;
          },
        },
        x: { left: 0, right: 200 },
      },
      ctx: {
        save() {},
        restore() {},
        beginPath() {},
        rect() {},
        fill() {
          fills += 1;
        },
        stroke() {},
        moveTo() {},
        lineTo() {},
        setLineDash() {},
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
      },
    };
    plugin.beforeDatasetsDraw(chart);
    assert.equal(fills, 1);
  });
});
