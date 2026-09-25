import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  rewriteJsAssetPaths,
  rewriteMobileBootScriptPaths,
  buildMobileIndexHtml,
  buildMobileFlagsJs,
  isCloudMobileLanStripTarget,
  createCloudMobileLanStripPlugin,
} from './build-cloud-mobile.mjs';

describe('isCloudMobileLanStripTarget', () => {
  it('flags retired LAN modules and features/lan paths', () => {
    assert.equal(isCloudMobileLanStripTarget('public/js/mobile-sharer-sync.mjs'), true);
    assert.equal(isCloudMobileLanStripTarget('public/js/cloud-room-membership.mjs'), true);
    assert.equal(isCloudMobileLanStripTarget('public/js/features/cloud-sync/detach-stale-room-membership.mjs'), true);
    assert.equal(isCloudMobileLanStripTarget('public/js/features/lan/panel.mjs'), true);
    assert.equal(isCloudMobileLanStripTarget('public/js/features/patients.mjs'), false);
  });
});

describe('createCloudMobileLanStripPlugin', () => {
  it('exports an esbuild plugin with setup', () => {
    const plugin = createCloudMobileLanStripPlugin();
    assert.equal(plugin.name, 'cloud-mobile-strip-lan');
    assert.equal(typeof plugin.setup, 'function');
  });
});

describe('rewriteJsAssetPaths', () => {
  it('prefixes absolute /js/ imports with /mobile', () => {
    const src =
      'import x from "/js/chunks/foo.js";\n' +
      'await import("/js/chunks/boot.js");\n' +
      "const y = '/js/chunks/bar.js';\n" +
      'const z = `/js/chunks/baz.js`;\n';
    const out = rewriteJsAssetPaths(src);
    assert.match(out, /from "\/mobile\/js\/chunks\/foo\.js"/);
    assert.match(out, /import\("\/mobile\/js\/chunks\/boot\.js"\)/);
    assert.match(out, /'\/mobile\/js\/chunks\/bar\.js'/);
    assert.match(out, /`\/mobile\/js\/chunks\/baz\.js`/);
  });

  it('does not double-prefix /mobile/js', () => {
    const src = 'import("/mobile/js/chunks/boot.js")';
    assert.equal(rewriteJsAssetPaths(src), src);
  });
});

describe('rewriteMobileBootScriptPaths', () => {
  it('rewrites bundle and vendor paths for mobile ASSETS', () => {
    const src =
      "mod.src = '/js/app.bundle.mjs';\n" +
      "appendScript('/vendor/chart.umd.min.js', function () {});\n" +
      'document.head.appendChild(mod);\n';
    const out = rewriteMobileBootScriptPaths(src, '809-test');
    assert.match(out, /\/mobile\/js\/app\.bundle\.mjs\?v=809-test/);
    assert.match(out, /\/mobile\/vendor\/chart\.umd\.min\.js/);
    assert.match(out, /mod\.onerror/);
  });
});

describe('buildMobileIndexHtml', () => {
  it('loads cloud flags from a file and rewrites asset roots', () => {
    const html = `<!DOCTYPE html>
<html><head>
<title>R+</title>
<link rel="stylesheet" href="/tokens.css">
<script src="/js/early-boot-flags.js"></script>
<script type="module" src="/js/app.bundle.mjs"></script>
</head><body></body></html>`;
    const out = buildMobileIndexHtml(html);
    assert.match(out, /<head>\n<script src="\/mobile\/js\/cloud-mobile-flags\.js"><\/script>/);
    assert.ok(out.indexOf('cloud-mobile-flags.js') < out.indexOf('early-boot-flags.js'));
    assert.doesNotMatch(out, /<script>/);
    assert.match(out, /href="\/mobile\/tokens\.css"/);
    assert.match(out, /src="\/mobile\/js\/app\.bundle\.mjs"/);
  });

  it('refuses inline scripts', () => {
    assert.throws(() => buildMobileIndexHtml('<head>\n<script>x()</script></head>'), /inline <script>/);
  });
});

describe('buildMobileFlagsJs', () => {
  it('sets cloud flags and pairing without inline handlers', () => {
    const js = buildMobileFlagsJs('b1', '8.4.0');
    assert.match(js, /__RPC_CLOUD_MOBILE__=true/);
    assert.match(js, /rpc-cloud-mobile/);
    assert.match(js, /rpc-cloud-mobile-pairing/);
    assert.match(js, /rpc-cloud-mobile-join-code/);
    assert.match(js, /addEventListener\("click"/);
    assert.doesNotMatch(js, /onclick=|<script/);
    new Function(js);
  });
});
