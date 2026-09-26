// Censo labs diagrams: place N images in a W×H box as big as they fit (pure, shared by PDF + tests).
// Every diagram uses the same scale, so text is the same size in all of them.

/** SVG sizes of a full set: BH, Electrolitos, Hepática, Gasometría. */
var FULL_SET = [
  { w: 300, h: 192 },
  { w: 470, h: 130 },
  { w: 270, h: 230 },
  { w: 270, h: 162 },
];
/** Width of the full set on one line, in SVG units. */
export var CENSO_FULL_SET_W = 1310;

function lineScale(sizes, line, boxW, gap) {
  var w = line.reduce(function (s, i) { return s + sizes[i].w; }, 0);
  return Math.max(0, boxW - gap * (line.length - 1)) / w;
}

function lineH(sizes, line) {
  return Math.max.apply(null, line.map(function (i) { return sizes[i].h; }));
}

/**
 * Splits the images (in order) into lines and keeps the split with the biggest common
 * scale.
 * Never bigger than a full set would get in the same box: a lone Gasometría stays small.
 * @param {{ w: number, h: number }[]} sizes
 * @param {number} boxW
 * @param {number} boxH
 * @param {number} gap
 * @returns {{ x: number, y: number, w: number, h: number }[]} x/y from the box top-left
 */
export function layoutCensoLabDiagrams(sizes, boxW, boxH, gap) {
  if (!sizes.length) return [];
  var best = bestSplit(sizes, boxW, boxH, gap);
  var cap = bestSplit(FULL_SET, boxW, boxH, gap).scale;
  return place(sizes, best.lines, Math.min(best.scale, cap), gap);
}

function bestSplit(sizes, boxW, boxH, gap) {
  var n = sizes.length;
  var best = null;
  for (var mask = 0; mask < 1 << (n - 1); mask++) {
    var lines = [[0]];
    for (var i = 1; i < n; i++) {
      if (mask & (1 << (i - 1))) lines.push([i]);
      else lines[lines.length - 1].push(i);
    }
    var totalH = lines.reduce(function (s, line) { return s + lineH(sizes, line); }, 0);
    var scale = Math.min(
      Math.max(0, boxH - gap * (lines.length - 1)) / totalH,
      Math.min.apply(null, lines.map(function (line) { return lineScale(sizes, line, boxW, gap); }))
    );
    if (!best || scale > best.scale) best = { scale: scale, lines: lines };
  }
  return best;
}

/** Packed from the top-left, `gap` apart: a small set sits under the date, not centered. */
function place(sizes, lines, scale, gap) {
  var placed = [];
  var y = 0;
  lines.forEach(function (line) {
    var lineHeight = lineH(sizes, line) * scale;
    var x = 0;
    line.forEach(function (i) {
      var w = sizes[i].w * scale;
      var h = sizes[i].h * scale;
      placed[i] = { x: x, y: y + (lineHeight - h) / 2, w: w, h: h };
      x += w + gap;
    });
    y += lineHeight + gap;
  });
  return placed;
}

/**
 * Row height floor: all images on one line, at no bigger a scale than a full set gets,
 * so one or two diagrams do not make the row tall (they still grow into a tall row).
 */
export function censoLabDiagramsMinHeight(sizes, boxW, gap) {
  if (!sizes.length) return 0;
  var w = sizes.reduce(function (s, z) { return s + z.w; }, 0);
  var scale = Math.max(0, boxW - gap * (sizes.length - 1)) / Math.max(w, CENSO_FULL_SET_W);
  return scale * Math.max.apply(null, sizes.map(function (z) { return z.h; }));
}
