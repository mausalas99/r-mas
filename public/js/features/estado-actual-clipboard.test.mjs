import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { estadoActualTextToClipboardPayload } from './estado-actual-clipboard.mjs';

// Copiar Estado Actual al portapapeles: los pares **negrita** de la vista
// con negritas no deben pegarse crudos en apps como Google Docs — el texto
// va en <strong> vía HTML, y el texto plano queda sin asteriscos.
describe('estadoActualTextToClipboardPayload', () => {
  it('strips ** markers in text and bolds them in html', () => {
    var payload = estadoActualTextToClipboardPayload('FR **15 RPM**, SATO2 **99%**');
    assert.equal(payload.text, 'FR 15 RPM, SATO2 99%');
    assert.equal(payload.html, 'FR <strong>15 RPM</strong>, SATO2 <strong>99%</strong>');
  });

  it('leaves lines without bold markers untouched', () => {
    var payload = estadoActualTextToClipboardPayload('SIN DATOS DE FOCALIZACIÓN');
    assert.equal(payload.text, 'SIN DATOS DE FOCALIZACIÓN');
    assert.equal(payload.html, 'SIN DATOS DE FOCALIZACIÓN');
  });

  it('joins multiple lines with newlines in text and <br> in html', () => {
    var payload = estadoActualTextToClipboardPayload('**N:** ALERTA\n\n**V:** FR **15 RPM**');
    assert.equal(payload.text, 'N: ALERTA\n\nV: FR 15 RPM');
    assert.equal(payload.html, '<strong>N:</strong> ALERTA<br><br><strong>V:</strong> FR <strong>15 RPM</strong>');
  });

  it('escapes html-sensitive characters', () => {
    var payload = estadoActualTextToClipboardPayload('Nota <script>');
    assert.equal(payload.html, 'Nota &lt;script&gt;');
  });
});
