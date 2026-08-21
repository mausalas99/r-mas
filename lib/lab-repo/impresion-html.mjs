/** Convert Impresion.aspx HTML report to SOME-like plain text for procesarLabs. */

function stripScriptsAndStyles(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
}

function htmlToPlainText(html) {
  var t = stripScriptsAndStyles(html);
  t = t.replace(/<br\s*\/?>/gi, '\n');
  t = t.replace(/<\/tr>/gi, '\n');
  t = t.replace(/<\/td>/gi, '\t');
  t = t.replace(/<\/th>/gi, '\t');
  // Antibiogram MIC values sometimes reach this HTML unescaped (e.g. "<=2"),
  // so a bare "<[^>]+>" would treat "<=2</td>" as one tag and swallow the
  // value along with the next real tag close. Only strip well-formed tags
  // (name starts right after "<" or "</", or "<!" for comments/doctype).
  t = t.replace(/<\/?[a-zA-Z!][^<>]*>/g, '');
  t = t
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return t;
}

export function extractSomeTextFromImpresionHtml(html) {
  return htmlToPlainText(html);
}

export function impresionUrlFromSelectHtml(html) {
  var m = String(html || '').match(
    /window\.open\s*\(\s*['"](Impresion\.aspx[^'"]*)['"]/i
  );
  return m ? m[1] : 'Impresion.aspx';
}
