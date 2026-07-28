/**
 * Rellena la plantilla oficial HU 000-061-R-06-12 (receta médica).
 * La hoja es portrait con dos ejemplares en landscape (rotar 90° CW para leer).
 * Se llena solo el ejemplar izquierdo; el derecho queda en blanco para copia/archivo.
 */
const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, degrees, rgb } = require('pdf-lib');

const TEMPLATE_NAME = 'receta-hu-000-061-R-06-12.pdf';

/** Altura de página portrait (pts). */
const PAGE_H = 612;

/** Origen landscape del ejemplar izquierdo (lx = pts desde el borde izquierdo al leer rotado). */
const LEFT_FORM_LX = 48;

/**
 * Coordenadas landscape (lectura con rotación 90° CW) → portrait del PDF.
 * @param {number} lx
 * @param {number} ly  desde el borde inferior en vista landscape
 */
function landscapeToPortrait(lx, ly) {
  return { x: PAGE_H - ly, y: lx };
}

/** @typedef {{ medicamento?: string, presentacion?: string, dosis?: string }} RecetaHuMedRow */

function resolveTemplatePath(baseDir) {
  const roots = [
    baseDir,
    baseDir && baseDir.includes('app.asar') ? baseDir.replace('app.asar', 'app.asar.unpacked') : null,
  ].filter(Boolean);
  for (const root of roots) {
    const p = path.join(root, 'templates', TEMPLATE_NAME);
    try {
      if (fs.statSync(p).isFile()) return p;
    } catch (_e) {
      /* ignored */
    }
  }
  throw new Error('No se encontró la plantilla PDF de receta HU.');
}

/**
 * pdf-lib StandardFonts (WinAnsi) no admiten controles ni saltos en drawText.
 * @param {string} text
 */
