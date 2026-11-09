import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCensoPreviewBodyHtml } from './censo-preview-html-render.mjs';

const w = [{ key: 'cultivos', weight: 1 }];
const row = { num: '1', cultivos: 'Hemocultivo: E. coli' };

test('cultivos cell shows text and an Ocultar toggle when editable', () => {
  const html = buildCensoPreviewBodyHtml([row], w, true);
  assert.match(html, /E\. coli/);
  assert.match(html, /censo-cult-toggle[^>]*data-hidden="0"/);
});

test('hidden cultivos drop the text but keep the toggle', () => {
  const html = buildCensoPreviewBodyHtml([{ ...row, cultivosHidden: true }], w, true);
  assert.doesNotMatch(html, /E\. coli/);
  assert.match(html, /data-hidden="1"/);
});

test('no toggle outside the editable preview', () => {
  assert.doesNotMatch(buildCensoPreviewBodyHtml([row], w, false), /censo-cult-toggle/);
});
