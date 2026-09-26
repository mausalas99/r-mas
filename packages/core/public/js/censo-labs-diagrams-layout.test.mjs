import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutCensoLabDiagrams, censoLabDiagramsMinHeight } from './censo-labs-diagrams-layout.mjs';

const five = [
  { w: 300, h: 192 },
  { w: 470, h: 130 },
  { w: 270, h: 230 },
  { w: 270, h: 162 },
  { w: 270, h: 172 },
];

function inside(p, W, H) {
  return p.x >= -1e-9 && p.y >= -1e-9 && p.x + p.w <= W + 1e-9 && p.y + p.h <= H + 1e-9;
}

test('short cell: one line, fills the width, stays inside', () => {
  const H = censoLabDiagramsMinHeight(five, 200, 4);
  const placed = layoutCensoLabDiagrams(five, 200, H, 4);
  assert.equal(new Set(placed.map((p) => (p.y + p.h / 2).toFixed(6))).size, 1);
  placed.forEach((p) => assert.ok(inside(p, 200, H)));
});

test('tall cell: diagrams wrap to more lines and grow', () => {
  const oneLine = layoutCensoLabDiagrams(five, 200, censoLabDiagramsMinHeight(five, 200, 4), 4);
  const tall = layoutCensoLabDiagrams(five, 200, 160, 4);
  assert.ok(new Set(tall.map((p) => (p.y + p.h / 2).toFixed(6))).size > 1);
  assert.ok(tall[0].h > oneLine[0].h * 1.5);
  tall.forEach((p) => assert.ok(inside(p, 200, 160)));
});

test('lone diagram in a tall box stays as small as in a full set', () => {
  const [lone] = layoutCensoLabDiagrams([{ w: 270, h: 162 }], 200, 160, 4);
  const full = layoutCensoLabDiagrams(five.slice(0, 4), 200, 160, 4);
  assert.ok(Math.abs(lone.w - full[3].w) < 1e-9);
  assert.ok(inside(lone, 200, 160));
});

test('lone diagram does not make the row tall', () => {
  const lone = censoLabDiagramsMinHeight([{ w: 270, h: 162 }], 200, 4);
  assert.ok(lone <= 200 / 8 + 1e-9);
});

test('every diagram gets the same scale', () => {
  const placed = layoutCensoLabDiagrams(five, 200, 160, 4);
  const scales = placed.map((p, i) => p.w / five[i].w);
  scales.forEach((s) => assert.ok(Math.abs(s - scales[0]) < 1e-9));
});

test('lone diagram sits top-left, not centered', () => {
  const [p] = layoutCensoLabDiagrams([{ w: 270, h: 162 }], 200, 160, 4);
  assert.equal(p.x, 0);
  assert.equal(p.y, 0);
});
