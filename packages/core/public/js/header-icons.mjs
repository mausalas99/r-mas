/**
 * Header button icons built as DOM nodes (theme sun/moon, help). Boot path: no string parsing,
 * no Preact. Same SVG the string constants in chrome.mjs and top-bar.mjs used to write.
 */
const SVG_NS = 'http://www.w3.org/2000/svg';

const SVG_ATTRS = [
  ['class', 'btn-header-icon-svg'], ['width', '18'], ['height', '18'], ['viewBox', '0 0 24 24'], ['fill', 'none'],
  ['stroke', 'currentColor'], ['stroke-width', '2'], ['stroke-linecap', 'round'], ['stroke-linejoin', 'round'],
  ['aria-hidden', 'true'],
];

const SHAPES = {
  sun: [
    ['circle', [['cx', '12'], ['cy', '12'], ['r', '4']]],
    ['path', [['d', 'M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41']]],
  ],
  moon: [['path', [['d', 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z']]]],
  help: [
    ['circle', [['cx', '12'], ['cy', '12'], ['r', '9']]],
    ['path', [['d', 'M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6']]],
    ['path', [['d', 'M12 17h.01']]],
  ],
};

/** @param {'sun'|'moon'|'help'} name @returns {SVGElement} */
export function buildHeaderIcon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  SVG_ATTRS.forEach(([k, v]) => svg.setAttribute(k, v));
  SHAPES[name].forEach(([tag, attrs]) => {
    const shape = document.createElementNS(SVG_NS, tag);
    attrs.forEach(([k, v]) => shape.setAttribute(k, v));
    svg.appendChild(shape);
  });
  return svg;
}
