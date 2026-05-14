import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseWsPayload } from './lan-client.mjs';

describe('lan-client parseWsPayload', () => {
  it('parses valid json', () => {
    assert.deepStrictEqual(parseWsPayload('{"a":1}'), { a: 1 });
  });
  it('returns null on bad', () => {
    assert.strictEqual(parseWsPayload('not-json'), null);
  });
});
