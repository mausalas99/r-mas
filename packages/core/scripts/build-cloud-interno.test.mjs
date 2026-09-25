import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildInternoIndexHtml, bundleInternoApp } from './build-cloud-interno.mjs';

describe('buildInternoIndexHtml', () => {
  it('injects cloud flags and rewrites shared asset roots', () => {
    const html = `<!DOCTYPE html>
<html lang="es"><head>
  <meta charset="UTF-8" />
  <link rel="stylesheet" href="/tokens.css" />
  <link rel="stylesheet" href="/styles/overlays.css" />
  <link rel="stylesheet" href="/interno/interno.css" />
</head><body>
  <script type="module" src="/interno/interno-app.mjs"></script>
</body></html>`;
    const out = buildInternoIndexHtml(html);
    assert.match(out, /src="\/interno\/interno-flags\.js"/);
    assert.doesNotMatch(out, /<script>/);
    assert.match(out, /href="\/interno\/tokens\.css"/);
    assert.match(out, /href="\/interno\/styles\/overlays\.css"/);
    assert.match(out, /href="\/interno\/interno\.css"/);
    assert.match(out, /src="\/interno\/interno-app\.mjs"/);
  });
});

describe('buildInternoIndexHtml CSP', () => {
  it('refuses inline scripts', () => {
    assert.throws(() => buildInternoIndexHtml('<head>\n<script>x()</script></head>'), /inline <script>/);
  });
});

describe('bundleInternoApp', () => {
  it('inlines interno-crypto-board.mjs and every lib/ dependency into one self-contained ESM file', async () => {
    const tmp = await import('node:fs/promises');
    const os = await import('node:os');
    const path = await import('node:path');
    const outDir = await tmp.mkdtemp(path.join(os.tmpdir(), 'interno-bundle-'));
    const outfile = path.join(outDir, 'interno-app.mjs');
    const entry = new URL('../public/interno/interno-app.mjs', import.meta.url).pathname;

    await bundleInternoApp(entry, outfile);

    const out = await tmp.readFile(outfile, 'utf8');
    assert.ok(out.length > 0);
    // No leftover relative imports — everything the app needs is inlined.
    assert.doesNotMatch(out, /from ['"]\.\.?\//);
    assert.match(out, /subkeyB64FromLocationHash|buildInternoMedicion/);

    await tmp.rm(outDir, { recursive: true, force: true });
  });
});
