import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  rendererAppIndexUrl,
  shouldUseLegacyHttpRenderer,
  SCHEME,
  HOST,
} = require('./renderer-protocol.cjs');

describe('renderer-protocol', () => {
  it('builds app://rplus index URL', () => {
    assert.equal(rendererAppIndexUrl(), `${SCHEME}://${HOST}/index.html`);
  });

  describe('shouldUseLegacyHttpRenderer', () => {
    let prevHttp;
    before(() => {
      prevHttp = process.env.R_PLUS_RENDERER_HTTP;
    });
    after(() => {
      if (prevHttp === undefined) delete process.env.R_PLUS_RENDERER_HTTP;
      else process.env.R_PLUS_RENDERER_HTTP = prevHttp;
    });

    it('is false by default (app://rplus — keeps localStorage across updates)', () => {
      delete process.env.R_PLUS_RENDERER_HTTP;
      assert.equal(shouldUseLegacyHttpRenderer(), false);
    });

    it('is true when R_PLUS_RENDERER_HTTP=1', () => {
      process.env.R_PLUS_RENDERER_HTTP = '1';
      assert.equal(shouldUseLegacyHttpRenderer(), true);
    });

    it('is false when R_PLUS_RENDERER_HTTP=0', () => {
      process.env.R_PLUS_RENDERER_HTTP = '0';
      assert.equal(shouldUseLegacyHttpRenderer(), false);
    });
  });
});
