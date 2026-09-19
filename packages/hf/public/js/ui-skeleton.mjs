/** Skeleton placeholder helpers (premium UI phase 1). */

export function buildLabPanelSkeletonHtml() {
  return (
    '<div class="lab-panel-skeleton" id="lab-panel-loading" aria-busy="true" aria-label="Cargando Laboratorio">' +
    '<div class="skel-line lab-panel-skeleton-title"></div>' +
    '<div class="skel-card"></div>' +
    '<div class="skel-line" style="width:72%"></div>' +
    '<div class="skel-line" style="width:58%"></div>' +
    '<div class="skel-line" style="width:84%"></div>' +
  '</div>'
  );
}

/**
 * Teal workbench §11c "Cargando labs": a 4-column chemistry-value grid
 * skeleton (K / Cr / BUN / Hb), each cell a label over a shimmer bar,
 * staggered 0.1s apart — never a full-screen spinner. Shown inline wherever
 * a single patient's lab values are actively refreshing (e.g. the
 * single-patient "Actualizar labs" flow), not the whole-tab lazy-load
 * skeleton (that stays on buildLabPanelSkeletonHtml — see call sites).
 */
export function buildLabChemistrySkeletonHtml() {
  var cells = ['K', 'Cr', 'BUN', 'Hb'];
  var html =
    '<div class="lab-chem-skel" aria-busy="true" aria-label="Cargando labs">';
  for (var i = 0; i < cells.length; i++) {
    html +=
      '<div class="lab-chem-skel-cell">' +
      '<span class="lab-chem-skel-label">' + cells[i] + '</span>' +
      '<span class="lab-chem-skel-bar" style="--lab-chem-skel-delay:' + (i * 0.1) + 's"></span>' +
      '</div>';
  }
  html += '</div>';
  return html;
}

export function buildTextSkeletonPanel(className, lines) {
  const cls = className || 'skel-panel';
  const count = Math.max(1, Number(lines) || 3);
  let html = '<div class="' + cls + '" aria-busy="true">';
  for (let i = 0; i < count; i++) {
    const width = 55 + ((i * 17) % 35);
    html += '<div class="skel-line" style="width:' + width + '%"></div>';
  }
  html += '</div>';
  return html;
}
