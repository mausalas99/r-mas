/**
 * Keeps a row of chips on one line: shrinks the font (down to `min` px), then
 * hides the chips that still do not fit and shows «+N» in `more`.
 * Refits when the row changes width. Skips while the row is not on screen.
 */
var observed = new WeakSet();

/** @param {HTMLElement} row @param {{ max?: number, min?: number }} [opts] */
export function fitOneRow(row, opts) {
  if (!row) return;
  var max = (opts && opts.max) || 13;
  var min = (opts && opts.min) || 10;
  if (!observed.has(row) && typeof ResizeObserver === 'function') {
    observed.add(row);
    var lastW = 0;
    new ResizeObserver(function () {
      if (row.clientWidth === lastW) return;
      lastW = row.clientWidth;
      fitOneRow(row, opts);
    }).observe(row);
  }
  var chips = Array.prototype.slice.call(row.querySelectorAll('[data-fit-chip]'));
  var more = row.querySelector('[data-fit-chip-more]');
  chips.forEach(function (c) {
    c.hidden = false;
  });
  if (more) more.hidden = true;
  if (!row.clientWidth) return;
  var over = function () {
    return row.scrollWidth > row.clientWidth + 1;
  };
  for (var size = max; size >= min; size -= 0.5) {
    row.style.fontSize = size + 'px';
    if (!over()) return;
  }
  if (!more) return;
  more.hidden = false;
  // chisle: one chip per pass, re-measured; rows hold a few dozen chips at most.
  for (var i = chips.length - 1; i > 0 && over(); i -= 1) {
    chips[i].hidden = true;
    more.textContent = '+' + (chips.length - i) + ' más';
  }
}
