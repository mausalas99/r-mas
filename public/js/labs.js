// labs.js — Lab data parsing and extraction
// Pure functions with no DOM dependencies

// Parse cache to avoid re-parsing same lab text
const parseCache = new Map();

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

export function clearParseCache() {
  parseCache.clear();
}

/**
 * Extract a lab value from text by searching for parameter names
 * @param {Array<string>} nombres - Array of parameter name variations to search for
 * @param {string} bloque - Text block to search in
 * @returns {string} Extracted value or '---' if not found
 */
export function extraer(nombres, bloque) {
  if (!bloque) return '---';
  const lineas = bloque.split(/\r?\n/).map(l => l.trim());
  for (const nombre of nombres) {
    for (let i = 0; i < lineas.length; i++) {
      if (lineas[i].toLowerCase().includes(nombre.toLowerCase())) {
        if (i + 1 < lineas.length) {
          const siguiente = lineas[i + 1];
          if (!/^[a-zA-Z]/.test(siguiente)) return siguiente;
        }
      }
    }
  }
  return '---';
}

/**
 * Extract a lab value with reference range from text
 * @param {Array<string>} nombres - Array of parameter name variations to search for
 * @param {string} texto - Text block to search in
 * @returns {Object} Object with valor (value), min, and max properties
 */
export function extraerConRango(nombres, texto) {
  if (!texto) return { valor: '---', min: '', max: '' };
  const lineas = texto.split(/\r?\n/).map(l => l.trim());
  for (const nombre of nombres) {
    for (let i = 0; i < lineas.length; i++) {
      if (lineas[i].toLowerCase().includes(nombre.toLowerCase())) {
        if (i + 1 < lineas.length) {
          const siguiente = lineas[i + 1];
          if (!/^[a-zA-Z]/.test(siguiente)) {
            const match = siguiente.match(/^([\d.]+)\s*\(?([\d.]+)?\s*-\s*([\d.]+)?\)?/);
            if (match) {
              return { valor: match[1], min: match[2] || '', max: match[3] || '' };
            }
            return { valor: siguiente, min: '', max: '' };
          }
        }
      }
    }
  }
  return { valor: '---', min: '', max: '' };
}

/**
 * Mark a lab value with CSS class based on reference range
 * @param {string} valorStr - Lab value as string
 * @param {string} min - Minimum reference value
 * @param {string} max - Maximum reference value
 * @returns {string} HTML string with class applied if out of range
 */
export function marcarSegunRango(valorStr, min, max) {
  if (!valorStr || valorStr === '---' || !min || !max) return valorStr;
  const val = parseFloat(valorStr);
  const minNum = parseFloat(min);
  const maxNum = parseFloat(max);
  if (isNaN(val) || isNaN(minNum) || isNaN(maxNum)) return valorStr;
  if (val < minNum) return `<span class="lab-value-altered">${valorStr}</span>`;
  if (val > maxNum) return `<span class="lab-value-altered">${valorStr}</span>`;
  return `<span class="lab-value-normal">${valorStr}</span>`;
}

function fmt(val) {
  if (!val || val === '---') return '---';
  const num = parseFloat(val);
  if (isNaN(num)) return val;
  return num.toFixed(1);
}

/**
 * Parse complete blood count (Biometría Hemática) section from lab text
 * @param {string} tNorm - Normalized lab text
 * @returns {string} HTML string with formatted results or empty string if no data
 */
export function parseBH_(tNorm) {
  const HbData = extraerConRango(['Hemoglobina', 'HGB'], tNorm);
  const HtoData = extraerConRango(['Hematocrito', 'HCT'], tNorm);
  const LeucData = extraerConRango(['Leucocitos', 'WBC'], tNorm);
  const NeutData = extraerConRango(['Neutrófilos', 'Neutrofilos', 'NEU'], tNorm);
  const LinfData = extraerConRango(['Linfocitos', 'LYM'], tNorm);
  const PlaqData = extraerConRango(['Plaquetas', 'PLT'], tNorm);

  if ([HbData.valor, HtoData.valor, LeucData.valor, NeutData.valor, LinfData.valor, PlaqData.valor].every(v => v === '---')) return '';

  const Hb = marcarSegunRango(HbData.valor, HbData.min, HbData.max);
  const Hto = marcarSegunRango(HtoData.valor, HtoData.min, HtoData.max);
  const Leuc = marcarSegunRango(LeucData.valor, LeucData.min, LeucData.max);
  const Neut = marcarSegunRango(NeutData.valor, NeutData.min, NeutData.max);
  const Linf = marcarSegunRango(LinfData.valor, LinfData.min, LinfData.max);
  const Plaq = marcarSegunRango(PlaqData.valor, PlaqData.min, PlaqData.max);

  return `<div class="lab-section"><div class="lab-title">Biometría Hemática</div><div class="lab-grid"><div class="lab-item"><div class="lab-label">Hb</div><div class="lab-value">${Hb}</div></div><div class="lab-item"><div class="lab-label">Hto</div><div class="lab-value">${Hto}</div></div><div class="lab-item"><div class="lab-label">Leucocitos</div><div class="lab-value">${Leuc}</div></div><div class="lab-item"><div class="lab-label">Neutrófilos</div><div class="lab-value">${Neut}</div></div><div class="lab-item"><div class="lab-label">Linfocitos</div><div class="lab-value">${Linf}</div></div><div class="lab-item"><div class="lab-label">Plaquetas</div><div class="lab-value">${Plaq}</div></div></div></div>`;
}

