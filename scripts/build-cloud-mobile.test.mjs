import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  rewriteJsAssetPaths,
  buildMobileIndexHtml,
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

describe('buildMobileIndexHtml', () => {
  it('injects cloud flags and rewrites asset roots', () => {
    const html = `<!DOCTYPE html>
<html><head>
<title>R+</title>
<link rel="stylesheet" href="/tokens.css">
<script>
(function () {
  try {
    var ls = localStorage;
    var p = new URLSearchParams(location.search || '');
    var pathMobile = /^\\/mobile\\/?$/i.test(location.pathname || '');
    var queryMobile = p.get('rpc-mobile') === '1';
    var sticky = ls.getItem('rpc-mobile-mode') === '1';
    var touchUa = /iPad|iPhone|iPod|Android|Mobile/i.test(navigator.userAgent || '');
    if (!queryMobile && !pathMobile && !sticky && !touchUa) return;
    window.__RPC_MOBILE_WEB__ = true;
    document.documentElement.classList.add('rpc-mobile-web', 'ui-density-normal');
    ls.setItem('rpc-mobile-mode', '1');
    try { ls.setItem('rpc-sidebar-auto-hide', '0'); } catch (_eSide) {}
  } catch (_e) {}
})();
</script>
<script type="module" src="/js/app.bundle.mjs"></script>
</head><body></body></html>`;
    const out = buildMobileIndexHtml(html);
    assert.match(out, /__RPC_CLOUD_MOBILE__=true/);
    assert.match(out, /data-cloud-mobile|rpc-cloud-mobile/);
    assert.match(out, /rpc-cloud-mobile-pairing/);
    assert.match(out, /rpc-cloud-mobile-join-code/);
    assert.match(out, /href="\/mobile\/tokens\.css"/);
    assert.match(out, /src="\/mobile\/js\/app\.bundle\.mjs"/);
  });
});
