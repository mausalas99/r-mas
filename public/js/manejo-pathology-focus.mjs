/** Modal de enfoque único — una recomendación o infusión a la vez desde Patologías. */

/**
 * @param {string} title
 * @param {HTMLElement} content
 * @param {{ footerActions?: Array<{ label: string, primary?: boolean, onClick: () => void }> }} [opts]
 */
export function openPathologyFocusModal(title, content, opts) {
  opts = opts || {};
  var existing = document.querySelector('.manejo-pathology-focus-backdrop');
  if (existing) existing.remove();

  var backdrop = document.createElement('div');
  backdrop.className = 'manejo-pathology-focus-backdrop';
  backdrop.setAttribute('role', 'presentation');

  var modal = document.createElement('div');
  modal.className = 'manejo-pathology-focus-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'manejo-pathology-focus-title');

  var head = document.createElement('header');
  head.className = 'manejo-pathology-focus-head';
  var h = document.createElement('h3');
  h.id = 'manejo-pathology-focus-title';
  h.className = 'manejo-pathology-focus-title';
  h.textContent = title;
  head.appendChild(h);
  var closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'manejo-pathology-focus-close';
  closeBtn.setAttribute('aria-label', 'Cerrar');
  closeBtn.innerHTML = '&times;';
  head.appendChild(closeBtn);
  modal.appendChild(head);

  var body = document.createElement('div');
  body.className = 'manejo-pathology-focus-body';
  body.appendChild(content);
  modal.appendChild(body);

  if (opts.footerActions && opts.footerActions.length) {
    var foot = document.createElement('footer');
    foot.className = 'manejo-pathology-focus-foot';
    opts.footerActions.forEach(function (act) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className =
        'manejo-copy-btn' + (act.primary ? ' primary' : ' btn-med-secondary');
      b.textContent = act.label;
      b.addEventListener('click', act.onClick);
      foot.appendChild(b);
    });
    modal.appendChild(foot);
  }

  function close() {
    backdrop.classList.remove('open');
    setTimeout(function () {
      backdrop.remove();
    }, 180);
    document.removeEventListener('keydown', onKey);
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', function (e) {
    if (e.target === backdrop) close();
  });
  document.addEventListener('keydown', onKey);

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  void backdrop.offsetHeight;
  backdrop.classList.add('open');
  return { close: close };
}

export function tierLabel(tier) {
  if (tier === 'first-line') return 'Primera línea';
  if (tier === 'alternative') return 'Alternativa';
  return '';
}
