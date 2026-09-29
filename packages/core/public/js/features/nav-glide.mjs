/**
 * Gliding pill behind the active tab of a top-bar row. The tab that is active
 * only changes colour; this one span moves and resizes to sit under it. It
 * follows any code that flips the active class or re-renders the row, so no
 * tab-switch path needs to know about it.
 */
var ACTIVE = '.exp-group-section.is-active, .exp-group-pill--leaf.is-active > .exp-group-name, .inner-tab.active';

export function wireGlide(bar) {
  if (!bar || bar._glide) return;
  var pill = document.createElement('span');
  pill.className = 'nav-glide';
  pill.setAttribute('aria-hidden', 'true');
  bar._glide = pill;
  var queued = false;
  function place() {
    queued = false;
    if (pill.parentNode !== bar) bar.insertBefore(pill, bar.firstChild); // the row re-renders with textContent = ''
    var tab = bar.querySelector(ACTIVE);
    if (!tab || !tab.offsetWidth) {
      pill.classList.remove('is-ready');
      return;
    }
    // Rect maths, not offsetLeft: a group wrapper is the tab's offset parent.
    var x = tab.getBoundingClientRect().left - bar.getBoundingClientRect().left + bar.scrollLeft;
    pill.style.width = tab.offsetWidth + 'px';
    pill.style.transform = 'translateX(' + Math.round(x) + 'px)';
    // First placement jumps; later ones glide (the transition is on .is-ready only).
    if (!pill.classList.contains('is-ready')) requestAnimationFrame(function () { pill.classList.add('is-ready'); });
  }
  function queue() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(place);
  }
  if (typeof MutationObserver === 'function') {
    new MutationObserver(queue).observe(bar, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'aria-selected'] });
  }
  if (typeof ResizeObserver === 'function') new ResizeObserver(queue).observe(bar);
  queue();
}
