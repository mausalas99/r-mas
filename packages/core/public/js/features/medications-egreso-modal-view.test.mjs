import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { normHtml } from './preact-html-compare.mjs';
import { esc } from '../dom-escape.mjs';

const view = await loadJsx(import.meta.url, `import { EgresoModalContent } from './medications-egreso-modal-view.jsx';
  export const html = (p) => renderToString(<EgresoModalContent {...p} />);`);

// Old string builder (medications-egreso-modal.mjs before the port), kept as the oracle.
function oldList(lines) {
  if (!lines.length) return '<p class="med-empty-hint" style="margin:0;">No hay medicamentos activos para mostrar.</p>';
  return '<ol id="med-egreso-modal-list" style="margin:0;padding-left:22px;max-width:68ch;display:flex;flex-direction:column;gap:6px;">' +
    lines.map((l) => '<li>' + esc(l) + '</li>').join('') + '</ol>';
}
function oldModal(lines, dietLine, mode) {
  return (
    '<div class="lab-conflict-modal med-egreso-modal" style="max-width:620px;max-height:88vh;overflow:hidden;display:flex;flex-direction:column;padding:0;gap:0;">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;flex-shrink:0;">' +
    '<span style="font-size:16px;font-weight:700;color:var(--text);">Texto de egreso</span>' +
    '<div style="display:flex;align-items:center;gap:8px;">' +
    '<span class="med-output-tabs" id="med-egreso-modal-tabs-track" role="tablist" aria-label="Vista de texto de medicamentos" data-active="' + (mode === 'simple' ? 'simple' : 'full') + '">' +
    '<span class="med-output-tab-pill" aria-hidden="true"></span>' +
    '<button id="med-egreso-modal-tab-full" type="button" role="tab" aria-selected="' + (mode === 'full' ? 'true' : 'false') + '" class="med-output-tab' + (mode === 'full' ? ' active' : '') + '" data-onclick="setMedEgresoModalTab" data-onclick-args=\'["full"]\'>Completa</button>' +
    '<button id="med-egreso-modal-tab-simple" type="button" role="tab" aria-selected="' + (mode === 'simple' ? 'true' : 'false') + '" class="med-output-tab' + (mode === 'simple' ? ' active' : '') + '" data-onclick="setMedEgresoModalTab" data-onclick-args=\'["simple"]\'>Nombre + Día</button>' +
    '</span>' +
    '<button type="button" class="wb-btn wb-btn-ghost wb-btn-icon" title="Cerrar" aria-label="Cerrar" data-onclick="closeMedEgresoModal">×</button>' +
    '</div></div>' +
    '<div style="flex:1;min-height:0;overflow-y:auto;padding:16px 20px 18px;font-size:14px;line-height:1.6;color:var(--text);">' +
    oldList(lines) + (dietLine ? '<p id="med-egreso-modal-summary" style="margin:12px 0 0;">' + esc(dietLine) + '</p>' : '') +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:10px;padding:12px 16px 12px 20px;flex-shrink:0;">' +
    '<span style="flex:1;font-size:12px;color:var(--text-muted);">' + esc(lines.length + (lines.length === 1 ? ' va' : ' van') + ' a la receta de egreso. Los excluidos no.') + '</span>' +
    '<button type="button" class="wb-btn wb-btn-primary" data-onclick="copiarMedEgresoModalTexto">Copiar</button>' +
    '</div></div>'
  );
}

// Preact: void/empty-attr serialization and attribute quoting only.
const n = (s) => normHtml(s).replace(/data-onclick-args="\[(?:&quot;|")(\w+)(?:&quot;|")\]"/g, "data-onclick-args='[\"$1\"]'");

const cases = {
  empty: [[], '', 'full'],
  one: [['1. PARACETAMOL 1 g VO c/8h'], 'Dieta blanda', 'simple'],
  many: [['A <b> & "x"', "B 'y'", 'C'], '', 'full'],
};
for (const [name, [lines, dietLine, mode]] of Object.entries(cases)) {
  test(`egreso modal equals the old builder: ${name}`, () => {
    assert.equal(n(view.html({ lines, dietLine, mode })), n(oldModal(lines, dietLine, mode)));
  });
}
