/**
 * Resumen fit: every list row renders, then the rows that do not fit their
 * box ([data-fit]) are hidden and counted in the zone's «+N más» label.
 * Keeps at least one row per zone; trims the zone with the most rows first.
 */

function items(zone) {
  return Array.prototype.slice.call(zone.querySelectorAll('[data-fit-item]'));
}

function shown(zone) {
  return items(zone).filter(function (el) {
    return !el.hidden;
  });
}

function label(zone) {
  var card = zone.closest('.card');
  return zone.querySelector('[data-fit-more]') || (card && card.querySelector('[data-fit-more]'));
}

function syncLabel(zone) {
  var el = label(zone);
  if (!el) return;
  var cut = (Number(el.getAttribute('data-fit-base')) || 0) + items(zone).length - shown(zone).length;
  el.textContent = cut > 0 ? '+' + cut + ' más' : el.getAttribute('data-fit-idle') || '';
  el.hidden = !el.textContent;
}

function overflows(box) {
  return box.scrollHeight > box.clientHeight + 1;
}

function trimOne(box) {
  var best = null;
  var bestN = 1;
  box.querySelectorAll('[data-fit-zone]').forEach(function (zone) {
    var n = shown(zone).length;
    if (n > bestN) {
      best = zone;
      bestN = n;
    }
  });
  if (!best) return false;
  var rows = shown(best);
  rows[best.hasAttribute('data-fit-from-start') ? 0 : rows.length - 1].hidden = true;
  syncLabel(best);
  return true;
}

/**
 * Fewest columns that still fit, so the list fills the card height instead of
 * leaving a blank band below; falls back to the most columns (then trimming).
 */
function pickColumns(box) {
  var pack = box.querySelector('[data-fit-cols]');
  if (!pack) return;
  var counts = pack.getAttribute('data-fit-cols').split(',');
  for (var i = 0; i < counts.length; i += 1) {
    pack.style.columnCount = counts[i];
    if (!overflows(box)) return;
  }
}

/** @param {ParentNode} root */
export function fitDashboard(root) {
  var boxes = Array.prototype.slice.call(root.querySelectorAll('[data-fit]'));
  boxes.forEach(function (box) {
    items(box).forEach(function (el) {
      el.hidden = false;
    });
    box.closest('.card').querySelectorAll('[data-fit-zone]').forEach(syncLabel);
    pickColumns(box);
  });
  // chisle: one row per pass, re-measured each time; fine for ≤ ~60 rows.
  for (var guard = 0; guard < 200; guard += 1) {
    var progressed = boxes.filter(overflows).some(trimOne);
    if (!progressed) break;
  }
}

var observers = new WeakMap();

/** Refit now and whenever the free space changes (window resize, labs arriving). */
export function watchDashboardFit(mount) {
  var prev = observers.get(mount);
  if (prev) prev.disconnect();
  var bottom = mount.querySelector('.dash-bottom');
  if (!bottom) return;
  fitDashboard(mount);
  // Fonts load after first paint on reload; refit once they settle.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      if (mount.isConnected) fitDashboard(mount);
    });
  }
  if (typeof ResizeObserver !== 'function') return;
  var ro = new ResizeObserver(function () {
    fitDashboard(mount);
  });
  ro.observe(bottom);
  ro.observe(mount);
  observers.set(mount, ro);
}