/**
 * Parse blood chemistry (Química Sanguínea) section from lab text
 * @param {string} texto - Lab text to parse
 * @returns {string} HTML string with formatted results or empty string if no data
 */
export function parseQS_(texto) {
  const GluData = extraerConRango(['Glucosa', 'GLU'], texto);
  const CrData = extraerConRango(['Creatinina', 'CREA'], texto);
  const BUNData = extraerConRango(['BUN', 'Urea'], texto);
  const PCRData = extraerConRango(['Proteína C Reactiva', 'PCR', 'CRP'], texto);
  const AUData = extraerConRango(['Ácido Úrico', 'Acido Urico', 'UA'], texto);
  const TGLData = extraerConRango(['Triglicéridos', 'Trigliceridos', 'TG'], texto);
  const COLData = extraerConRango(['Colesterol', 'CHOL'], texto);

  if ([GluData.valor, CrData.valor, BUNData.valor, PCRData.valor, AUData.valor, TGLData.valor, COLData.valor].every(v => v === '---')) return '';

  const Glu = marcarSegunRango(GluData.valor, GluData.min, GluData.max);
  const Cr = marcarSegunRango(CrData.valor, CrData.min, CrData.max);
  const BUN = marcarSegunRango(BUNData.valor, BUNData.min, BUNData.max);
  const PCR = marcarSegunRango(PCRData.valor, PCRData.min, PCRData.max);
  const AU = marcarSegunRango(AUData.valor, AUData.min, AUData.max);
  const TGL = marcarSegunRango(TGLData.valor, TGLData.min, TGLData.max);
  const COL = marcarSegunRango(COLData.valor, COLData.min, COLData.max);

  return `<div class="lab-section"><div class="lab-title">Química Sanguínea</div><div class="lab-grid"><div class="lab-item"><div class="lab-label">Glucosa</div><div class="lab-value">${Glu}</div></div><div class="lab-item"><div class="lab-label">Creatinina</div><div class="lab-value">${Cr}</div></div><div class="lab-item"><div class="lab-label">BUN</div><div class="lab-value">${BUN}</div></div><div class="lab-item"><div class="lab-label">PCR</div><div class="lab-value">${PCR}</div></div><div class="lab-item"><div class="lab-label">Ác. Úrico</div><div class="lab-value">${AU}</div></div><div class="lab-item"><div class="lab-label">Triglicéridos</div><div class="lab-value">${TGL}</div></div><div class="lab-item"><div class="lab-label">Colesterol</div><div class="lab-value">${COL}</div></div></div></div>`;
}

/**
 * Parse serum electrolytes (Electrolitos Séricos) section from lab text
 * @param {string} texto - Lab text to parse
 * @returns {string} HTML string with formatted results or empty string if no data
 */
export function parseESC_(texto) {
  const NaData = extraerConRango(['Sodio', 'NA'], texto);
  const KData = extraerConRango(['Potasio', 'K'], texto);
  const ClData = extraerConRango(['Cloro', 'CL'], texto);
  const CaData = extraerConRango(['Calcio', 'CA'], texto);
  const MgData = extraerConRango(['Magnesio', 'MG'], texto);
  const PData = extraerConRango(['Fósforo', 'Fosforo', 'P'], texto);

  if ([NaData.valor, KData.valor, ClData.valor, CaData.valor, MgData.valor, PData.valor].every(v => v === '---')) return '';

  const Na = marcarSegunRango(NaData.valor, NaData.min, NaData.max);
  const K = marcarSegunRango(KData.valor, KData.min, KData.max);
  const Cl = marcarSegunRango(ClData.valor, ClData.min, ClData.max);
  const Ca = marcarSegunRango(CaData.valor, CaData.min, CaData.max);
  const Mg = marcarSegunRango(MgData.valor, MgData.min, MgData.max);
  const P = marcarSegunRango(PData.valor, PData.min, PData.max);

  return `<div class="lab-section"><div class="lab-title">Electrolitos Séricos</div><div class="lab-grid"><div class="lab-item"><div class="lab-label">Na</div><div class="lab-value">${Na}</div></div><div class="lab-item"><div class="lab-label">K</div><div class="lab-value">${K}</div></div><div class="lab-item"><div class="lab-label">Cl</div><div class="lab-value">${Cl}</div></div><div class="lab-item"><div class="lab-label">Ca</div><div class="lab-value">${Ca}</div></div><div class="lab-item"><div class="lab-label">Mg</div><div class="lab-value">${Mg}</div></div><div class="lab-item"><div class="lab-label">P</div><div class="lab-value">${P}</div></div></div></div>`;
}

