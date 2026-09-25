import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { labLinesToClipboardPayload } from './lab-clipboard.mjs';

// Copiar labs al portapapeles (panel único, varios días, o bulk): el
// asterisco de "fuera de rango" no debe pegarse crudo (feo en texto plano)
// — el valor va en negritas vía HTML en su lugar, para que apps como
// Google Docs lo respeten al pegar.
describe('labLinesToClipboardPayload', () => {
  it('strips the trailing star and bolds the value in html', () => {
    var payload = labLinesToClipboardPayload(['BH Hb 13.5* Hct 40']);
    assert.equal(payload.text, 'BH Hb 13.5 Hct 40');
    assert.equal(payload.html, 'BH Hb <strong>13.5</strong> Hct 40');
  });

  it('leaves lines without altered values untouched', () => {
    var payload = labLinesToClipboardPayload(['QS Glu 90 Cr 0.8']);
    assert.equal(payload.text, 'QS Glu 90 Cr 0.8');
    assert.equal(payload.html, 'QS Glu 90 Cr 0.8');
  });

  it('joins multiple lines with newlines in text and <br> in html', () => {
    var payload = labLinesToClipboardPayload(['BH Hb 13.5*', '', 'QS Glu 90']);
    assert.equal(payload.text, 'BH Hb 13.5\n\nQS Glu 90');
    assert.equal(payload.html, 'BH Hb <strong>13.5</strong><br><br>QS Glu 90');
  });

  it('escapes html-sensitive characters', () => {
    var payload = labLinesToClipboardPayload(['Nota <script>']);
    assert.equal(payload.html, 'Nota &lt;script&gt;');
  });
});
