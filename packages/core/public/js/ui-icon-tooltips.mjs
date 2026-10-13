/**
 * Text tooltips for icon-only buttons. Every button with no letters or digits
 * gets a linked role="tooltip" element (data-ui-tooltip) that opens on hover
 * and keyboard focus. The native `title` is lifted while the tip is open, so
 * the browser's own tooltip never doubles it.
 */
const HOST_ID = 'ui-icon-tips';
let seq = 0;
let host = null;
let openFor = null;

function tipHost() {
  if (host && host.isConnected) return host;
  host = document.createElement('div');
  host.id = HOST_ID;
  document.body.appendChild(host);
  return host;
}

function enhance(btn) {
  if (btn.hasAttribute('data-ui-tooltip') || /[\p{L}\p{N}]/u.test(btn.textContent || '')) return;
  const text = (btn.getAttribute('aria-label') || btn.getAttribute('title') || '').trim();
  if (!text) return;
  if (!btn.hasAttribute('aria-label')) btn.setAttribute('aria-label', text);
  const tip = document.createElement('span');
  tip.id = 'ui-icon-tip-' + (++seq);
  tip.className = 'ui-icon-tip';
  tip.setAttribute('role', 'tooltip');
  tip.textContent = text;
  tipHost().appendChild(tip);
  btn.setAttribute('data-ui-tooltip', tip.id);
}

function scan(root) {
  root.querySelectorAll('button:not([data-ui-tooltip]), [role="button"]:not([data-ui-tooltip])').forEach(enhance);
}

function show(btn) {
  const tip = document.getElementById(btn.getAttribute('data-ui-tooltip'));
  if (!tip) return;
  hide();
  const title = btn.getAttribute('title');
  if (title !== null) { btn.dataset.uiTitle = title; btn.removeAttribute('title'); }
  const r = btn.getBoundingClientRect();
  tip.classList.add('is-open');
  const w = tip.offsetWidth;
  tip.style.left = Math.max(4, Math.min(innerWidth - w - 4, r.left + r.width / 2 - w / 2)) + 'px';
  tip.style.top = (r.bottom + 6 + tip.offsetHeight > innerHeight ? r.top - tip.offsetHeight - 6 : r.bottom + 6) + 'px';
  openFor = btn;
}

function hide() {
  if (!openFor) return;
  const tip = document.getElementById(openFor.getAttribute('data-ui-tooltip'));
  if (tip) tip.classList.remove('is-open');
  if (openFor.dataset.uiTitle !== undefined) { openFor.setAttribute('title', openFor.dataset.uiTitle); delete openFor.dataset.uiTitle; }
  openFor = null;
}

export function initIconTooltips() {
  if (document.getElementById(HOST_ID)) return;
  tipHost();
  scan(document);
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      scan(document);
      host.querySelectorAll('.ui-icon-tip').forEach((t) => { if (!document.querySelector('[data-ui-tooltip="' + t.id + '"]')) t.remove(); });
    });
  }).observe(document.body, { childList: true, subtree: true });
  const target = (ev) => ev.target.closest && ev.target.closest('[data-ui-tooltip]');
  document.addEventListener('mouseover', (ev) => { const b = target(ev); if (b) show(b); });
  document.addEventListener('mouseout', (ev) => { if (target(ev)) hide(); });
  document.addEventListener('focusin', (ev) => { const b = target(ev); if (b && b.matches(':focus-visible')) show(b); });
  document.addEventListener('focusout', hide);
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') hide(); });
  document.addEventListener('scroll', hide, true);
}
