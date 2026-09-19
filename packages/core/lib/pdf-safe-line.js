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

module.exports = { pdfSafeLine };
