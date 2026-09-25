import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildExtraGluRowHtml } from './estado-actual-panel-glu-row.mjs';
import { EXTRA_GLUCOMETRIA_TIMES, STANDARD_GLUCOMETRIA_TIMES } from './estado-actual-registro-defaults.mjs';

describe('buildExtraGluRowHtml', () => {
  it('renders a time select with the 4h slots, excluding standard times', () => {
    const html = buildExtraGluRowHtml();
    assert.match(html, /<select class="[^"]*ea-glu-time-input[^"]*" data-ea-glu-time/);
    assert.doesNotMatch(html, /<input type="time"/);
    for (const t of EXTRA_GLUCOMETRIA_TIMES) {
      assert.match(html, new RegExp('<option value="' + t + '">' + t + '</option>'));
    }
    for (const t of STANDARD_GLUCOMETRIA_TIMES) {
      assert.doesNotMatch(html, new RegExp('<option value="' + t + '">'));
    }
  });
});
