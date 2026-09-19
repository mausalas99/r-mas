/** Portapapeles de labs: convierte líneas con marcador `valor*` (fuera de rango)
 * en texto plano sin asterisco + HTML con `<strong>`, para que apps como
 * Google Docs muestren negritas al pegar en vez del asterisco crudo.
 */
function escLabHtml_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * @param {string[]} lines
 * @returns {{ text: string, html: string }}
 */
export function labLinesToClipboardPayload(lines) {
  var htmlLines = lines.map(function (line) {
    return line
      .split(' ')
      .map(function (tok) {
        if (!tok) return tok;
        if (tok.endsWith('*')) return '<strong>' + escLabHtml_(tok.slice(0, -1)) + '</strong>';
        return escLabHtml_(tok);
      })
      .join(' ');
  });
  return {
    text: lines.map(function (line) { return line.replace(/\*(?=\s|$)/g, ''); }).join('\n'),
    html: htmlLines.join('<br>'),
  };
}
