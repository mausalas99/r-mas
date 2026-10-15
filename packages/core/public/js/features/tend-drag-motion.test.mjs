import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// Feel is a browser global; give it a clock before it loads.
globalThis.window = globalThis;
globalThis.requestAnimationFrame = function (cb) { return setTimeout(function () { cb(performance.now()); }, 4); };
await import(pathToFileURL(resolve(import.meta.dirname, '../../vendor/feel.js')).href);
const { createGhostMotion, flipTendCards } = await import('./tend-drag-motion.mjs');

function fakeEl(top) {
  return { style: {}, top: top, getBoundingClientRect: function () { return { left: 10, top: this.top, width: 100, height: 40 }; } };
}

test('drop calls done once, after the ghost settles in the slot', async () => {
  const ghost = fakeEl(0);
  const m = createGhostMotion(ghost, ghost.getBoundingClientRect(), 30, 20);
  m.move(10, 120);
  assert.equal(ghost.style.transformOrigin, '30px 20px');
  await new Promise((r) => setTimeout(r, 200));
  let calls = 0;
  await new Promise((resolveDone) => m.drop({ left: 10, top: 60 }, () => { calls++; resolveDone(); }));
  assert.equal(calls, 1);
  assert.match(ghost.style.transform, /translate\(10px,60px\)/);
});

test('drop that starts at rest still calls done', async () => {
  const ghost = fakeEl(0);
  const m = createGhostMotion(ghost, ghost.getBoundingClientRect(), 0, 0);
  await new Promise((r) => setTimeout(r, 600));
  await new Promise((resolveDone) => m.drop({ left: 10, top: 0 }, resolveDone));
});

test('flipTendCards springs a moved card from its old spot and clears the transform', async () => {
  const a = fakeEl(0);
  const b = fakeEl(40);
  flipTendCards([a, b], () => { a.top = 40; b.top = 0; });
  await new Promise((r) => setTimeout(r, 30));
  assert.match(a.style.transform, /translateY\(-?\d/);
  await new Promise((r) => setTimeout(r, 900));
  assert.equal(a.style.transform, '');
  assert.equal(b.style.transform, '');
});

test('a held card follows the pointer to within 1px once it rests', async () => {
  const ghost = fakeEl(0);
  const m = createGhostMotion(ghost, ghost.getBoundingClientRect(), 5, 5);
  try {
    m.move(300, 200);
    await new Promise((r) => setTimeout(r, 700));
    const [x, y] = ghost.style.transform.match(/translate\(([-\d.]+)px,([-\d.]+)px\)/).slice(1).map(Number);
    assert.ok(Math.abs(x - 300) < 1 && Math.abs(y - 200) < 1, ghost.style.transform);
  } finally {
    await new Promise((resolveDone) => m.drop({ left: 300, top: 200 }, resolveDone)); // release it, or the loop never ends
  }
});
