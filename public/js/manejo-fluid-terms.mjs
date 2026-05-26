/** Terminología institucional para fluidos IV en pedidos SOME. */

export const NACL_09 = 'NaCl 0.9%';
export const NACL_09_FULL = 'SOLUCIÓN DE NaCl 0.9%';
export const DEXTROSE_5 = 'GLUCOSADO 5%';
export const DEXTROSE_5_FULL = 'SOLUCIÓN DE GLUCOSADO 5%';

/** Normaliza abreviaturas hospitalarias → NaCl 0.9% / glucosado. */
export function normalizeFluidTerms(text) {
  var s = String(text || '');
  s = s.replace(/\bSS\s*0\.?9\s*%/gi, NACL_09);
  s = s.replace(/\bSOL(?:UCIÓN|UCION)\s+SALINA\s+0\.?9\s*%/gi, NACL_09);
  s = s.replace(/\bSOL(?:UCIÓN|UCION)\s+FISIOL(?:ÓGICA|OGICA)?/gi, NACL_09);
  s = s.replace(/\bFISIOL(?:ÓGICO|OGICO)\b/gi, NACL_09);
  s = s.replace(/\bSOL(?:UCIÓN|UCION)\s+FISIOL(?:ÓGICA|OGICA)?/gi, NACL_09);
  s = s.replace(/\bNACL\s+AL\s+0\.?9\s*%/gi, NACL_09);
  s = s.replace(/\bGLUCOSADO\s+AL\s+5\s*%/gi, 'GLUCOSADO 5%');
  return s.trim();
}
