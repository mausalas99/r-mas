/**
 * Synthetic hospital lab-repository portal pages, for the `fakePortal`
 * harness launch mode (see harness.mjs `setPortalScript`). Mirrors the real
 * ASP.NET webform shape documented in lib/lab-repo/fixtures/README.md, with
 * made-up tokens — never copy the live fixtures/live-*.html captures.
 */
import { PDFDocument, StandardFonts } from 'pdf-lib';

/** GET index.aspx (or the Drop1-switch POST response). */
export function portalIndexHtml({ mode = 'NOMBRE', viewstate = 'e2e-viewstate' } = {}) {
  return (
    '<html><body><form name="form1" method="post" action="index.aspx" id="form1">' +
    `<input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="${viewstate}" />` +
    '<input type="hidden" name="__VIEWSTATEENCRYPTED" id="__VIEWSTATEENCRYPTED" value="" />' +
    `<input type="hidden" name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="${viewstate}-ev" />` +
    '<select name="Drop1" id="Drop1">' +
    `<option${mode === 'NOMBRE' ? ' selected="selected"' : ''} value="NOMBRE">NOMBRE</option>` +
    `<option${mode === 'REGISTRO' ? ' selected="selected"' : ''} value="REGISTRO">REGISTRO</option>` +
    '</select>' +
    '<input name="TextBox2" type="text" id="TextBox2" />' +
    '<input type="submit" name="Button1" value="Buscar" id="Button1" />' +
    '</form></body></html>'
  );
}

/** POST search result page with a GridView1 table of rows. */
export function portalResultsHtml(rows) {
  const tr = rows
    .map(
      (r, i) =>
        '<tr>' +
        `<td>${r.fecha}</td><td>${r.nombre || 'DEMO PORTAL'}</td><td>${r.registro}</td>` +
        `<td>${r.departamento || 'LABORATORIO CENTRAL'}</td><td>${r.tipo || 'ESTUDIO'}</td><td>${r.folio}</td>` +
        `<td><a href="javascript:__doPostBack('GridView1','Select$${i}')">Seleccionar</a></td>` +
        '</tr>'
    )
    .join('');
  return (
    '<html><body><form name="form1" method="post" action="index.aspx" id="form1">' +
    '<input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="e2e-viewstate-results" />' +
    '<input type="hidden" name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="e2e-viewstate-results-ev" />' +
    '<select name="Drop1" id="Drop1"><option value="NOMBRE">NOMBRE</option>' +
    '<option selected="selected" value="REGISTRO">REGISTRO</option></select>' +
    '<input name="TextBox2" type="text" id="TextBox2" />' +
    '<table id="GridView1"><tr><th>Fecha Solicitud</th><th>Nombre</th><th>Registro</th>' +
    '<th>Departamento</th><th>Tipo de Estudio</th><th>Folio</th><th>&nbsp;</th></tr>' +
    tr +
    '</table></form></body></html>'
  );
}

/** Search page with zero matches ("<<< SIN COINCIDENCIAS >>>"). */
export function portalNoMatchesHtml() {
  return '<html><body>&lt;&lt;&lt; SIN COINCIDENCIAS &gt;&gt;&gt;</body></html>';
}

/** Select-postback response that embeds the SOME report text directly (no Impresion.aspx hop). */
export function portalEmbeddedReportHtml(someText) {
  return `<html><body>${String(someText).split('\n').join('<br>\n')}</body></html>`;
}

/** Select-postback response that opens Impresion.aspx in a new window, like the real portal. */
export function portalSelectOpensImpresionHtml() {
  return "<html><script>window.open('Impresion.aspx','_blank','width=700')</script></html>";
}

/** GET Impresion.aspx report page (same wrapping as portalEmbeddedReportHtml). */
export const portalImpresionHtml = portalEmbeddedReportHtml;

/** A minimal, valid, real PDF (via pdf-lib) whose extracted text is `lines`. */
export async function buildSyntheticSomePdf(lines) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);
  let y = 740;
  for (const line of lines) {
    page.drawText(line, { x: 40, y, size: 11, font });
    y -= 16;
  }
  return Buffer.from(await doc.save());
}
