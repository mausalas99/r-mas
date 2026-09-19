/**
 * Spanish lab-name → canonical {sectionKey, key} lookup for OCR'd outside-lab
 * reports. Covers the core panels from labs-manual-catalog.mjs plus hierro
 * (FE). Unmatched names are not an error — the review modal lets the user
 * map them by hand.
 */
import { foldText } from './fuzzy-match.mjs';

var SYNONYMS = [
  // BH
  { names: ['HEMOGLOBINA'], sectionKey: 'BH', key: 'Hb' },
  { names: ['HEMATOCRITO'], sectionKey: 'BH', key: 'Hto' },
  { names: ['ERITROCITOS'], sectionKey: 'BH', key: 'RBC' },
  { names: ['VOLUMEN CORPUSCULAR MEDIO'], sectionKey: 'BH', key: 'VCM' },
  { names: ['HEMOGLOBINA CORPUSCULAR MEDIA'], sectionKey: 'BH', key: 'HCM' },
  { names: ['CONCENTRACION MEDIA DE HEMOGLOBINA CORPUSCULAR', 'CONC MEDIA DE HB CORPUSCULAR'], sectionKey: 'BH', key: 'CHCM' },
  { names: ['ANCHO DE DISTRIBUCION ERITROCITARIA'], sectionKey: 'BH', key: 'RDW' },
  { names: ['LEUCOCITOS'], sectionKey: 'BH', key: 'Leu' },
  { names: ['NEUTROFILOS'], sectionKey: 'BH', key: 'Neu' },
  { names: ['LINFOCITOS'], sectionKey: 'BH', key: 'Lin' },
  { names: ['MONOCITOS'], sectionKey: 'BH', key: 'Mono' },
  { names: ['EOSINOFILOS'], sectionKey: 'BH', key: 'Eos' },
  { names: ['BASOFILOS'], sectionKey: 'BH', key: 'Baso' },
  { names: ['PLAQUETAS'], sectionKey: 'BH', key: 'Plt' },
  { names: ['VOLUMEN PLAQUETARIO MEDIO'], sectionKey: 'BH', key: 'MPV' },
  // QS
  { names: ['GLUCOSA EN AYUNO', 'GLUCOSA EN SANGRE', 'GLUCOSA'], sectionKey: 'QS', key: 'Glu' },
  { names: ['NITROGENO UREICO', 'UREA'], sectionKey: 'QS', key: 'BUN' },
  { names: ['CREATININA SERICA', 'CREATININA'], sectionKey: 'QS', key: 'Cr' },
  { names: ['ACIDO URICO'], sectionKey: 'QS', key: 'AU' },
  { names: ['COLESTEROL TOTAL', 'COLESTEROL'], sectionKey: 'QS', key: 'COL' },
  { names: ['COLESTEROL HDL', 'HDL'], sectionKey: 'QS', key: 'HDL' },
  { names: ['COLESTEROL LDL', 'LDL'], sectionKey: 'QS', key: 'LDL' },
  { names: ['TRIGLICERIDOS'], sectionKey: 'QS', key: 'TGL' },
  // ESC
  { names: ['SODIO'], sectionKey: 'ESC', key: 'Na' },
  { names: ['CLORO'], sectionKey: 'ESC', key: 'Cl' },
  { names: ['POTASIO'], sectionKey: 'ESC', key: 'K' },
  { names: ['CALCIO EN SUERO', 'CALCIO'], sectionKey: 'ESC', key: 'Ca' },
  { names: ['FOSFORO EN SUERO', 'FOSFORO'], sectionKey: 'ESC', key: 'F' },
  { names: ['MAGNESIO EN SUERO', 'MAGNESIO'], sectionKey: 'ESC', key: 'Mg' },
  // PFHs
  { names: ['ALBUMINA EN SUERO', 'ALBUMINA'], sectionKey: 'PFHs', key: 'Alb' },
  { names: ['ASPARTATO AMINOTRANSFERASA', 'TGO', 'AST'], sectionKey: 'PFHs', key: 'AST' },
  { names: ['ALANINO AMINOTRANSFERASA', 'TGP', 'ALT'], sectionKey: 'PFHs', key: 'ALT' },
  { names: ['FOSFATASA ALCALINA'], sectionKey: 'PFHs', key: 'FA' },
  { names: ['GAMMAGLUTAMIL TRANSPEPTIDASA', 'GAMA GLUTAMIL TRANSPEPTIDASA', 'GGT'], sectionKey: 'PFHs', key: 'GGT' },
  { names: ['PROTEINAS TOTALES SERICAS', 'PROTEINAS TOTALES'], sectionKey: 'PFHs', key: 'Prot' },
  { names: ['BILIRRUBINA TOTAL'], sectionKey: 'PFHs', key: 'BT' },
  { names: ['BILIRRUBINA DIRECTA'], sectionKey: 'PFHs', key: 'BD' },
  { names: ['BILIRRUBINA INDIRECTA'], sectionKey: 'PFHs', key: 'BI' },
  { names: ['DESHIDROGENASA LACTICA', 'LDH'], sectionKey: 'PFHs', key: 'LDH' },
  { names: ['AMILASA'], sectionKey: 'PFHs', key: 'Amil' },
  // COAG
  { names: ['TIEMPO DE PROTROMBINA'], sectionKey: 'COAG', key: 'TP' },
  { names: ['TIEMPO DE TROMBOPLASTINA PARCIAL', 'TIEMPO DE TROMBOPLASTINA'], sectionKey: 'COAG', key: 'TTP' },
  { names: ['INR'], sectionKey: 'COAG', key: 'INR' },
  { names: ['FIBRINOGENO'], sectionKey: 'COAG', key: 'Fib' },
  { names: ['DIMERO D'], sectionKey: 'COAG', key: 'DD' },
  // TROP
  { names: ['TROPONINA'], sectionKey: 'TROP', key: 'Trop' },
  // LIPASA
  { names: ['LIPASA'], sectionKey: 'LIPASA', key: 'Lip' },
  // FE (hierro)
  { names: ['HIERRO SERICO', 'HIERRO'], sectionKey: 'FE', key: 'Fe' },
  { names: ['FERRITINA'], sectionKey: 'FE', key: 'Ferr' },
];

var EXACT_INDEX = null;
var SUBSTRING_LIST = null;

function buildIndex() {
  if (EXACT_INDEX) return;
  EXACT_INDEX = Object.create(null);
  SUBSTRING_LIST = [];
  SYNONYMS.forEach(function (entry) {
    entry.names.forEach(function (name) {
      var folded = foldText(name);
      EXACT_INDEX[folded] = { sectionKey: entry.sectionKey, key: entry.key };
      SUBSTRING_LIST.push({ folded: folded, sectionKey: entry.sectionKey, key: entry.key });
    });
  });
  SUBSTRING_LIST.sort(function (a, b) {
    return b.folded.length - a.folded.length;
  });
}

/**
 * @param {string} rawName as read from an OCR'd lab-report line
 * @returns {{ sectionKey: string, key: string }|null}
 */
export function matchLabSynonym(rawName) {
  buildIndex();
  var folded = foldText(rawName).trim();
  if (!folded) return null;
  if (EXACT_INDEX[folded]) return EXACT_INDEX[folded];
  for (var i = 0; i < SUBSTRING_LIST.length; i++) {
    if (folded.indexOf(SUBSTRING_LIST[i].folded) !== -1) {
      return { sectionKey: SUBSTRING_LIST[i].sectionKey, key: SUBSTRING_LIST[i].key };
    }
  }
  return null;
}
