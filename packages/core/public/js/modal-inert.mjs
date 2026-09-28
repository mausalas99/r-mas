/**
 * While a modal panel is open, the app behind it (the top header and .app)
 * is inert: out of the tab order, hidden from screen readers, and no longer
 * read by axe's contrast check through the dimmed backdrop.
 *
 * Modals are body-level `.modal-backdrop` siblings of the app, so they are
 * never inside what goes inert. A «peek» backdrop keeps the app usable, and
 * a backdrop hidden by CSS (focus mode) blocks nothing, so both are skipped.
 */
const APP_SEL = 'body > header, body > .app';

let lastAppFocus = null;

function blockingModalOpen() {
  for (const el of document.querySelectorAll('body > .modal-backdrop.open')) {
    if (el.classList.contains('shortcuts-backdrop--peek')) continue;
    if (el.getClientRects().length) return true;
  }
  return false;
}

function sync() {
  const app = [...document.querySelectorAll(APP_SEL)];
  if (!app.length) return;
  const block = blockingModalOpen();
  if (block === app[0].inert) return;
  app.forEach((el) => { el.inert = block; });
  if (block) return;
  // Focus is still in the panel that just closed (or already fell to <body>),
  // and a close handler that refocused its opener in the same tick hit an
  // inert element: give focus back to where it was in the app.
  const active = document.activeElement;
  if (lastAppFocus?.isConnected && (!active || !active.closest(APP_SEL))) lastAppFocus.focus({ preventScroll: true });
}

export function initModalInert() {
  if (typeof document === 'undefined' || !document.body) return;
  document.addEventListener('focusin', (e) => {
    const t = e.target;
    if (t instanceof Element && !t.closest('[inert]') && t.closest(APP_SEL)) lastAppFocus = t;
  });
  const onBackdrop = new MutationObserver(sync);
  const watch = () => {
    for (const el of document.querySelectorAll('body > .modal-backdrop')) {
      onBackdrop.observe(el, { attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
    }
  };
  // Backdrops built on demand are appended to <body>; body classes (focus mode) can hide one.
  new MutationObserver(() => { watch(); sync(); })
    .observe(document.body, { childList: true, attributes: true, attributeFilter: ['class'] });
  watch();
  sync();
}