/**
 * Parse liver function tests (Pruebas de Función Hepática) section from lab text
 * @param {string} tNorm - Normalized lab text
 * @returns {string} HTML string with formatted results or empty string if no data
 */
export function parsePFH_(tNorm) {
  const AlbData = extraerConRango(['Albúmina', 'Albumina', 'ALB'], tNorm);
  const ASTData = extraerConRango(['AST', 'TGO'], tNorm);
  const ALTData = extraerConRango(['ALT', 'TGP'], tNorm);
  const FAData = extraerConRango(['Fosfatasa Alcalina', 'ALP'], tNorm);
  const BTData = extraerConRango(['Bilirrubina Total', 'TBIL'], tNorm);

  if ([AlbData.valor, ASTData.valor, ALTData.valor, FAData.valor, BTData.valor].every(v => v === '---')) return '';

  const Alb = marcarSegunRango(AlbData.valor, AlbData.min, AlbData.max);
  const AST = marcarSegunRango(ASTData.valor, ASTData.min, ASTData.max);
  const ALT = marcarSegunRango(ALTData.valor, ALTData.min, ALTData.max);
  const FA = marcarSegunRango(FAData.valor, FAData.min, FAData.max);
  const BT = marcarSegunRango(BTData.valor, BTData.min, BTData.max);

  return `<div class="lab-section"><div class="lab-title">Pruebas de Función Hepática</div><div class="lab-grid"><div class="lab-item"><div class="lab-label">Albúmina</div><div class="lab-value">${Alb}</div></div><div class="lab-item"><div class="lab-label">AST</div><div class="lab-value">${AST}</div></div><div class="lab-item"><div class="lab-label">ALT</div><div class="lab-value">${ALT}</div></div><div class="lab-item"><div class="lab-label">FA</div><div class="lab-value">${FA}</div></div><div class="lab-item"><div class="lab-label">BT</div><div class="lab-value">${BT}</div></div></div></div>`;
}

/**
 * Parse blood gas analysis (Gasometría) section from lab text
 * @param {string} bloqueGaso - Lab text block containing gas analysis
 * @returns {string} HTML string with formatted results or empty string if no data
 */
export function parseGaso_(bloqueGaso) {
  const pHData = extraerConRango(['pH'], bloqueGaso);
  const pCO2Data = extraerConRango(['pCO2', 'PCO2'], bloqueGaso);
  const pO2Data = extraerConRango(['pO2', 'PO2'], bloqueGaso);
  const HCO3Data = extraerConRango(['HCO3', 'Bicarbonato'], bloqueGaso);

  if ([pHData.valor, pCO2Data.valor, pO2Data.valor, HCO3Data.valor].every(v => v === '---')) return '';

  const pH = marcarSegunRango(pHData.valor, pHData.min, pHData.max);
  const pCO2 = marcarSegunRango(pCO2Data.valor, pCO2Data.min, pCO2Data.max);
  const pO2 = marcarSegunRango(pO2Data.valor, pO2Data.min, pO2Data.max);
  const HCO3 = marcarSegunRango(HCO3Data.valor, HCO3Data.min, HCO3Data.max);

  return `<div class="lab-section"><div class="lab-title">Gasometría</div><div class="lab-grid"><div class="lab-item"><div class="lab-label">pH</div><div class="lab-value">${pH}</div></div><div class="lab-item"><div class="lab-label">pCO2</div><div class="lab-value">${pCO2}</div></div><div class="lab-item"><div class="lab-label">pO2</div><div class="lab-value">${pO2}</div></div><div class="lab-item"><div class="lab-label">HCO3</div><div class="lab-value">${HCO3}</div></div></div></div>`;
}

/**
 * Process raw lab text and parse all sections into formatted HTML
 * Results are cached to avoid re-parsing identical text
 * @param {string} textoBruto - Raw lab text to process
 * @returns {string} HTML string with all parsed lab sections or empty message
 */
export function procesarLabs(textoBruto) {
  if (!textoBruto || !textoBruto.trim()) return '';

  const hash = hashString(textoBruto);
  if (parseCache.has(hash)) {
    return parseCache.get(hash);
  }

  const tNorm = textoBruto.replace(/\*/g, '');

  let html = '';
  html += parseBH_(tNorm);
  html += parseQS_(tNorm);
  html += parseESC_(tNorm);
  html += parsePFH_(tNorm);
  html += parseGaso_(tNorm);

  const result = html || '<div class="lab-empty">No se detectaron laboratorios</div>';
  parseCache.set(hash, result);

  return result;
}