function pdfSafeLine(text) {
  return String(text || '')
    // eslint-disable-next-line no-control-regex -- strip C0 controls before PDF embedding
    .replace(/[\r\n\f\v\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitToFieldLines(text, maxLines) {
  const raw = String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const lines = [];
  for (const line of raw) {
    if (lines.length >= maxLines) {
      const last = lines.length - 1;
      lines[last] = (lines[last] + ' ' + line).trim();
      continue;
    }
    lines.push(line);
  }
  while (lines.length < maxLines) lines.push('');
  return lines.slice(0, maxLines);
}

/**
 * @param {RecetaHuMedRow[]} meds
 */
function formatMedicationsBlock(meds) {
  const rows = Array.isArray(meds) ? meds : [];
  const lines = rows
    .map(function (row) {
      const m = String(row && row.medicamento ? row.medicamento : '').trim();
      const p = String(row && row.presentacion ? row.presentacion : '').trim();
      const d = String(row && row.dosis ? row.dosis : '').trim();
      if (!m && !p && !d) return '';
      return [m, p, d].filter(Boolean).join('  ·  ');
    })
    .filter(Boolean);
  return lines.join('\n');
}

/**
 * @param {string[]} labs
 */
function formatLabList(labs) {
  return (Array.isArray(labs) ? labs : [])
    .map(function (x) {
      return String(x || '').trim();
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * @param {import('pdf-lib').PDFPage} page
 * @param {import('pdf-lib').PDFFont} font
 * @param {string} text
 * @param {number} lx
 * @param {number} ly
 * @param {number} size
 * @param {number} [maxWidth]
 */
function drawLandscapeLine(page, font, text, lx, ly, size, maxWidth) {
  let line = pdfSafeLine(text);
  if (!line) return;
  if (maxWidth && maxWidth > 0) {
    while (line.length > 1 && font.widthOfTextAtSize(line, size) > maxWidth) {
      line = line.slice(0, -1);
    }
    if (font.widthOfTextAtSize(line, size) > maxWidth && line.length > 1) {
      line = line.slice(0, -1) + '…';
    }
  }
  const p = landscapeToPortrait(lx, ly);
  page.drawText(line, {
    x: p.x,
    y: p.y,
    size: size,
    font: font,
    rotate: degrees(90),
    color: rgb(0, 0, 0),
  });
}

/**
 * @param {import('pdf-lib').PDFPage} page
 * @param {import('pdf-lib').PDFFont} font
 * @param {string} block
 * @param {{ lx: number, lyTop: number, lineH: number, maxLines: number, size: number, maxWidth: number }} box
 */
function drawLandscapeBlock(page, font, block, box) {
  const lines = String(block || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, box.maxLines);
  for (let i = 0; i < lines.length; i++) {
    drawLandscapeLine(
      page,
      font,
      lines[i],
      box.lx,
      box.lyTop - i * box.lineH,
      box.size,
      box.maxWidth
    );
  }
}

/** Layout del ejemplar izquierdo (vista landscape). */
const FRONT = {
  nombre: { lx: 95, ly: 468, size: 9, maxWidth: 260 },
  registro: { lx: 95, ly: 428, size: 8, maxWidth: 70 },
  servicio: { lx: 175, ly: 428, size: 8, maxWidth: 100 },
  fecha: { lx: 290, ly: 428, size: 8, maxWidth: 70 },
  meds: { lx: LEFT_FORM_LX + 22, lyTop: 395, lineH: 11, maxLines: 14, size: 8, maxWidth: 300 },
  labs: { lx: LEFT_FORM_LX + 22, lyTop: 185, lineH: 10, maxLines: 4, size: 8, maxWidth: 300 },
  doctor: { lx: 100, ly: 115, size: 9, maxWidth: 170 },
  cedula: { lx: 140, ly: 78, size: 9, maxWidth: 160 },
};

/** Reverso: cuidados + próxima cita (ejemplar izquierdo). */
const BACK = {
  cuidados: { lx: LEFT_FORM_LX + 22, lyTop: 520, lineH: 18.5, maxLines: 16, size: 8, maxWidth: 300 },
  proximaCita: { lx: 70, ly: 78, size: 8, maxWidth: 190 },
  proximaCitaFecha: { lx: 280, ly: 78, size: 8, maxWidth: 90 },
};

/**
 * @param {{
 *   patient: { nombre?: string, registro?: string, servicio?: string },
 *   fecha?: string,
 *   meds?: RecetaHuMedRow[],
 *   labs?: string[],
 *   cuidados?: string,
 *   proximaCita?: string,
 *   proximaCitaFecha?: string,
 *   doctorName?: string,
 *   cedulaProfesional?: string,
 * }} payload
 * @param {string} baseDir
 */
async function fillRecetaHuPdf(payload, baseDir) {
  const templatePath = resolveTemplatePath(baseDir || __dirname);
  const pdf = await PDFDocument.load(fs.readFileSync(templatePath));
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();
  const page1 = pages[0];
  const page2 = pages[1];
  if (!page1 || !page2) {
    throw new Error('La plantilla de receta HU debe tener 2 páginas.');
  }

  const patient = (payload && payload.patient) || {};

  drawLandscapeLine(page1, font, patient.nombre, FRONT.nombre.lx, FRONT.nombre.ly, FRONT.nombre.size, FRONT.nombre.maxWidth);
  drawLandscapeLine(page1, font, patient.registro, FRONT.registro.lx, FRONT.registro.ly, FRONT.registro.size, FRONT.registro.maxWidth);
  drawLandscapeLine(page1, font, patient.servicio, FRONT.servicio.lx, FRONT.servicio.ly, FRONT.servicio.size, FRONT.servicio.maxWidth);
  drawLandscapeLine(page1, font, payload.fecha, FRONT.fecha.lx, FRONT.fecha.ly, FRONT.fecha.size, FRONT.fecha.maxWidth);
  drawLandscapeBlock(page1, font, formatMedicationsBlock(payload.meds), FRONT.meds);
  drawLandscapeBlock(page1, font, formatLabList(payload.labs), FRONT.labs);
  drawLandscapeLine(page1, font, payload.doctorName, FRONT.doctor.lx, FRONT.doctor.ly, FRONT.doctor.size, FRONT.doctor.maxWidth);
  drawLandscapeLine(page1, font, payload.cedulaProfesional, FRONT.cedula.lx, FRONT.cedula.ly, FRONT.cedula.size, FRONT.cedula.maxWidth);

  const cuidadosLines = splitToFieldLines(payload.cuidados, BACK.cuidados.maxLines);
  drawLandscapeBlock(page2, font, cuidadosLines.filter(Boolean).join('\n'), BACK.cuidados);
  drawLandscapeBlock(page2, font, payload.proximaCita, {
    lx: BACK.proximaCita.lx,
    lyTop: BACK.proximaCita.ly,
    lineH: 10,
    maxLines: 3,
    size: BACK.proximaCita.size,
    maxWidth: BACK.proximaCita.maxWidth,
  });
  drawLandscapeBlock(page2, font, payload.proximaCitaFecha, {
    lx: BACK.proximaCitaFecha.lx,
    lyTop: BACK.proximaCitaFecha.ly,
    lineH: 10,
    maxLines: 3,
    size: BACK.proximaCitaFecha.size,
    maxWidth: BACK.proximaCitaFecha.maxWidth,
  });

  // Sin flatten/firma digital: firma a mano en impresión. Ejemplar derecho vacío a propósito.
  return Buffer.from(await pdf.save());
}

module.exports = {
  fillRecetaHuPdf,
  formatMedicationsBlock,
  formatLabList,
  splitToFieldLines,
  landscapeToPortrait,
  pdfSafeLine,
};
