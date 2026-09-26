// Censo: labs como diagramas (mismos SVG de Laboratorio), one PNG per diagram for the Labs cell.
import { buildDiagramCards } from './features/diagrams-render.mjs';

/** Pixels per SVG unit: sharp even when a lone diagram fills a tall cell. */
var SCALE = 3;
/** Print colors + bigger values: the cell shrinks the image a lot. */
var PRINT_SWAPS = [
  [/var\(--diagram-line\)/g, '#333'],
  [/var\(--diagram-label\)/g, '#666'],
  [/var\(--diagram-value\)/g, '#111'],
  [/var\(--error\)/g, '#c62828'],
  // Labels stay at 10: bigger labels cross the diagram lines.
  [/font-size="1[34]"/g, 'font-size="18"'],
];

function loadSvg(svg, vw, vh) {
  var fixed = svg.replace(/style="width:100%;display:block;"/, 'width="' + vw + '" height="' + vh + '"');
  PRINT_SWAPS.forEach(function (s) {
    fixed = fixed.replace(s[0], s[1]);
  });
  return new Promise(function (resolve, reject) {
    var img = new Image();
    img.onload = function () {
      resolve(img);
    };
    img.onerror = reject;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(fixed);
  });
}

/**
 * One transparent PNG per diagram; the PDF places them to fill the Labs cell.
 * @param {{ fecha: string, resLabs: string[] }} src
 * @returns {Promise<{ fecha: string, images: { dataUrl: string, w: number, h: number }[] } | null>}
 */
export async function buildCensoLabsDiagrams(src) {
  var cards = buildDiagramCards(src && src.resLabs).filter(function (c) { return c.svg; });
  if (!cards.length) return null;
  var images = await Promise.all(
    cards.map(async function (c) {
      var img = await loadSvg(c.svg, c.vw, c.vh);
      var canvas = document.createElement('canvas');
      canvas.width = c.vw * SCALE;
      canvas.height = c.vh * SCALE;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      return { dataUrl: canvas.toDataURL('image/png'), w: c.vw, h: c.vh };
    })
  );
  return { fecha: src.fecha || '', images: images };
}

/** Replaces row.labsDiagramSrc with row.labsDiagrams; rows with no diagram keep text labs. */
export async function attachCensoLabDiagrams(payload) {
  await Promise.all(
    (payload.rows || []).map(async function (row) {
      var src = row.labsDiagramSrc;
      delete row.labsDiagramSrc;
      if (!src) return;
      try {
        var diagrams = await buildCensoLabsDiagrams(src);
        if (diagrams) row.labsDiagrams = diagrams;
      } catch (e) {
        console.warn('[censo-labs-diagrams] diagram render failed, text labs kept', e);
      }
    })
  );
  return payload;
}
