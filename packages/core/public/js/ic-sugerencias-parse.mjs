/**
 * Interconsulta "SUGERENCIAS POR <SERVICIO>" text → indicaciones fields.
 * Pure. Known headings fill the fixed boxes; other headings become «Otros»
 * sections with their own title, so no line of the paste is lost.
 */

var FIELD_HEADINGS = [
  [/^DIETAS?$/, 'dieta'],
  [/^CUIDADOS( GENERALES)?$/, 'cuidados'],
  [/^(LABORATORIOS?|ESTUDIOS( DE LABORATORIO)?)$/, 'estudios'],
  [/^(MEDICAMENTOS|MEDICACION|TRATAMIENTO)$/, 'medicamentos'],
  [/^INTERCONSULTAS?$/, 'interconsultas'],
];
var OTHER_HEADING_RE =
  /^(PLAN DE LIQUIDOS|LIQUIDOS|SOLUCIONES|IMAGEN|IMAGENOLOGIA|GABINETE|RECOMENDACIONES|PENDIENTES)$/;
var TITLE_RE = /^(SUGERENCIAS|INDICACIONES) (POR|DE) \S/;
var DATE_RE = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
var ITEM_RE = /^\d{1,2}\s*[.)-]\s*/;

function norm(line) {
  return String(line || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*:\s*$/, '')
    .trim();
}

function headingOf(line) {
  var n = norm(line);
  for (var i = 0; i < FIELD_HEADINGS.length; i += 1) {
    if (FIELD_HEADINGS[i][0].test(n)) return { field: FIELD_HEADINGS[i][1] };
  }
  if (OTHER_HEADING_RE.test(n)) {
    return { titulo: String(line).trim().replace(/\s*:\s*$/, '').toUpperCase() };
  }
  return null;
}

/**
 * @param {string} text
 * @returns {{
 *   descripcion: string,
 *   fecha: string,
 *   fields: Record<string, string>,
 *   otros: { titulo: string, contenido: string }[],
 *   sectionCount: number,
 * }}
 */
export function parseIcSugerencias(text) {
  var out = { descripcion: '', fecha: '', fields: {}, otros: [], sectionCount: 0 };
  var current = null;
  var stray = [];
  String(text || '')
    .split(/\r?\n/)
    .map(function (l) {
      return l.trim();
    })
    .filter(Boolean)
    .forEach(function (line) {
      var n = norm(line);
      if (!out.sectionCount && !out.descripcion && TITLE_RE.test(n)) {
        out.descripcion = line.toUpperCase();
        return;
      }
      if (!out.fecha && DATE_RE.test(line)) {
        out.fecha = line;
        return;
      }
      var h = headingOf(line);
      if (h) {
        out.sectionCount += 1;
        current = h.field ? { field: h.field, lines: [] } : { titulo: h.titulo, lines: [] };
        if (current.field) {
          if (out.fields[current.field]) current.lines = out.fields[current.field].split('\n');
        } else {
          out.otros.push(current);
        }
        return;
      }
      var item = line.replace(ITEM_RE, '');
      if (!current) {
        stray.push(item);
        return;
      }
      current.lines.push(item);
      if (current.field) out.fields[current.field] = current.lines.join('\n');
    });
  out.otros = out.otros.map(function (o) {
    return { titulo: o.titulo, contenido: o.lines.join('\n') };
  });
  if (stray.length) out.otros.unshift({ titulo: 'NOTAS', contenido: stray.join('\n') });
  return out;
}

var INDICA_FIELDS = ['dieta', 'cuidados', 'estudios', 'medicamentos', 'interconsultas'];

/** @param {object} ind */
export function indicaDocHasContent(ind) {
  if (!ind) return false;
  return (
    INDICA_FIELDS.some(function (k) {
      return String(ind[k] || '').trim();
    }) ||
    (ind.otros || []).some(function (o) {
      return String((o && o.contenido) || '').trim();
    })
  );
}

function appendText(current, addition) {
  if (!addition) return current || '';
  if (!String(current || '').trim()) return addition;
  return String(current).replace(/\s+$/, '') + '\n' + addition;
}

/**
 * Write a parsed paste into an indicaciones doc, in place.
 * 'replace' clears every section first; 'append' adds under what is there
 * (an «Otros» section with the same title gets the lines added to it).
 * @param {object} ind
 * @param {ReturnType<typeof parseIcSugerencias>} parsed
 * @param {'replace'|'append'} mode
 */
export function applyIcSugerenciasToIndica(ind, parsed, mode) {
  INDICA_FIELDS.forEach(function (k) {
    var add = parsed.fields[k] || '';
    ind[k] = mode === 'replace' ? add : appendText(ind[k], add);
  });
  if (mode === 'replace') {
    ind.otros = parsed.otros.map(function (o) {
      return { titulo: o.titulo, contenido: o.contenido };
    });
  } else {
    ind.otros = Array.isArray(ind.otros) ? ind.otros : [];
    parsed.otros.forEach(function (o) {
      var same = ind.otros.find(function (x) {
        return x && String(x.titulo || '').trim().toUpperCase() === o.titulo;
      });
      if (same) same.contenido = appendText(same.contenido, o.contenido);
      else ind.otros.push({ titulo: o.titulo, contenido: o.contenido });
    });
  }
  if (parsed.descripcion || mode === 'replace') ind.descripcion = parsed.descripcion;
  if (parsed.fecha) ind.fecha = parsed.fecha;
  return ind;
}

/**
 * True for an IC suggestions paste: the «SUGERENCIAS POR …» title plus one
 * known heading, or three known headings without the title.
 * @param {string} text
 */
export function looksLikeIcSugerenciasPaste(text) {
  var p = parseIcSugerencias(text);
  return p.descripcion ? p.sectionCount >= 1 : p.sectionCount >= 3;
}
