import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from './dev-ui-test-app.mjs';

describe('dev-ui-test-app parseArgs', () => {
  it('defaults to fresh userData (no --keep)', () => {
    assert.deepEqual(parseArgs([]), { help: false, scenarios: null, keep: false });
  });

  it('parses --keep', () => {
    assert.equal(parseArgs(['--keep']).keep, true);
  });

  it('parses --keep alongside --scenarios', () => {
    const opts = parseArgs(['--scenarios=foo.json', '--keep']);
    assert.equal(opts.keep, true);
    assert.equal(opts.scenarios, 'foo.json');
  });
});
