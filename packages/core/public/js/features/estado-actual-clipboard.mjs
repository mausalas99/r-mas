/** Portapapeles de Estado Actual: convierte texto con negritas markdown `**texto**`
 * en texto plano sin asteriscos + HTML con `<strong>`, para que apps como
 * Google Docs muestren negritas al pegar en vez de los asteriscos crudos.
 */
function escEaHtml_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * `¿INESTABLE?` es alerta para el residente en pantalla; nunca sale por copiar.
 * @param {string} text
 */
export function stripEaReviewFlags(text) {
  return String(text == null ? '' : text).replace(/¿INESTABLE\?,?[ \t]*/g, '');
}

/**
 * @param {string} text texto con pares `**negrita**`
 * @returns {{ text: string, html: string }}
 */
export function estadoActualTextToClipboardPayload(text) {
  var t = stripEaReviewFlags(text);
  var html = t
    .split('\n')
    .map(function (line) {
      return escEaHtml_(line).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    })
    .join('<br>');
  return {
    text: t.replace(/\*\*(.+?)\*\*/g, '$1'),
    html: html,
  };
}
