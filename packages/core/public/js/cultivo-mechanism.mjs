/**
 * Pista de mecanismo (BLEE / AmpC) para un aislamiento de Enterobacterales. Solo datos + lógica pura, sin UI.
 *
 * Fuente: EUCAST guidelines for detection of resistance mechanisms and specific resistances of
 * clinical and/or epidemiological importance, v2.0, julio 2017 (gratis). Nada de CLSI.
 *  - §3.4, tabla 1 y figura 1 (p. 13-14): cribado de BLEE = I/R a cefotaxima, ceftriaxona o ceftazidima (cefpodoxima solo R).
 *  - §3.4.3 (p. 17) y §4.4 (p. 22): cefoxitina R sugiere AmpC, que puede esconder la BLEE.
 * Es cribado, no diagnóstico: la BLEE se confirma con sinergia con ácido clavulánico.
 * No cubre carbapenemasas: el cribado de EUCAST pide CMI de meropenem (>0.125), no solo S/I/R.
 */
import { classifyAtbInterp } from './labs-cultivo-atb.mjs';

export const MECHANISM_SOURCE = 'EUCAST, detección de mecanismos de resistencia, v2.0, julio 2017';

const norm = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase();

// Grupo 2 = AmpC cromosómica inducible (EUCAST figura 1). K. aerogenes va aquí, no con Klebsiella.
const GRUPO2_RE = /ENTEROBACTER|CITROBACTER FREUNDII|C\. FREUNDII|MORGANELLA|PROVIDENCIA|SERRATIA|HAFNIA|KLEBSIELLA AEROGENES/;
const GRUPO1_RE = /ESCHERICHIA|E\. ?COLI|KLEBSIELLA|K\. ?(PNEUMONIAE|OXYTOCA|VARIICOLA)|RAOULTELLA|PROTEUS MIRABILIS|P\. ?MIRABILIS|SALMONELLA|SHIGELLA/;
const BLEE_RE = /\b(BLEE|ESBL)\b/;
const INDICADORES_RE = /CEFOTAXIMA|CEFTRIAXONA|CEFTAZIDIMA/;
const CEFPODOXIMA_RE = /CEFPODOXIMA/;
const CEFOXITINA_RE = /CEFOXITINA/;

/** → null | { id, titulo, texto, evidencia: [{ row, k, nota }], fuente } */
export function mechanismHintFor(organismo, sensRows) {
  const org = norm(organismo);
  if (!sensRows || !sensRows.length || BLEE_RE.test(org)) return null;
  const g2 = GRUPO2_RE.test(org);
  if (!g2 && !GRUPO1_RE.test(org)) return null;

  const ev = [];
  let cefoxR = false;
  for (const row of sensRows) {
    const m = norm(row.med);
    const k = classifyAtbInterp(row.interp);
    if (INDICADORES_RE.test(m) && k !== 's') ev.push({ row, k, nota: 'Activa el cribado de BLEE (§3.4).' });
    else if (CEFPODOXIMA_RE.test(m) && k === 'r') ev.push({ row, k, nota: 'Activa el cribado de BLEE (§3.4).' });
    else if (CEFOXITINA_RE.test(m)) {
      cefoxR = k !== 's';
      ev.push({
        row,
        k,
        nota: cefoxR ? 'Sugiere AmpC, que puede esconder la BLEE (§3.4.3, §4.4).' : 'No sugiere AmpC adquirida (§4.4). Cefoxitina R sí la sugeriría.',
      });
    }
  }
  const evidencia = ev;
  if (!ev.some((e) => e.nota.startsWith('Activa'))) return null;

  if (g2) {
    return {
      id: 'esbl-cribado-g2',
      titulo: 'Cribado de BLEE positivo',
      texto: 'Esta especie tiene AmpC propia, que también da cefalosporina R. Confirmar con cefepima ± ácido clavulánico (§3.4.1 B).',
      evidencia,
      fuente: MECHANISM_SOURCE,
    };
  }
  if (cefoxR) {
    return {
      id: 'esbl-ampc',
      titulo: 'Cribado de BLEE positivo y cefoxitina R',
      texto: 'AmpC puede esconder la BLEE. Confirmar con cefepima ± ácido clavulánico y con cloxacilina (§3.4.3, §4.4).',
      evidencia,
      fuente: MECHANISM_SOURCE,
    };
  }
  return {
    id: 'esbl-cribado',
    titulo: 'Cribado de BLEE positivo',
    texto: 'Falta la confirmación con sinergia con ácido clavulánico. Hasta entonces no es BLEE confirmada.',
    evidencia,
    fuente: MECHANISM_SOURCE,
  };
}
