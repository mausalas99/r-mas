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

/**
 * Renderiza una página como líneas visuales: ítems de texto agrupados por Y y
 * ordenados por X. El orden del content stream (pdf-parse por defecto) desordena
 * tablas: valores quedan lejos de su etiqueta.
 */
async function renderPageByLayout(pageData) {
  const tc = await pageData.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
  const items = tc.items.filter((i) => i.str.trim());
  items.sort((a, b) => b.transform[5] - a.transform[5]);
  const lines = [];
  for (const it of items) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.y - it.transform[5]) <= 3) last.items.push(it);
    else lines.push({ y: it.transform[5], items: [it] });
  }
  return lines
    .map((l) => {
      l.items.sort((a, b) => a.transform[4] - b.transform[4]);
      let out = '';
      let endX = null;
      for (const it of l.items) {
        if (endX !== null) {
          const gap = it.transform[4] - endX;
          // Celdas contiguas llegan pegadas (gap≈0): siempre separar.
          if (!/\s$/.test(out) && !/^\s/.test(it.str)) out += gap > 12 ? '   ' : ' ';
        }
        out += it.str;
        endX = it.transform[4] + it.width;
      }
      return out;
    })
    .join('\n');
}

/** Texto en orden visual (tablas del Laboratorio Clínico de Reumatología). */
export async function extractLayoutTextFromPdfBuffer(buffer) {
  const data = await pdf(new Uint8Array(buffer), { pagerender: renderPageByLayout });
  return normalizePdfExtract(data.text || '');
}
