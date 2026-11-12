import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from './features/preact-view-test-helpers.mjs';

// What censo-export.mjs and doc-preview-html.mjs wrote into the backdrop before the port.
const OLD_CENSO = '<div class="modal lab-display-prefs-modal censo-export-dialog" role="dialog" aria-modal="true" aria-labelledby="censo-export-title">' +
    '<h3 id="censo-export-title" class="modal-title">Censo</h3>' +
    '<p class="censo-export-date"><span id="censo-export-fecha-label"></span> · <span id="censo-export-mes-label"></span></p>' +
    '<div class="lab-display-prefs-fields censo-export-options">' +
    '<div class="lab-pref-row">' +
    '<span class="lab-pref-row-label" id="censo-export-archived-lbl">Incluir archivados</span>' +
    '<label class="rpc-switch"><input type="checkbox" id="censo-export-archived" class="rpc-switch-input" role="switch" aria-labelledby="censo-export-archived-lbl">' +
    '<span class="rpc-switch-track" aria-hidden="true"><span class="rpc-switch-thumb"></span></span></label></div>' +
    '<div class="lab-pref-row">' +
    '<div class="lab-pref-row-copy"><span class="lab-pref-row-label" id="censo-export-pancenso-lbl">Pancenso</span>' +
    '<span class="lab-pref-row-hint">Todos los equipos de la rotación.</span></div>' +
    '<label class="rpc-switch"><input type="checkbox" id="censo-export-pancenso" class="rpc-switch-input" role="switch" aria-labelledby="censo-export-pancenso-lbl">' +
    '<span class="rpc-switch-track" aria-hidden="true"><span class="rpc-switch-thumb"></span></span></label></div>' +
    '<div class="lab-pref-row">' +
    '<span class="lab-pref-row-label" id="censo-export-diagramas-lbl">Labs como diagramas</span>' +
    '<label class="rpc-switch"><input type="checkbox" id="censo-export-diagramas" class="rpc-switch-input" role="switch" aria-labelledby="censo-export-diagramas-lbl">' +
    '<span class="rpc-switch-track" aria-hidden="true"><span class="rpc-switch-thumb"></span></span></label></div>' +
    '<div class="lab-pref-row">' +
    '<span class="lab-pref-row-label" id="censo-export-tres-dias-lbl">Labs 3 días</span>' +
    '<label class="rpc-switch"><input type="checkbox" id="censo-export-tres-dias" class="rpc-switch-input" role="switch" aria-labelledby="censo-export-tres-dias-lbl">' +
    '<span class="rpc-switch-track" aria-hidden="true"><span class="rpc-switch-thumb"></span></span></label></div>' +
    '<div class="lab-pref-row">' +
    '<span class="lab-pref-row-label" id="censo-export-bh-ext-lbl">BH extendida</span>' +
    '<label class="rpc-switch"><input type="checkbox" id="censo-export-bh-ext" class="rpc-switch-input" role="switch" aria-labelledby="censo-export-bh-ext-lbl">' +
    '<span class="rpc-switch-track" aria-hidden="true"><span class="rpc-switch-thumb"></span></span></label></div>' +
    '</div>' +
    '<p class="censo-export-note">En la vista previa eliges columnas, editas celdas y generas el PDF.</p>' +
    '<div class="modal-actions">' +
    '<button type="button" class="wb-btn wb-btn-secondary" id="censo-export-cancel">Cancelar</button>' +
    '<button type="button" class="wb-btn wb-btn-primary wb-btn-lg" id="censo-export-preview">Vista previa</button>' +
    '</div></div>';
const OLD_DOC = '<div class="modal censo-preview-modal" role="dialog" aria-modal="true" aria-labelledby="doc-preview-title">' +
    '<div class="censo-preview-modal-head"><h3 id="doc-preview-title" class="modal-title"></h3>' +
    '<p class="profile-hint censo-preview-hint">Así se verá el documento. Para cambiar algo, cierra y edítalo.</p></div>' +
    '<iframe id="doc-preview-frame" class="censo-preview-frame" title="Vista previa"></iframe>' +
    '<div class="modal-actions">' +
    '<button type="button" class="wb-btn wb-btn-secondary" id="doc-preview-close">Cerrar</button>' +
    '<button type="button" class="wb-btn wb-btn-secondary" id="doc-preview-print">Imprimir</button>' +
    '<button type="button" class="wb-btn wb-btn-secondary rpc-doc-export" id="doc-preview-docx">Generar .docx</button>' +
    '<button type="button" class="wb-btn wb-btn-primary wb-btn-lg rpc-doc-export" id="doc-preview-pdf">Generar PDF</button>' +
    '</div></div>';

const norm = (h) => h.replace(/<input([^>]*?)\s*\/?>/g, '<input$1>').replace(/(<iframe[^>]*>)<\/iframe>/g, '$1</iframe>');

async function render(name, file) {
  const mod = await loadJsx(import.meta.url, `import { ${name} } from './${file}';
    export const html = () => renderToString(<${name} />);`);
  return mod.html();
}

test('CensoExportModal matches the old markup', async () => {
  const now = await render('CensoExportModal', 'censo-export-view.jsx');
  const old = '<div class="modal-backdrop" id="censo-export-modal" aria-hidden="true">' + OLD_CENSO + '</div>';
  assert.equal(norm(now), norm(old));
});

test('DocPreviewModal matches the old markup', async () => {
  const now = await render('DocPreviewModal', 'doc-preview-view.jsx');
  const old = '<div class="modal-backdrop censo-preview-backdrop" id="doc-preview-backdrop" aria-hidden="true">' + OLD_DOC + '</div>';
  assert.equal(norm(now), norm(old));
});
