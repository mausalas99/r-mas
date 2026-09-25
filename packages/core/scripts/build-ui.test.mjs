import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { buildUi, collectDuplicateIds, concatenateStylesheets } from './build-ui.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(__dirname, 'fixtures', 'build-ui');

describe('build-ui', () => {
  it('resolves @include recursively', () => {
    const out = buildUi(path.join(fixtureRoot, 'index.src.html'));
    assert.match(out, /HEADER/);
    assert.match(out, /BODY/);
    assert.match(out, /FOOTER/);
  });

  it('fails on missing include', () => {
    assert.throws(
      () => buildUi(path.join(fixtureRoot, 'broken.src.html')),
      /include not found/i
    );
  });

  it('detects duplicate ids', () => {
    const dupes = collectDuplicateIds('<motion id="a"></div><div id="a"></motion>');
    assert.deepStrictEqual(dupes, ['a']);
  });

  it('concatenates /styles stylesheets into one bundle, reading from publicDir', () => {
    const bundlePath = path.join(fixtureRoot, 'styles', 'app.bundle.css');
    fs.rmSync(bundlePath, { force: true });

    const out = buildUi(path.join(fixtureRoot, 'css.src.html'));

    // exactly one bundle link remains; the two source links are gone
    assert.match(out, /<link rel="stylesheet" href="\/styles\/app\.bundle\.css">/);
    assert.doesNotMatch(out, /href="\/styles\/a\.css"/);
    assert.doesNotMatch(out, /href="\/styles\/b\.css"/);
    // tokens.css is untouched and precedes the bundle
    assert.ok(out.indexOf('/tokens.css') < out.indexOf('/styles/app.bundle.css'));

    // the bundle file must actually exist, in publicDir (not a parent dir),
    // and contain the real CSS content in source order
    assert.ok(fs.existsSync(bundlePath), 'bundle file was not written to publicDir/styles');
    const bundled = fs.readFileSync(bundlePath, 'utf8');
    assert.match(bundled, /\.fixture-a \{ color: red; \}/);
    assert.match(bundled, /\.fixture-b \{ color: blue; \}/);
    assert.ok(bundled.indexOf('.fixture-a') < bundled.indexOf('.fixture-b'), 'cascade order preserved');

    fs.rmSync(bundlePath, { force: true });
  });

  it('concatenateStylesheets is a no-op when no /styles links are present', () => {
    const html = '<link rel="stylesheet" href="/tokens.css">';
    assert.strictEqual(concatenateStylesheets(html, fixtureRoot), html);
  });
});
