/*
 * Physics for the Tendencias card drag (skill: feel). The words and what they mean:
 *   ghost + drop "light"      mass 0.45, 3 Hz, zeta 0.62: trails the pointer a few px, lands with an 8% overshoot.
 *   neighbors "light, soft"   2.05 Hz, zeta 0.81: glide to the new slot, 1% overshoot.
 *   lift "snappy"             3.4 Hz, zeta 0.82: pick-up grows 3% and the shadow deepens.
 * Feel comes from /vendor/feel.js. Without it every function falls back to the old instant behavior.
 */

import { moveHand } from '../ui-feel.mjs';

var LIFT_SCALE = 0.02;
/** How tightly the pointer holds the card (Feel default 6). Higher = less trailing: at 12 the card is ~18 ms behind a fast drag. */
var HAND_FREQ = 12;

function feel() {
  return typeof window !== 'undefined' && window.Feel ? window.Feel : null;
}

function paintGhost(ghost, body, lift) {
  var speedBlur = Math.min(body.speed / 40, 12);
  ghost.style.transform =
    'translate(' + body.x + 'px,' + body.y + 'px) scale(' + (1 + LIFT_SCALE * lift.x) + ')';
  ghost.style.boxShadow =
    '0 ' + (6 + 12 * lift.x) + 'px ' + (14 + 18 * lift.x + speedBlur) + 'px rgba(0,0,0,' + (0.08 + 0.12 * lift.x) + ')';
}

/**
 * Ghost = a light body pulled by the pointer through a hand spring; lift = a 1D body 0 → 1.
 * `grabX/grabY` is where inside the card the pointer holds it: the lift scales around that point, so it stays under the cursor.
 */
export function createGhostMotion(ghost, rect, grabX, grabY) {
  var F = feel();
  if (!F) return null;
  ghost.style.left = '0px';
  ghost.style.top = '0px';
  ghost.style.willChange = 'transform';
  ghost.style.transformOrigin = grabX + 'px ' + grabY + 'px';
  var lift = new F.Body({ feel: 'snappy', x: 0, target: 0, onFrame: paint });
  var body = new F.Body2D({ feel: 'light', handFreq: HAND_FREQ, x: rect.left, y: rect.top, onFrame: paint });
  function paint() {
    paintGhost(ghost, body, lift);
  }
  body.grab(rect.left, rect.top);
  lift.to(1);
  paint();
  return {
    move: function (x, y) {
      moveHand(body, x, y);
    },
    /** Let go: fly to the slot, drop the lift, call done once both rest. */
    drop: function (slot, done) {
      // The runtime reports a settle only after real motion, so a drop that starts at rest must finish here.
      if (F.reducedMotion) {
        done();
        return;
      }
      var liftDone = false;
      var bodyDone = false;
      function check() {
        if (liftDone && bodyDone) done();
      }
      lift.onSettle = function () { liftDone = true; check(); };
      body.onSettle = function () { bodyDone = true; check(); };
      body.release();
      lift.to(0);
      body.to({ x: slot.left, y: slot.top });
      if (body.atRest()) bodyDone = true;
      if (lift.atRest()) liftDone = true;
      check();
    },
    stop: function () {
      lift.onSettle = null;
      body.onSettle = null;
    },
  };
}

/**
 * Run `mutate` (a DOM reorder), then spring every card that moved from where it was drawn to its new slot.
 * A card already mid-glide keeps its velocity: the offset is re-aimed, never reset.
 */
export function flipTendCards(cards, mutate) {
  var F = feel();
  if (!F || F.reducedMotion) {
    mutate();
    return;
  }
  var before = cards.map(function (c) { return c.getBoundingClientRect().top; });
  mutate();
  cards.forEach(function (c, i) {
    var b = c._tendFlip;
    var d = before[i] - (c.getBoundingClientRect().top - (b ? b.x : 0));
    if (!b && Math.abs(d) < 0.5) return;
    if (!b) {
      b = c._tendFlip = new F.Body({
        feel: 'light, soft',
        x: 0,
        target: 0,
        onFrame: function (bb) { c.style.transform = bb.x ? 'translateY(' + bb.x + 'px)' : ''; },
        onSettle: function () { c.style.transform = ''; c._tendFlip = null; },
      });
    }
    b.x = d;
    b.to(0);
  });
}
