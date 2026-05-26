/** Terminología institucional para fluidos IV en pedidos SOME. */

export const NACL_09 = 'NaCl 0.9%';
export const NACL_09_FULL = 'SOLUCIÓN DE NaCl 0.9%';
export const NACL_045 = 'NaCl 0.45%';
export const NACL_045_FULL = 'SOLUCIÓN DE NaCl 0.45%';
export const DEXTROSE_5 = 'GLUCOSADO 5%';
export const DEXTROSE_5_FULL = 'SOLUCIÓN DE GLUCOSADO 5%';
export const DEXTROSE_50 = 'DEXTROSA 50%';
export const DEXTROSE_50_FULL = 'SOLUCIÓN DE DEXTROSA 50%';
/** Gramos de dextrosa por litro para glucosado al 5% (p/v). */
export const DEXTROSE_5_GRAMS_PER_LITER = 50;
export const DEXTROSE_5_IN_NACL_045 = 'GLUCOSADO 5% EN NaCl 0.45%';
export const DEXTROSE_5_IN_NACL_045_FULL = 'SOLUCIÓN DE GLUCOSADO 5% EN NaCl 0.45%';
export const DEXTROSE_5_IN_NACL_09 = 'GLUCOSADO 5% EN NaCl 0.9%';
export const DEXTROSE_5_IN_NACL_09_FULL = 'SOLUCIÓN DE GLUCOSADO 5% EN NaCl 0.9%';

/** Normaliza abreviaturas hospitalarias → NaCl 0.9% / glucosado. */
export function normalizeFluidTerms(text) {
  var s = String(text || '');
  s = s.replace(/\bSS\s*0\.?9\s*%/gi, NACL_09);
  s = s.replace(/\bSOL(?:UCIÓN|UCION)\s+SALINA\s+0\.?9\s*%/gi, NACL_09);
  s = s.replace(/\bSOL(?:UCIÓN|UCION)\s+FISIOL(?:ÓGICA|OGICA)?/gi, NACL_09);
  s = s.replace(/\bFISIOL(?:ÓGICO|OGICO)\b/gi, NACL_09);
  s = s.replace(/\bSOL(?:UCIÓN|UCION)\s+FISIOL(?:ÓGICA|OGICA)?/gi, NACL_09);
  s = s.replace(/\bNACL\s+AL\s+0\.?9\s*%/gi, NACL_09);
  s = s.replace(/\bNACL\s+AL\s+0\.?45\s*%/gi, NACL_045);
  s = s.replace(/\bSS\s+0\.?45\s*%/gi, NACL_045);
  s = s.replace(/\bGLUCOSADO\s+AL\s+5\s*%/gi, 'GLUCOSADO 5%');
  return s.trim();
}
