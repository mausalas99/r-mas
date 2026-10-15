import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// Feel is a browser global; give it a clock and a document before it loads.
globalThis.window = globalThis;
globalThis.requestAnimationFrame = function (cb) { return setTimeout(function () { cb(performance.now()); }, 4); };
var listeners = {};
globalThis.document = { addEventListener: function (type, fn) { listeners[type] = fn; }, removeEventListener: function (type) { delete listeners[type]; } };
await import(pathToFileURL(resolve(import.meta.dirname, '../vendor/feel.js')).href);
const { createGlide } = await import('./ui-feel.mjs');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test('glide jumps first, then springs past the target and lands on it', async () => {
  const seen = [];
  const g = createGlide((x, w) => seen.push([x, w]));
  g.jump(0, 80);
  assert.deepEqual(seen.at(-1), [0, 80]);
  g.to(200, 120);
  await wait(900);
  const xs = seen.map((s) => s[0]);
  assert.ok(Math.max(...xs) > 200, 'playful: overshoots a little');
  assert.ok(Math.max(...xs) < 230, 'but only a little');
  assert.deepEqual(seen.at(-1), [200, 120]);
});

test('switch change starts the thumb at the old side and ends at 0', async () => {
  const thumb = { style: {} };
  const input = {
    checked: true,
    parentElement: { querySelector: () => thumb },
    matches: (sel) => sel === '.rpc-switch-input',
  };
  listeners.change({ target: input });
  assert.equal(thumb.style.translate, undefined, 'first frame not painted yet');
  await wait(60);
  assert.match(thumb.style.translate, /^-\d/, 'checked: thumb starts 20px to the left');
  await wait(1100);
  assert.equal(thumb.style.translate, '');
});

function fakeSwitch(checked) {
  const thumb = { style: {} };
  const track = { querySelector: () => thumb };
  const input = {
    checked,
    disabled: false,
    parentElement: { querySelector: (sel) => (sel === '.rpc-switch-input' ? input : thumb) },
    matches: (sel) => sel === '.rpc-switch-input',
    dispatchEvent: (e) => { if (e.type === 'change') listeners.change({ target: input }); },
  };
  track.parentElement = input.parentElement;
  const target = { closest: (sel) => (sel === '.rpc-switch-track' ? track : null) };
  return { thumb, input, target };
}

test('dragging the thumb past halfway turns the switch on, then it settles at rest', async () => {
  const { thumb, input, target } = fakeSwitch(false);
  listeners.pointerdown({ target, button: 0, pointerId: 3, clientX: 100 });
  for (let x = 100; x <= 130; x += 5) { listeners.pointermove({ pointerId: 3, clientX: x }); await wait(16); }
  await wait(150);
  assert.ok(parseFloat(thumb.style.translate) > 5, 'thumb follows the pointer');
  listeners.pointerup({ pointerId: 3, timeStamp: performance.now() });
  assert.equal(input.checked, true);
  await wait(1100);
  assert.equal(thumb.style.translate, '');
});

test('a short drag springs back and leaves the switch off', async () => {
  const { thumb, input, target } = fakeSwitch(false);
  listeners.pointerdown({ target, button: 0, pointerId: 4, clientX: 100 });
  for (let x = 100; x <= 105; x += 1) { listeners.pointermove({ pointerId: 4, clientX: x }); await wait(16); }
  await wait(300);
  listeners.pointerup({ pointerId: 4, timeStamp: performance.now() });
  assert.equal(input.checked, false);
  await wait(1100);
  assert.equal(thumb.style.translate, '');
});
