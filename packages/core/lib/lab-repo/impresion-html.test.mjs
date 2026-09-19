import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractSomeTextFromImpresionHtml,
  impresionUrlFromSelectHtml,
} from './impresion-html.mjs';
import { looksLikeExtractedSome } from './pdf-text.mjs';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const FIX = (name) => fs.readFileSync(path.join(__dir, 'fixtures', name), 'utf8');

test('impresionUrlFromSelectHtml parses window.open target', () => {
  const html =
    "<script>window.open('Impresion.aspx','_blank','width=700')</script>";
  assert.equal(impresionUrlFromSelectHtml(html), 'Impresion.aspx');
});

test('extractSomeTextFromImpresionHtml keeps MIC values with an unescaped "<=" prefix', () => {
  // The portal sometimes emits the MIC cell with a literal "<" instead of
  // "&lt;" (e.g. "<td><=2</td>"). A naive "<[^>]+>" tag-strip would read
  // "<=2</td>" as one tag and delete the value along with the next real
  // tag close — this must not happen.
  const html =
    '<table><tr><td>AMPICILINA</td></tr>' +
    '<tr><td><=2</td><td>S</td></tr>' +
    '<tr><td>PENICILINA</td></tr>' +
    '<tr><td>8</td><td>S</td></tr></table>';
  const text = extractSomeTextFromImpresionHtml(html);
  assert.match(text, /<=2/);
  assert.match(text, /PENICILINA/);
});

test('extractSomeTextFromImpresionHtml yields SOME headers', () => {
  const text = extractSomeTextFromImpresionHtml(FIX('live-impresion.html'));
  assert.ok(looksLikeExtractedSome(text));
  assert.match(text, /Expediente:\s*1862133-7/i);
  assert.match(text, /Nombre:\s*JUAN GABRIEL CASTILLO SALAZAR/i);
  assert.match(text, /GASOMETRIA/i);
  assert.match(text, /PH/i);
});
