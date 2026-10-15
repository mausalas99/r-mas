/*
 * Physics for indicators and switches (skill: feel). Feel comes from /vendor/feel.js;
 * without it (or with reduced motion / Sobrio) every function just jumps to the end state.
 *   pill   "tight, playful"  1 mass, 3.3 Hz, zeta 0.65: slides fast, overshoots ~7%, settles in ~290 ms.
 *   switch "heavy, clicky"   3 mass, 2.1 Hz, zeta 0.74: has weight, 3% overshoot, settles in ~430 ms; the thumb can be dragged.
 */
import { prefersReducedMotion } from './ui-motion.mjs';

var PILL_FEEL = 'tight, playful';
var SWITCH_FEEL = 'heavy, clicky';
/** Thumb travel in px. Must match `translateX(20px)` on `.rpc-switch-input:checked` in lab.css. */
var SWITCH_TRAVEL = 20;

/** Pointer samples closer than this (ms) are the same sample seen twice: a speed read from them is noise. */
var MIN_HAND_DT = 8;

/**
 * Move a held body's hand. Feel reads the hand's speed from consecutive calls, so two calls a fraction of a
 * millisecond apart (the first move right after a grab) would read 100,000 px/s and fling the body.
 * `move(body, x)` for a line, `move(body, x, y)` in a plane.
 */
export function moveHand(body, x, y) {
  var h = body.hand;
  if (!h) return;
  if (performance.now() - h.t >= MIN_HAND_DT) {
    if (y === undefined) body.move(x);
    else body.move(x, y);
    return;
  }
  // Too soon to read a speed: take the position (the last sample must never be lost), keep the speed and the clock.
  h.x = x;
  if (y !== undefined) h.y = y;
}

function feel() {
  return typeof window !== 'undefined' && window.Feel ? window.Feel : null;
}

/** A position and a size on two springs. `paint(x, w)` writes them to the DOM. */
export function createGlide(paint) {
  var F = feel();
  if (!F) {
    return {
      jump: function (x, w) { paint(x, w); },
      to: function (x, w) { paint(x, w); },
    };
  }
  var bx = new F.Body({ feel: PILL_FEEL, x: 0, target: 0, onFrame: draw });
  var bw = new F.Body({ feel: PILL_FEEL, x: 0, target: 0, onFrame: draw });
  function draw() {
    paint(bx.x, Math.max(0, bw.x));
  }
  function jump(x, w) {
    bx.jump(x);
    bw.jump(w);
  }
  return {
    jump: jump,
    to: function (x, w) {
      if (prefersReducedMotion()) jump(x, w);
      else {
        bx.to(x);
        bw.to(w);
      }
    },
  };
}

var thumbs = typeof WeakMap === 'function' ? new WeakMap() : null;

/** The thumb's body. Its x is an OFFSET from where the CSS :checked rule puts the thumb, so a drag and a tap share one body. */
function thumbBody(F, thumb) {
  var b = thumbs.get(thumb);
  if (!b) {
    b = new F.Body({
      feel: SWITCH_FEEL,
      x: 0,
      target: 0,
      onFrame: function (body) { thumb.style.translate = body.x ? body.x + 'px' : ''; },
    });
    thumbs.set(thumb, b);
  }
  return b;
}

/**
 * The CSS :checked rule puts the thumb at its new side at once. Here it starts from the old side
 * (an offset) and the spring takes the offset to 0. A toggle mid-flight re-aims, keeping velocity.
 */
function onSwitchChange(ev) {
  var input = ev.target;
  var F = feel();
  if (!F || !thumbs || !input || !input.matches || !input.matches('.rpc-switch-input') || prefersReducedMotion()) return;
  var thumb = input.parentElement && input.parentElement.querySelector('.rpc-switch-thumb');
  if (!thumb) return;
  var b = thumbBody(F, thumb);
  b.x += input.checked ? -SWITCH_TRAVEL : SWITCH_TRAVEL;
  b.to(0);
}

// ── drag: the pointer pulls the thumb through the hand spring; on release the side it would coast to wins.
var DRAG_SLOP = 4;
var drag = null;
var suppressClickUntil = 0;

function onSwitchDown(ev) {
  var F = feel();
  if (!F || !thumbs || drag || ev.button !== 0 || prefersReducedMotion()) return;
  var track = ev.target && ev.target.closest && ev.target.closest('.rpc-switch-track');
  var input = track && track.parentElement && track.parentElement.querySelector('.rpc-switch-input');
  var thumb = track && track.querySelector('.rpc-switch-thumb');
  if (!input || !thumb || input.disabled) return;
  var b = thumbBody(F, thumb);
  drag = { input: input, b: b, base: input.checked ? SWITCH_TRAVEL : 0, startX: ev.clientX, startOff: b.x, id: ev.pointerId, moved: false };
  document.addEventListener('pointermove', onSwitchMove);
  document.addEventListener('pointerup', onSwitchUp);
  document.addEventListener('pointercancel', onSwitchUp);
}

function onSwitchMove(ev) {
  if (!drag || ev.pointerId !== drag.id) return;
  var dx = ev.clientX - drag.startX;
  if (!drag.moved) {
    if (Math.abs(dx) < DRAG_SLOP) return;
    drag.moved = true;
    // Walls = the two ends of the track, in offset terms.
    drag.b.min = -drag.base;
    drag.b.max = SWITCH_TRAVEL - drag.base;
    drag.b.grab(drag.startOff);
  }
  moveHand(drag.b, Math.min(drag.b.max, Math.max(drag.b.min, drag.startOff + dx)));
}

function onSwitchUp(ev) {
  if (!drag || ev.pointerId !== drag.id) return;
  var d = drag;
  drag = null;
  document.removeEventListener('pointermove', onSwitchMove);
  document.removeEventListener('pointerup', onSwitchUp);
  document.removeEventListener('pointercancel', onSwitchUp);
  if (!d.moved) return; // a tap: the label's own click toggles it
  suppressClickUntil = ev.timeStamp + 100;
  d.b.release();
  var checked = d.base + d.b.projected() > SWITCH_TRAVEL / 2;
  d.b.min = -Infinity;
  d.b.max = Infinity;
  if (checked === d.input.checked) {
    d.b.to(0);
    return;
  }
  d.input.checked = checked;
  d.input.dispatchEvent(new Event('input', { bubbles: true }));
  d.input.dispatchEvent(new Event('change', { bubbles: true })); // onSwitchChange re-bases the offset and springs it home
}

/** The click that follows a drag would toggle the switch a second time. */
function onClickCapture(ev) {
  if (ev.timeStamp < suppressClickUntil && ev.target.closest && ev.target.closest('.rpc-switch')) {
    ev.preventDefault();
    ev.stopPropagation();
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('change', onSwitchChange);
  document.addEventListener('pointerdown', onSwitchDown);
  document.addEventListener('click', onClickCapture, true);
}
