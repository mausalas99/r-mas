import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const {
  rendererAppIndexUrl,
  shouldUseLegacyHttpRenderer,
  contentTypeForPublicPath,
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

  describe('contentTypeForPublicPath', () => {
    it('declares utf-8 for CSS so content · is not decoded as Latin-1 Â·', () => {
      assert.equal(contentTypeForPublicPath('/public/styles/sidebar.css'), 'text/css; charset=utf-8');
    });

    it('declares utf-8 for HTML, JS, JSON, and SVG', () => {
      assert.equal(contentTypeForPublicPath('index.html'), 'text/html; charset=utf-8');
      assert.equal(contentTypeForPublicPath('app.bundle.mjs'), 'text/javascript; charset=utf-8');
      assert.equal(contentTypeForPublicPath('app.js'), 'text/javascript; charset=utf-8');
      assert.equal(contentTypeForPublicPath('manifest.webmanifest'), 'application/manifest+json; charset=utf-8');
      assert.equal(contentTypeForPublicPath('icons/logo.svg'), 'image/svg+xml; charset=utf-8');
    });

    it('leaves binary types to the fetch default', () => {
      assert.equal(contentTypeForPublicPath('icons/favicon-32.png'), null);
      assert.equal(contentTypeForPublicPath('fonts/ibm.woff2'), null);
    });
  });
});

const stylesDir = join(dirname(fileURLToPath(import.meta.url)), '../public/styles');

describe('CSS content separators', () => {
  it('p-meta · uses a unicode escape so a Latin-1 CSS decode cannot show Â', () => {
    const css = readFileSync(join(stylesDir, 'sidebar.css'), 'utf8');
    const block = css.match(
      /\.patient-card \.p-meta > span:not\(:last-child\)::after \{[^}]+\}/
    );
    assert.ok(block, 'expected p-meta ::after rule');
    assert.match(block[0], /content:\s*'\\00B7'/);
    assert.equal(block[0].includes('·'), false);
  });
});
