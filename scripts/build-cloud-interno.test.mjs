import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildInternoIndexHtml, rewriteInternoModuleImports } from './build-cloud-interno.mjs';

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
    assert.match(out, /__RPC_CLOUD_INTERNO__=true/);
    assert.match(out, /data-cloudInterno|rpc-cloud-interno/);
    assert.match(out, /href="\/interno\/tokens\.css"/);
    assert.match(out, /href="\/interno\/styles\/overlays\.css"/);
    assert.match(out, /href="\/interno\/interno\.css"/);
    assert.match(out, /src="\/interno\/interno-app\.mjs"/);
  });
});

describe('rewriteInternoModuleImports', () => {
  it('rewrites dom-escape import for ASSETS mount', () => {
    const src = "import { escapeHtml } from '../js/dom-escape.mjs';\n";
    const out = rewriteInternoModuleImports(src);
    assert.match(out, /from '\.\/js\/dom-escape\.mjs'/);
  });
});
