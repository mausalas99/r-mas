/** Skeleton placeholder helpers (premium UI phase 1). */

/** The Laboratorio loading placeholder, as a DOM node (boot path: no string parsing). */
export function buildLabPanelSkeletonElement() {
  const el = document.createElement('div');
  el.className = 'lab-panel-skeleton';
  el.id = 'lab-panel-loading';
  el.setAttribute('aria-busy', 'true');
  el.setAttribute('aria-label', 'Cargando Laboratorio');
  const line = (cls, width) => {
    const d = document.createElement('div');
    d.className = cls;
    if (width) d.setAttribute('style', 'width:' + width);
    return d;
  };
  el.append(line('skel-line lab-panel-skeleton-title'), line('skel-card'), line('skel-line', '72%'), line('skel-line', '58%'), line('skel-line', '84%'));
  return el;
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
