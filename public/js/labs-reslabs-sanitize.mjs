/**
 * resLabs may only hold clinical panel chunks (BH/QS/…/cultivo).
 * Unknown blobs (letterhead, collapsed Impresion.aspx, demographics) are dropped —
 * not by sniffing chrome tokens, but by keeping only recognized section leads.
 *
 * Avoid importing cultivo-block-core here (it pulls labs.js → circular with procesarLabs).
 */

var LAB_SECTION_LEAD_RE =
  /^(BH|QS|ESC|PFHs?|GASES|COAG|ORINA|EGO|CUANTORINA|PltCit|LIPASA|CULTIVO|LCR|TROP|GS|SEROL|FROTIS|HECES|PIE|INTERPRETACI[OÓ]N|LIQ|ASCITIS|TIR|ENDO|CARD|FE|INFL|INM|META|NEF|NIVEL|TM|NUT|GI|TOX|HEPB|VIRAL|MICRO)\b/i;

var CULTIVO_START_RE =
  /^(CULTIVO|BACTERIOLOGIA|UROCULTIVO|HEMOCULTIVO|FUNGICULTIVO|TINCION\s+DE\s+GRAM|CATETER|ATB|Cuenta:|Cultivos|BACILOSCOPIA)\b/i;

/** Mirrors labs-cultivo-atb isParsedCultivoHeaderLine (no import — circular with procesarLabs). */
var PARSED_CULTIVO_HEADER_RE =
  /^(SECRECION|LIQUIDO|ASPIRADO|ABSCESO|BRONCOALVEOLAR)\b/i;
var PARSED_CULTIVO_DATED_RE =
  /^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ()\s/.-]*\s+\d{1,2}\/\d{1,2}(?:\/\d{2,4})?:\s+\S/i;

function firstLine(text) {
  return (
    String(text || '')
      .trim()
      .split(/\r?\n/, 1)[0] || ''
  );
}

function isCultivoStartLineLocal(first) {
  var t = String(first || '').trim();
  if (!t) return false;
  if (CULTIVO_START_RE.test(t)) return true;
  if (/^CULTIVO\s+DE\s+MICOBACTERIAS\b/i.test(t)) return true;
  if (PARSED_CULTIVO_HEADER_RE.test(t)) return true;
  if (PARSED_CULTIVO_DATED_RE.test(t)) return true;
  if (/^[•\u2022\u00B7]\s*/.test(t)) return true;
  return false;
}

/** First line is a clinical resLabs panel header. */
export function looksLikeLabSectionChunk(text) {
  var first = firstLine(text);
  return !!first && LAB_SECTION_LEAD_RE.test(first);
}

/** Chunk is allowed in resLabs (panel or cultivo block / continuation). */
export function isAllowedResLabChunk(text, inCultivo) {
  var t = String(text == null ? '' : text).trim();
  if (!t) return false;
  var first = firstLine(t);
  if (looksLikeLabSectionChunk(t)) return true;
  if (isCultivoStartLineLocal(first)) return true;
  if (inCultivo) return true;
  return false;
}

/**
 * Cut demographic / letterhead tail accidentally pasted after a valid panel line.
 * @param {string} text
 */
export function stripTrailingSomeReportChrome(text) {
  var t = String(text == null ? '' : text);
  if (!t) return '';
  t = t.replace(
    /\s*(?:Sistema\s+SOME|UNIVERSIDAD\s+AUT[OÓ]NOMA|MOP-HU-\d+|REPORTE\s+DE\s+RESULTADOS)[\s\S]*$/i,
    ''
  );
  t = t.replace(/\s*(?:Expediente|Solicitud)\s*:[\s\S]*$/i, '');
  return t.trim();
}

/**
 * Keep only clinical chunks; drop everything else.
 * @param {unknown[]} rows
 * @returns {string[]}
 */
export function sanitizeResLabsChunks(rows) {
  var out = [];
  var inCultivo = false;
  (rows || []).forEach(function (row) {
    var s = String(row == null ? '' : row);
    if (!s.trim()) return;
    var first = firstLine(s);

    if (looksLikeLabSectionChunk(s)) {
      var cleaned = stripTrailingSomeReportChrome(s);
      if (cleaned && looksLikeLabSectionChunk(cleaned)) out.push(cleaned);
      // CULTIVO panel lead keeps subsequent ATB/Cuenta rows; other panels end cultivo mode.
      inCultivo = /^CULTIVO\b/i.test(firstLine(cleaned || s));
      return;
    }

    if (isCultivoStartLineLocal(first)) {
      inCultivo = true;
      out.push(s.trim());
      return;
    }

    if (inCultivo) {
      out.push(s);
      return;
    }
  });
  return out;
}

/** True when text is not a standalone allowed clinical chunk (legacy helper). */
export function isSomeReportMetadataChunk(text) {
  var t = String(text == null ? '' : text);
  if (!t.trim()) return false;
  return !isAllowedResLabChunk(t, false);
}
