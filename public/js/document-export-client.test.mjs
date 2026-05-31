import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseContentDispositionFilename } from './document-export-client.mjs';

describe('parseContentDispositionFilename', () => {
  it('parses attachment filename', () => {
    assert.equal(
      parseContentDispositionFilename('attachment; filename="foo.docx"'),
      'foo.docx'
    );
  });

  it('returns null for missing header', () => {
    assert.equal(parseContentDispositionFilename(null), null);
  });
});
