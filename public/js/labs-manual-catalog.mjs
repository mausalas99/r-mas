/**
 * Catálogo de tipos/campos para entrada manual de labs externos.
 * Core + paneles extendidos (LAB_EXTENDED_PANEL_DEFS).
 */
import { LAB_EXTENDED_PANEL_DEFS } from './labs-panel-defs.mjs';

/**
 * @typedef {{ key: string, label: string, mode: 'num'|'qual' }} ManualLabField
 * @typedef {{ sectionKey: string, label: string, fields: ManualLabField[] }} ManualLabType
 */

/** @param {string} key @param {string} label @param {'num'|'qual'} [mode] */
function f(key, label, mode) {
  return { key: key, label: label, mode: mode || 'num' };
}

/** @type {ManualLabType[]} */
var CORE_MANUAL_TYPES = [
  {
    sectionKey: 'BH',
    label: 'Biometría (BH)',
    fields: [
      f('Hb', 'Hb'),
      f('Hto', 'Hto'),
      f('RBC', 'RBC'),
      f('VCM', 'VCM'),
      f('HCM', 'HCM'),
      f('CHCM', 'CHCM'),
      f('RDW', 'RDW'),
      f('Leu', 'Leu'),
      f('Neu', 'Neu'),
      f('NeuPct', 'Neu %'),
      f('Lin', 'Lin'),
      f('LinPct', 'Lin %'),
      f('Mono', 'Mono'),
      f('MonoPct', 'Mono %'),
      f('Eos', 'Eos'),
      f('EosPct', 'Eos %'),
      f('Baso', 'Baso'),
      f('BasoPct', 'Baso %'),
      f('Plt', 'Plt'),
      f('MPV', 'MPV'),
      f('Ret', 'Ret'),
      f('Bandas', 'Bandas'),
      f('Blastos', 'Blastos'),
    ],
  },
  {
    sectionKey: 'QS',
    label: 'Química (QS)',
    fields: [
      f('Glu', 'Glu'),
      f('BUN', 'BUN'),
      f('Cr', 'Cr'),
      f('eTFG', 'eTFG'),
      f('AU', 'AU'),
      f('PCR', 'PCR'),
      f('PCT', 'PCT'),
      f('COL', 'COL'),
      f('HDL', 'HDL'),
      f('LDL', 'LDL'),
      f('VLDL', 'VLDL'),
      f('TGL', 'TGL'),
      f('VSG', 'VSG'),
      f('CPK', 'CPK'),
    ],
  },
  {
    sectionKey: 'ESC',
    label: 'Electrolitos (ESC)',
    fields: [f('Na', 'Na'), f('Cl', 'Cl'), f('K', 'K'), f('Ca', 'Ca'), f('F', 'Fósforo'), f('Mg', 'Mg')],
  },
  {
    sectionKey: 'PFHs',
    label: 'PFH',
    fields: [
      f('Alb', 'Alb'),
      f('AST', 'AST'),
      f('ALT', 'ALT'),
      f('FA', 'FA'),
      f('GGT', 'GGT'),
      f('Prot', 'Prot'),
      f('BT', 'BT'),
      f('BD', 'BD'),
      f('BI', 'BI'),
      f('LDH', 'LDH'),
      f('Amil', 'Amilasa'),
    ],
  },
  {
    sectionKey: 'GASES',
    label: 'Gasometría',
    fields: [
      f('pH', 'pH'),
      f('pCO2', 'pCO₂'),
      f('pO2', 'pO₂'),
      f('Bica', 'HCO₃'),
      f('Lactato', 'Lactato'),
      f('Na', 'Na'),
      f('K', 'K'),
      f('GLU', 'Glu'),
      f('Hto', 'Hto'),
      f('iCa', 'iCa'),
    ],
  },
  {
    sectionKey: 'COAG',
    label: 'Coagulación',
    fields: [f('TP', 'TP'), f('TTP', 'TTP'), f('INR', 'INR'), f('Fib', 'Fibrinógeno'), f('DD', 'Dímero D')],
  },
  {
    sectionKey: 'EGO',
    label: 'EGO',
    fields: [
      f('pH', 'pH'),
      f('Dens', 'Densidad'),
      f('Prot', 'Prot'),
      f('Glu', 'Glu'),
      f('Cet', 'Cetonas', 'qual'),
      f('Bili', 'Bilirrubina', 'qual'),
      f('Nitr', 'Nitritos', 'qual'),
      f('EstLeu', 'Est. leucocitaria', 'qual'),
      f('Leu', 'Leu'),
      f('Eri', 'Eri'),
      f('Color', 'Color', 'qual'),
      f('Asp', 'Aspecto', 'qual'),
    ],
  },
  {
    sectionKey: 'TROP',
    label: 'Troponina',
    fields: [f('Trop', 'Troponina'), f('TropHs', 'Troponina hs')],
  },
  {
    sectionKey: 'LIPASA',
    label: 'Lipasa',
    fields: [f('Lip', 'Lipasa')],
  },
];

