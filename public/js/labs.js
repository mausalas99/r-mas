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

export function marcarSegunRango(valorStr, min, max) {
  if (!valorStr || valorStr === '---' || !min || !max) return valorStr;
  const val = parseFloat(valorStr);
  const minNum = parseFloat(min);
  const maxNum = parseFloat(max);
  if (isNaN(val) || isNaN(minNum) || isNaN(maxNum)) return valorStr;
  if (val < minNum) return `<span class="lab-low">${valorStr}</span>`;
  if (val > maxNum) return `<span class="lab-high">${valorStr}</span>`;
  return valorStr;
}

function fmt(val) {
  if (!val || val === '---') return '---';
  const num = parseFloat(val);
  if (isNaN(num)) return val;
  return num.toFixed(1);
}

export function parseBH_(tNorm) {
  const Hb = extraer(['Hemoglobina', 'HGB'], tNorm);
  const Hto = extraer(['Hematocrito', 'HCT'], tNorm);
  const Leuc = extraer(['Leucocitos', 'WBC'], tNorm);
  const Neut = extraer(['Neutrófilos', 'Neutrofilos', 'NEU'], tNorm);
  const Linf = extraer(['Linfocitos', 'LYM'], tNorm);
  const Plaq = extraer(['Plaquetas', 'PLT'], tNorm);

  if ([Hb, Hto, Leuc, Neut, Linf, Plaq].every(v => v === '---')) return '';

  return `<div class="lab-section"><div class="lab-title">Biometría Hemática</div><div class="lab-grid"><div><span class="lab-label">Hb:</span> ${Hb}</div><div><span class="lab-label">Hto:</span> ${Hto}</div><div><span class="lab-label">Leucocitos:</span> ${Leuc}</div><div><span class="lab-label">Neutrófilos:</span> ${Neut}</div><div><span class="lab-label">Linfocitos:</span> ${Linf}</div><div><span class="lab-label">Plaquetas:</span> ${Plaq}</div></div></div>`;
}

export function parseQS_(texto) {
  const Glu = extraer(['Glucosa', 'GLU'], texto);
  const Cr = extraer(['Creatinina', 'CREA'], texto);
  const BUN = extraer(['BUN', 'Urea'], texto);
  const PCR = extraer(['Proteína C Reactiva', 'PCR', 'CRP'], texto);
  const AU = extraer(['Ácido Úrico', 'Acido Urico', 'UA'], texto);
  const TGL = extraer(['Triglicéridos', 'Trigliceridos', 'TG'], texto);
  const COL = extraer(['Colesterol', 'CHOL'], texto);

  if ([Glu, Cr, BUN, PCR, AU, TGL, COL].every(v => v === '---')) return '';

  return `<div class="lab-section"><div class="lab-title">Química Sanguínea</div><div class="lab-grid"><div><span class="lab-label">Glucosa:</span> ${Glu}</div><div><span class="lab-label">Creatinina:</span> ${Cr}</div><div><span class="lab-label">BUN:</span> ${BUN}</div><div><span class="lab-label">PCR:</span> ${PCR}</div><div><span class="lab-label">Ác. Úrico:</span> ${AU}</div><div><span class="lab-label">Triglicéridos:</span> ${TGL}</div><div><span class="lab-label">Colesterol:</span> ${COL}</div></div></div>`;
}

export function parseESC_(texto) {
  const Na = extraer(['Sodio', 'NA'], texto);
  const K = extraer(['Potasio', 'K'], texto);
  const Cl = extraer(['Cloro', 'CL'], texto);
  const Ca = extraer(['Calcio', 'CA'], texto);
  const Mg = extraer(['Magnesio', 'MG'], texto);
  const P = extraer(['Fósforo', 'Fosforo', 'P'], texto);

  if ([Na, K, Cl, Ca, Mg, P].every(v => v === '---')) return '';

  return `<div class="lab-section"><div class="lab-title">Electrolitos Séricos</div><div class="lab-grid"><div><span class="lab-label">Na:</span> ${Na}</div><div><span class="lab-label">K:</span> ${K}</div><div><span class="lab-label">Cl:</span> ${Cl}</div><div><span class="lab-label">Ca:</span> ${Ca}</div><div><span class="lab-label">Mg:</span> ${Mg}</div><div><span class="lab-label">P:</span> ${P}</div></div></div>`;
}

export function parsePFH_(tNorm) {
  const Alb = extraer(['Albúmina', 'Albumina', 'ALB'], tNorm);
  const AST = extraer(['AST', 'TGO'], tNorm);
  const ALT = extraer(['ALT', 'TGP'], tNorm);
  const FA = extraer(['Fosfatasa Alcalina', 'ALP'], tNorm);
  const BT = extraer(['Bilirrubina Total', 'TBIL'], tNorm);

  if ([Alb, AST, ALT, FA, BT].every(v => v === '---')) return '';

  return `<div class="lab-section"><div class="lab-title">Pruebas de Función Hepática</div><div class="lab-grid"><div><span class="lab-label">Albúmina:</span> ${Alb}</div><div><span class="lab-label">AST:</span> ${AST}</div><div><span class="lab-label">ALT:</span> ${ALT}</div><div><span class="lab-label">FA:</span> ${FA}</div><div><span class="lab-label">BT:</span> ${BT}</div></div></div>`;
}

export function parseGaso_(bloqueGaso) {
  const pH = extraer(['pH'], bloqueGaso);
  const pCO2 = extraer(['pCO2', 'PCO2'], bloqueGaso);
  const pO2 = extraer(['pO2', 'PO2'], bloqueGaso);
  const HCO3 = extraer(['HCO3', 'Bicarbonato'], bloqueGaso);

  if ([pH, pCO2, pO2, HCO3].every(v => v === '---')) return '';

  return `<div class="lab-section"><div class="lab-title">Gasometría</div><div class="lab-grid"><div><span class="lab-label">pH:</span> ${pH}</div><div><span class="lab-label">pCO2:</span> ${pCO2}</div><div><span class="lab-label">pO2:</span> ${pO2}</div><div><span class="lab-label">HCO3:</span> ${HCO3}</div></div></div>`;
}

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
