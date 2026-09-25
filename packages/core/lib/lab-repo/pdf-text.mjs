import pdf from 'pdf-parse/lib/pdf-parse.js';

export function looksLikeExtractedSome(text) {
  const t = String(text || '');
  return /Expediente\s*:/i.test(t) && /Nombre\s*:/i.test(t);
}

/** Collapse broken column gaps common in PDF extract. */
export function normalizePdfExtract(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function extractSomeTextFromPdfBuffer(buffer) {
  // Plain Uint8Array copy: under Electron's Node, pdf-parse's bundled pdf.js
  // misreads some Node Buffers ("bad XRef entry" / "Invalid PDF structure").
  const data = await pdf(new Uint8Array(buffer));
  return normalizePdfExtract(data.text || '');
}
