import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('vendor-loader uses UMD inject only (no brittle ESM import)', () => {
  const src = fs.readFileSync(path.join(__dirname, 'vendor-loader.mjs'), 'utf8');
  assert.match(src, /injectChartVendorScript/);
  assert.match(src, /publicAssetUrl\('vendor\/chart\.umd\.min\.js'\)/);
  assert.doesNotMatch(src, /chart\.js\/auto/);
  assert.doesNotMatch(src, /chart-chunk\.json/);
});

test('early-boot requests app bundle before vendor scripts (bundle is the long pole)', () => {
  const boot = fs.readFileSync(path.join(__dirname, 'clinical-onboarding-early-boot.js'), 'utf8');
  assert.match(boot, /appendScript\('\/vendor\/chart\.umd\.min\.js'/);
  const bundleIdx = boot.indexOf('injectAppBundle();');
  const chartIdx = boot.indexOf("appendScript('/vendor/chart.umd.min.js'");
  assert.notStrictEqual(bundleIdx, -1);
  assert.notStrictEqual(chartIdx, -1);
  assert.ok(bundleIdx < chartIdx);
});
