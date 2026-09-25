/**
 * Delegated dispatch for the on*="..." attributes removed from the partials
 * and from HTML built by JS for CSP (script-src has no 'unsafe-inline', so
 * inline event handler attributes never run). One listener per event type,
 * all on `document` in the capture phase. `data-stop-propagation` stops the
 * event at the panel itself, in the bubble phase, exactly where the old inline
 * `onclick="event.stopPropagation()"` ran: its backdrop's dismiss listener is
 * still blocked, and listeners inside the panel still fire. (Stopping here in
 * document capture instead killed every addEventListener inside the panel —
 * e.g. «Crear nuevo equipo» in the Equipo dropdown did nothing.)
 *
 * Markup contract, one namespaced attribute set per original on* attribute
 * so click/change/input/blur/keydown never collide on the same element:
 *   data-onclick="fnName"                 -> window.fnName(...args) on click
 *   data-onclick-args='["a",1]'           -> JSON array of literal args (default [])
 *   data-onclick-pass="event"|"value"|"checked" -> ev, el.value or el.checked
 *     appended as the LAST argument (matches every original "fn(a, this.value)" call)
 *   data-onclick-2 / -2-args / -2-pass    -> a second call (was "a(); b();")
 *   data-onchange / data-oninput / data-onblur / data-onkeydown -> same shape
 *   data-onkeydown-keys="Enter,Space"     -> skip unless the pressed key matches
 *   data-onkeydown-prevent                -> event.preventDefault() when the key matches
 *     (role="button" divs: stops Space from scrolling the page)
 *   data-stop-propagation                 -> click.stopPropagation() (any ancestor; clicks only)
 *   data-prevent-submit                   -> event.preventDefault() on submit (was onsubmit="return false;")
 */

const EVENT_ATTR = {
  click: 'onclick',
  change: 'onchange',
  input: 'oninput',
  blur: 'onblur',
  keydown: 'onkeydown',
  paste: 'onpaste',
};

function keyToken(ev) {
  return ev.key === ' ' ? 'Space' : ev.key;
}

function passValue(el, ev, pass) {
  if (pass === 'event') return ev;
  if (pass === 'value') return el.value;
  if (pass === 'checked') return el.checked;
  return undefined;
}

function callAction(el, ev, name, pass, argsJson) {
  if (!name) return;
  var fn = window[name];
  if (typeof fn !== 'function') return;
  var args = [];
  if (argsJson) {
    try {
      args = JSON.parse(argsJson);
    } catch {
      args = [];
    }
  }
  if (pass) args = args.concat([passValue(el, ev, pass)]);
  fn.apply(null, args);
}

function dispatch(ev, eventType) {
  var target = ev.target;
  if (!target || typeof target.closest !== 'function') return;

  // Click only, like the old inline onclick: stopping keydown too swallowed Escape in every such panel.
  var stopEl = eventType === 'click' ? target.closest('[data-stop-propagation]') : null;
  if (stopEl && !stopEl._rpcStopClick) {
    stopEl._rpcStopClick = true;
    stopEl.addEventListener('click', function (e) { e.stopPropagation(); });
  }

  var attr = EVENT_ATTR[eventType];
  var dataAttr = 'data-' + attr;
  var el = target.closest('[' + dataAttr + ']');
  if (!el) return;

  if (eventType === 'keydown') {
    var keys = el.getAttribute(dataAttr + '-keys');
    if (keys && keys.split(',').indexOf(keyToken(ev)) === -1) return;
    if (el.hasAttribute(dataAttr + '-prevent')) ev.preventDefault();
  }

  callAction(el, ev, el.getAttribute(dataAttr), el.getAttribute(dataAttr + '-pass'), el.getAttribute(dataAttr + '-args'));
  callAction(
    el,
    ev,
    el.getAttribute(dataAttr + '-2'),
    el.getAttribute(dataAttr + '-2-pass'),
    el.getAttribute(dataAttr + '-2-args')
  );
}

function onSubmitCapture(ev) {
  var target = ev.target;
  if (target && typeof target.closest === 'function' && target.closest('[data-prevent-submit]')) {
    ev.preventDefault();
  }
}

let inited = false;

export function initInlineActionDispatch() {
  if (inited) return;
  inited = true;
  Object.keys(EVENT_ATTR).forEach(function (type) {
    document.addEventListener(
      type,
      function (ev) {
        dispatch(ev, type);
      },
      true
    );
  });
  document.addEventListener('submit', onSubmitCapture, true);
}
