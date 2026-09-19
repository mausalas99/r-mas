import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { patientListIndicatorBox, syncPatientListIndicator } from './patient-list-indicator.mjs';

describe('patient-list-indicator', () => {
  it('computes top/left/width/height from rects + scroll', () => {
    var listEl = {
      scrollTop: 40,
      scrollLeft: 0,
      getBoundingClientRect: () => ({ top: 100, left: 20, height: 400, width: 280 }),
    };
    var cardEl = {
      getBoundingClientRect: () => ({ top: 180, left: 28, height: 56, width: 264 }),
    };
    assert.deepEqual(patientListIndicatorBox(listEl, cardEl), {
      top: 120,
      left: 8,
      width: 264,
      height: 56,
    });
  });

  it('returns null without elements', () => {
    assert.equal(patientListIndicatorBox(null, {}), null);
    assert.equal(patientListIndicatorBox({}, null), null);
  });

  it('sync removes any leftover indicator node', () => {
    var removed = false;
    var listEl = {
      classList: { remove: function () {} },
      querySelector: function () {
        return {
          remove: function () {
            removed = true;
          },
        };
      },
    };
    syncPatientListIndicator(listEl);
    assert.equal(removed, true);
  });
});
