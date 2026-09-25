/**
 * pdf-lib StandardFonts (WinAnsi) no admiten controles ni saltos en drawText.
 * @param {string} text
 * @returns {string}
 */
function pdfSafeLine(text) {
  return String(text || '')
    .split('')
    .map((ch) => (ch.charCodeAt(0) < 32 ? ' ' : ch))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

// WinAnsi (pdf-lib StandardFonts) = Latin-1 plus these 0x80–0x9F extras.
const WIN_ANSI_EXTRA = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');
const WIN_ANSI_MAP = { '≥': '>=', '≤': '<=', 'μ': 'µ', 'Δ': 'Delta', '→': '->', '←': '<-' };
const winAnsiOk = (ch) => {
  const c = ch.codePointAt(0);
  return c < 0x7f || (c >= 0xa0 && c <= 0xff) || WIN_ANSI_EXTRA.has(ch);
};

/**
 * Any text → text pdf-lib's StandardFonts can draw and measure. An unencodable
 * char throws "WinAnsi cannot encode" and kills the whole PDF, so: NFC
 * (macOS pastes "é" as e + U+0301), known clinical symbols, accent-stripped
 * NFKD form, else "?"; invisible format chars (zero-width, bidi) are dropped.
 * @param {string} text
 * @returns {string}
 */
function winAnsiSafe(text) {
  let out = '';
  for (const ch of String(text).normalize('NFC')) {
    if (winAnsiOk(ch)) out += ch;
    else if (WIN_ANSI_MAP[ch]) out += WIN_ANSI_MAP[ch];
    else if (/\p{Cf}/u.test(ch)) continue;
    else {
      const base = ch.normalize('NFKD').replace(/\p{M}/gu, '');
      out += base && [...base].every(winAnsiOk) ? base : '?';
    }
  }
  return out;
}

/** winAnsiSafe on every string inside a plain object/array. */
function winAnsiSafeDeep(v) {
  if (typeof v === 'string') return winAnsiSafe(v);
  if (Array.isArray(v)) return v.map(winAnsiSafeDeep);
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, winAnsiSafeDeep(x)]));
  }
  return v;
}

module.exports = { pdfSafeLine, winAnsiSafe, winAnsiSafeDeep };