var EXTENDED_LABELS = {
  TIR: 'Tiroides',
  ENDO: 'Endocrino',
  CARD: 'Cardíaco',
  FE: 'Hierro',
  INFL: 'Inflamatorio',
  INM: 'Inmunidad',
  META: 'Metabólico',
  NEF: 'Nefro',
  NIVEL: 'Niveles fármaco',
  TM: 'Marcadores tumorales',
  NUT: 'Nutricional',
  GI: 'GI',
  TOX: 'Toxicología',
  HEPB: 'Hepatitis B',
  VIRAL: 'Serología viral',
  MICRO: 'Micro / Ag rápidos',
};

/**
 * @param {import('./labs-panel-defs.mjs').PanelDef} def
 * @returns {ManualLabField[]}
 */
function fieldsFromPanelDef(def) {
  var mode = def.mode === 'qual' ? 'qual' : 'num';
  return (def.fields || []).map(function (fld) {
    return f(fld.key, fld.key, mode);
  });
}

/**
 * Merge extended defs that share sectionKey (num + qual GI, etc.).
 * @returns {ManualLabType[]}
 */
function buildExtendedManualTypes() {
  /** @type {Record<string, ManualLabType>} */
  var byKey = Object.create(null);
  LAB_EXTENDED_PANEL_DEFS.forEach(function (def) {
    var key = def.sectionKey;
    if (!byKey[key]) {
      byKey[key] = {
        sectionKey: key,
        label: EXTENDED_LABELS[key] || key,
        fields: [],
      };
    }
    var existing = Object.create(null);
    byKey[key].fields.forEach(function (x) {
      existing[x.key] = 1;
    });
    fieldsFromPanelDef(def).forEach(function (fld) {
      if (existing[fld.key]) return;
      existing[fld.key] = 1;
      byKey[key].fields.push(fld);
    });
  });
  return Object.keys(byKey).map(function (k) {
    return byKey[k];
  });
}

/** @type {ManualLabType[]|null} */
var _cachedTypes = null;

/** @returns {ManualLabType[]} */
export function listManualLabTypes() {
  if (!_cachedTypes) {
    _cachedTypes = CORE_MANUAL_TYPES.concat(buildExtendedManualTypes());
  }
  return _cachedTypes;
}

/** @param {string} sectionKey @returns {ManualLabType|null} */
export function getManualLabType(sectionKey) {
  var key = String(sectionKey || '').trim();
  if (!key) return null;
  var types = listManualLabTypes();
  for (var i = 0; i < types.length; i++) {
    if (types[i].sectionKey === key) return types[i];
  }
  // PFHs vs PFHS case
  var upper = key.toUpperCase();
  for (var j = 0; j < types.length; j++) {
    if (types[j].sectionKey.toUpperCase() === upper) return types[j];
  }
  return null;
}

/** @param {string} sectionKey @returns {ManualLabField[]} */
export function fieldsForManualLabType(sectionKey) {
  var t = getManualLabType(sectionKey);
  return t ? t.fields.slice() : [];
}
