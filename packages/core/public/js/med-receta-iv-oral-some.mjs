/**
 * Presentaciones orales SOME para receta de alta (IV → VO).
 * Elige tableta/cápsula que divida la dosis; no inventa fracciones.
 */

const ORAL_SOLIDS = {
  PARACETAMOL: [
    { mg: 500, form: 'TABLETA', preferred: true },
    { mg: 750, form: 'TABLETA' },
    { mg: 650, form: 'TABLETA' },
    { mg: 160, form: 'TABLETA' },
  ],
  ACETAMINOFEN: [{ mg: 500, form: 'TABLETA', preferred: true }],
  KETOROLACO: [{ mg: 10, form: 'TABLETA' }],
  OMEPRAZOL: [{ mg: 20, form: 'CÁPSULA' }],
  PANTOPRAZOL: [{ mg: 40, form: 'TABLETA' }],
  ESOMEPRAZOL: [{ mg: 40, form: 'TABLETA' }],
  ONDANSETRON: [{ mg: 8, form: 'TABLETA' }],
  METOCLOPRAMIDA: [{ mg: 10, form: 'TABLETA' }],
  BUTILHIOSCINA: [{ mg: 10, form: 'TABLETA' }],
  METRONIDAZOL: [{ mg: 400, form: 'CÁPSULA' }],
  CIPROFLOXACINO: [{ mg: 500, form: 'TABLETA', preferred: true }, { mg: 1000, form: 'TABLETA' }],
  LEVOFLOXACINO: [{ mg: 500, form: 'TABLETA' }, { mg: 750, form: 'TABLETA' }],
  MOXIFLOXACINO: [{ mg: 400, form: 'TABLETA' }],
  LINEZOLID: [{ mg: 600, form: 'TABLETA' }],
  CLARITROMICINA: [{ mg: 500, form: 'TABLETA' }],
  CLINDAMICINA: [{ mg: 300, form: 'CÁPSULA' }],
  DOXICICLINA: [{ mg: 100, form: 'CÁPSULA' }],
  FLUCONAZOL: [{ mg: 100, form: 'CÁPSULA' }],
  ACICLOVIR: [{ mg: 200, form: 'TABLETA' }],
  DEXAMETASONA: [{ mg: 4, form: 'TABLETA' }, { mg: 0.5, form: 'TABLETA' }],
  PREDNISONA: [{ mg: 5, form: 'TABLETA' }, { mg: 20, form: 'TABLETA' }, { mg: 50, form: 'TABLETA' }],
  FUROSEMIDA: [{ mg: 40, form: 'TABLETA' }, { mg: 20, form: 'TABLETA' }],
  LEVETIRACETAM: [{ mg: 500, form: 'TABLETA' }, { mg: 1000, form: 'TABLETA' }],
  TRAMADOL: [{ mg: 50, form: 'CÁPSULA' }, { mg: 100, form: 'CÁPSULA' }],
  IBUPROFENO: [{ mg: 400, form: 'TABLETA' }, { mg: 600, form: 'TABLETA' }, { mg: 800, form: 'TABLETA' }],
  DICLOFENACO: [{ mg: 50, form: 'TABLETA' }, { mg: 100, form: 'TABLETA' }],
  HALOPERIDOL: [{ mg: 5, form: 'TABLETA' }, { mg: 10, form: 'TABLETA' }],
  FENITOINA: [{ mg: 100, form: 'CÁPSULA' }],
  ACIDOVALPROICO: [{ mg: 250, form: 'CÁPSULA' }],
};

const STEM_ALIAS = {
  ACETAMINOFEN: 'PARACETAMOL',
  DIPIRONA: 'METAMIZOL',
  KETOROLAC: 'KETOROLACO',
  VALPROATO: 'ACIDOVALPROICO',
};

function catalogKeyFromNombre(nNorm) {
  const n = String(nNorm || '');
  const keys = Object.keys(ORAL_SOLIDS);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (key === 'ACIDOVALPROICO') {
      if (/\b(ACIDO\s+VALPROICO|VALPROATO)\b/.test(n)) return key;
      continue;
    }
    if (new RegExp('\\b' + key + '\\b').test(n)) return STEM_ALIAS[key] || key;
  }
  if (/\bKETOROLAC/.test(n)) return 'KETOROLACO';
  if (/\bVALPROATO\b/.test(n)) return 'ACIDOVALPROICO';
  return '';
}

/**
 * @param {number} doseMg
 * @param {{ mg: number, form: string, preferred?: boolean }[]} strengths
 * @returns {{ unitMg: number, units: number, form: string } | null}
 */
export function pickOralPackFromStrengths(doseMg, strengths) {
  const list = Array.isArray(strengths) ? strengths : [];
  let best = null;
  let bestScore = 1e9;
  for (let i = 0; i < list.length; i += 1) {
    const s = list[i];
    if (!s || !(s.mg > 0)) continue;
    const units = doseMg / s.mg;
    if (units < 1 || units > 4 || Math.abs(units - Math.round(units)) > 1e-6) continue;
    const u = Math.round(units);
    const score = (s.preferred ? 0 : 1) + u;
    if (score < bestScore) {
      bestScore = score;
      best = { unitMg: s.mg, units: u, form: s.form };
    }
  }
  return best;
}

/**
 * @param {string} nNorm nombre ya normalizado
 * @param {number} doseMg dosis terapéutica oral en mg
 * @returns {{ unitMg: number, units: number, form: string } | null}
 */
export function pickSomeOralPack(nNorm, doseMg) {
  const key = catalogKeyFromNombre(nNorm);
  if (!key || !ORAL_SOLIDS[key]) return null;
  return pickOralPackFromStrengths(doseMg, ORAL_SOLIDS[key]);
}

export function pluralizeOralForm(form, units) {
  const f = String(form || 'TABLETA');
  if (units === 1) return f;
  if (f === 'CÁPSULA') return 'CÁPSULAS';
  if (f.endsWith('S')) return f;
  return f + 'S';
}
