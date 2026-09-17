import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  censoPrintFitScale,
  buildCensoPreviewDocumentHtml,
} from './censo-preview-html-render.mjs';

test('censoPrintFitScale: content within one page stays at scale 1', () => {
  assert.equal(censoPrintFitScale(900, 600), 1);
});

test('censoPrintFitScale: tall content shrinks to fit page height', () => {
  var scale = censoPrintFitScale(900, 2000);
  assert.ok(scale > 0 && scale < 1);
  assert.ok(2000 * scale <= (215.9 - 20) * (96 / 25.4) + 0.01);
});

test('censoPrintFitScale: missing dimensions default to no scaling', () => {
  assert.equal(censoPrintFitScale(0, 0), 1);
});

test('buildCensoPreviewDocumentHtml wires the beforeprint fit-to-page script', () => {
  var html = buildCensoPreviewDocumentHtml({ fecha: '17/09/2026' }, '<tr></tr>', []);
  assert.match(html, /beforeprint/);
  assert.match(html, /document\.body\.style\.zoom/);
});
