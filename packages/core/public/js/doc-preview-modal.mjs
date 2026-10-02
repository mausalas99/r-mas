/**
 * Vista previa de Indicaciones / Nota (mismo modal que la del censo):
 * Imprimir, Generar PDF (Electron lo imprime a PDF) y Generar .docx.
 */
var current = null;

function frame() {
  return /** @type {HTMLIFrameElement | null} */ (document.getElementById('doc-preview-frame'));
}

export function closeDocPreview() {
  var backdrop = document.getElementById('doc-preview-backdrop');
  if (!backdrop) return;
  backdrop.classList.remove('open');
  backdrop.setAttribute('aria-hidden', 'true');
  document.documentElement.classList.remove('censo-preview-open');
  frame()?.removeAttribute('srcdoc');
  current = null;
}

function ensureModal() {
  var existing = document.getElementById('doc-preview-backdrop');
  if (existing) return existing;
  var backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop censo-preview-backdrop';
  backdrop.id = 'doc-preview-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  backdrop.innerHTML =
    '<div class="modal censo-preview-modal" role="dialog" aria-modal="true" aria-labelledby="doc-preview-title">' +
    '<div class="censo-preview-modal-head"><h3 id="doc-preview-title" class="modal-title"></h3>' +
    '<p class="profile-hint censo-preview-hint">Así se verá el documento. Para cambiar algo, cierra y edítalo.</p></div>' +
    '<iframe id="doc-preview-frame" class="censo-preview-frame" title="Vista previa"></iframe>' +
    '<div class="modal-actions">' +
    '<button type="button" class="wb-btn wb-btn-secondary" id="doc-preview-close">Cerrar</button>' +
    '<button type="button" class="wb-btn wb-btn-secondary" id="doc-preview-print">Imprimir</button>' +
    '<button type="button" class="wb-btn wb-btn-secondary rpc-doc-export" id="doc-preview-docx">Generar .docx</button>' +
    '<button type="button" class="wb-btn wb-btn-primary wb-btn-lg rpc-doc-export" id="doc-preview-pdf">Generar PDF</button>' +
    '</div></div>';
  document.body.appendChild(backdrop);
  backdrop.addEventListener('click', function (e) {
    if (e.target === backdrop) closeDocPreview();
  });
  document.getElementById('doc-preview-close')?.addEventListener('click', closeDocPreview);
  document.getElementById('doc-preview-print')?.addEventListener('click', function () {
    try {
      frame()?.contentWindow?.print();
      if (current && current.onPrint) current.onPrint();
    } catch {
      /* noop */
    }
  });
  document.getElementById('doc-preview-docx')?.addEventListener('click', function () {
    var run = current && current.onDocx;
    if (run) run();
  });
  document.getElementById('doc-preview-pdf')?.addEventListener('click', function (e) {
    var run = current && current.onPdf;
    if (run) run(/** @type {HTMLElement} */ (e.currentTarget));
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && backdrop.classList.contains('open')) closeDocPreview();
  });
  return backdrop;
}

/**
 * @param {{ title: string, html: string, onDocx: () => void, onPrint?: () => void, onPdf: (btn: HTMLElement) => void }} opts
 */
export function openDocPreview(opts) {
  var backdrop = ensureModal();
  current = opts;
  var title = document.getElementById('doc-preview-title');
  if (title) title.textContent = opts.title;
  var f = frame();
  if (f) f.srcdoc = opts.html;
  backdrop.classList.add('open');
  backdrop.setAttribute('aria-hidden', 'false');
  document.documentElement.classList.add('censo-preview-open');
}
