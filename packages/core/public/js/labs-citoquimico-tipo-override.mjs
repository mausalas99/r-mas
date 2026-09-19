/**
 * localStorage-backed overrides for the citoquímico "Tipo" (fluid name), keyed by
 * a fingerprint of the block's OTHER fields (everything but Tipo). Same
 * load/save/cache shape as labs-panel-overlay-store.mjs. Keying off the other
 * fields — not array index or raw text — means the override still applies
 * after "Reprocesar" re-parses the block from the saved raw SOME text.
 */

var LS_KEY = 'rpc-cito-tipo-override';
var memory = null; // null = not loaded; object map fingerprint -> fluid name

/** Etiquetas de campo (buildCitoquimicoParts_) que delimitan dónde termina "Tipo …". */
var CITO_LINE_FIELD_LABELS_ = [
  'Dens', 'pH', 'Glu', 'Prot', 'Alb', 'TGL', 'Amil', 'LDH', 'Asp', 'Rec', 'Leu', 'PMN', 'Linf', 'Eri', 'Gram', 'GASA', 'Obs',
];
var TIPO_STRIP_RE_ = new RegExp(
  '\\bTipo\\b[\\s\\S]*?(?=\\s+\\b(?:' + CITO_LINE_FIELD_LABELS_.join('|') + ')\\b|$)'
);
var TIPO_VALUE_RE_ = new RegExp(
  '\\bTipo\\b\\s+([\\s\\S]*?)(?=\\s+\\b(?:' + CITO_LINE_FIELD_LABELS_.join('|') + ')\\b|$)'
);

/**
 * Huella estable del bloque "Liq:" a partir de la línea ya renderizada, quitando
 * el segmento "Tipo …" (así el fingerprint no depende del valor que corrige).
 */
export function citoquimicoTipoFingerprintFromLine_(line) {
  var body = String(line || '').replace(/^Liq:\t/, '');
  return body.replace(TIPO_STRIP_RE_, '').replace(/\s+/g, ' ').trim();
}

/** Valor "Tipo" actual dentro de una línea "Liq:\t…" (para precargar el prompt de edición). */
export function citoquimicoTipoValueFromLine_(line) {
  var m = TIPO_VALUE_RE_.exec(String(line || ''));
  return m ? m[1].trim() : '';
}

function loadOverrides_() {
  if (memory !== null) return memory;
  memory = Object.create(null);
  try {
    if (typeof localStorage !== 'undefined') {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') memory = parsed;
      }
    }
  } catch { /* ignore */ }
  return memory;
}

function saveOverrides_(map) {
  memory = map;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LS_KEY, JSON.stringify(memory));
    }
  } catch (e) { console.warn('[labs-citoquimico-tipo-override] failed to write ' + LS_KEY, e); }
}

export function getCitoquimicoTipoOverride(fingerprint) {
  if (!fingerprint) return '';
  return loadOverrides_()[fingerprint] || '';
}

export function setCitoquimicoTipoOverride(fingerprint, fluidName) {
  if (!fingerprint) return;
  var next = Object.assign({}, loadOverrides_());
  var name = String(fluidName || '').trim().toUpperCase();
  if (name) next[fingerprint] = name;
  else delete next[fingerprint];
  saveOverrides_(next);
}

export function clearCitoquimicoTipoOverrideForTests() { memory = null; }
