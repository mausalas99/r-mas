/**
 * Scaffold de paneles hospitalarios extendidos (fixtures sintéticos / labels SOME típicos).
 * Ajustar labels cuando lleguen reportes reales.
 */

/** @typedef {{ key: string, labels: string[] }} NumField */
/** @typedef {{ key: string, patterns: RegExp[] }} QualField */
/**
 * @typedef {{
 *   sectionKey: string,
 *   mode: 'num'|'qual',
 *   gates: RegExp[],
 *   fields: (NumField|QualField)[]
 * }} PanelDef
 */

/** @type {PanelDef[]} */
export const LAB_EXTENDED_PANEL_DEFS = [
  {
    sectionKey: 'TIR',
    mode: 'num',
    gates: [/\bTSH\b/i, /T4\s*LIBRE/i, /TIROXINA\s+LIBRE/i, /TIROIDES/i],
    fields: [
      { key: 'TSH', labels: ['TSH', 'HORMONA ESTIMULANTE DE LA TIROIDES', 'HORMONA ESTIMULANTE DE TIROIDES'] },
      { key: 'T4L', labels: ['T4 LIBRE', 'TIROXINA LIBRE', 'FT4'] },
      { key: 'T3L', labels: ['T3 LIBRE', 'TRIYODOTIRONINA LIBRE', 'FT3'] },
      { key: 'T4T', labels: ['T4 TOTAL', 'TIROXINA TOTAL'] },
      { key: 'T3T', labels: ['T3 TOTAL', 'TRIYODOTIRONINA TOTAL'] },
      { key: 'AntiTPO', labels: ['ANTI TPO', 'ANTICUERPOS ANTI TPO', 'ANTI-TPO'] },
      { key: 'AntiTg', labels: ['ANTI TIROGLOBULINA', 'ANTICUERPOS ANTI TIROGLOBULINA', 'ANTI-TG'] },
    ],
  },
  {
    sectionKey: 'ENDO',
    mode: 'num',
    gates: [
      /HEMOGLOBINA\s+GLICOSILADA/i,
      /\bHBA1C\b/i,
      /\bCORTISOL\b/i,
      /\bPTH\b/i,
      /VITAMINA\s+D/i,
      /\bINSULINA\b/i,
      /PEPTIDO\s+C/i,
      /PROLACTINA/i,
    ],
    fields: [
      { key: 'HbA1c', labels: ['HEMOGLOBINA GLICOSILADA', 'HBA1C', 'HB A1C'] },
      { key: 'Cortisol', labels: ['CORTISOL'] },
      { key: 'PTH', labels: ['PTH', 'HORMONA PARATIROIDEA', 'PARATHORMONA'] },
      { key: 'VitD', labels: ['VITAMINA D 25 OH', 'VITAMINA D 25-OH', '25-OH VITAMINA D', 'VITAMINA D'] },
      { key: 'Insulina', labels: ['INSULINA'] },
      { key: 'PepC', labels: ['PEPTIDO C', 'PÉPTIDO C'] },
      { key: 'PRL', labels: ['PROLACTINA'] },
      { key: 'LH', labels: ['HORMONA LUTEINIZANTE', 'LH '] },
      { key: 'FSH', labels: ['HORMONA FOLICULO ESTIMULANTE', 'FSH '] },
      { key: 'E2', labels: ['ESTRADIOL'] },
      { key: 'Testo', labels: ['TESTOSTERONA'] },
      { key: 'bHCG', labels: ['BETA HCG', 'BHCG', 'GONADOTROFINA CORIONICA'] },
    ],
  },
  {
    sectionKey: 'CARD',
    mode: 'num',
    gates: [/NT-?PROBNP/i, /\bBNP\b/i, /CK-?MB/i, /MIOGLOBINA/i],
    fields: [
      { key: 'NTproBNP', labels: ['NT-PROBNP', 'NT PROBNP', 'NTproBNP'] },
      { key: 'BNP', labels: ['BNP ', 'PEPTIDO NATRIURETICO'] },
      { key: 'CKMB', labels: ['CK-MB', 'CK MB', 'CKMB'] },
      { key: 'Mio', labels: ['MIOGLOBINA'] },
    ],
  },
  {
    sectionKey: 'FE',
    mode: 'num',
    gates: [/HIERRO\s+SERICO/i, /\bFERRITINA\b/i, /SATURACION\s+DE\s+TRANSFERRINA/i, /FIJACION\s+DE\s+HIERRO/i],
    fields: [
      { key: 'Fe', labels: ['HIERRO SERICO', 'HIERRO SÉRICO', 'HIERRO '] },
      { key: 'TIBC', labels: ['CAPACIDAD DE FIJACION DE HIERRO', 'TIBC', 'CTFH'] },
      { key: 'Sat', labels: ['% DE SATURACION DE TRANSFERRINA', 'SATURACION DE TRANSFERRINA', '% SATURACION'] },
      { key: 'Ferr', labels: ['FERRITINA'] },
      { key: 'Transf', labels: ['TRANSFERRINA'] },
    ],
  },
  {
    sectionKey: 'INFL',
    mode: 'num',
    gates: [/FACTOR\s+REUMATOIDE/i, /IGE\s+TOTAL/i, /INMUNOGLOBULINA\s+E/i],
    fields: [
      { key: 'FR', labels: ['FACTOR REUMATOIDE'] },
      { key: 'IgE', labels: ['IGE TOTAL', 'INMUNOGLOBULINA E'] },
    ],
  },
  {
    sectionKey: 'INM',
    mode: 'num',
    gates: [/COMPLEMENTO\s+C3/i, /COMPLEMENTO\s+C4/i, /\bC3\b/i, /\bC4\b/i],
    fields: [
      { key: 'C3', labels: ['COMPLEMENTO C3'] },
      { key: 'C4', labels: ['COMPLEMENTO C4'] },
      { key: 'IgG', labels: ['INMUNOGLOBULINA G'] },
      { key: 'IgA', labels: ['INMUNOGLOBULINA A'] },
      { key: 'IgM', labels: ['INMUNOGLOBULINA M'] },
    ],
  },
  {
    sectionKey: 'META',
    mode: 'num',
    gates: [/\bAMONIO\b/i, /OSMOLARIDAD\s+SERICA/i, /OSMOLALIDAD\s+SERICA/i, /LACTATO\s+SERICO/i],
    fields: [
      { key: 'NH3', labels: ['AMONIO'] },
      { key: 'Osm', labels: ['OSMOLARIDAD SERICA', 'OSMOLALIDAD SERICA', 'OSMOLARIDAD'] },
      { key: 'LacS', labels: ['LACTATO SERICO', 'LACTATO SÉRICO'] },
    ],
  },
  {
    sectionKey: 'NEF',
    mode: 'num',
    gates: [/CISTATINA\s+C/i, /MICROALBUMINURIA/i, /ALBUMINA\s*\/\s*CREATININA/i, /PROTEINA\s*\/\s*CREATININA/i],
    fields: [
      { key: 'CysC', labels: ['CISTATINA C'] },
      { key: 'AlbCr', labels: ['MICROALBUMINURIA', 'ALBUMINA/CREATININA', 'ALBUMINA / CREATININA', 'RELACION ALBUMINA CREATININA'] },
      { key: 'ProtCr', labels: ['PROTEINA/CREATININA', 'PROTEINA / CREATININA', 'RELACION PROTEINA CREATININA'] },
    ],
  },
  {
    sectionKey: 'NIVEL',
    mode: 'num',
    gates: [
      /VANCOMICINA/i,
      /DIGOXINA/i,
      /\bLITIO\b/i,
      /ACIDO\s+VALPROICO/i,
      /CARBAMAZEPINA/i,
      /FENITOINA/i,
      /TACROLIMUS/i,
      /CICLOSPORINA/i,
    ],
    fields: [
      { key: 'Vanco', labels: ['VANCOMICINA'] },
      { key: 'Dig', labels: ['DIGOXINA'] },
      { key: 'Li', labels: ['LITIO'] },
      { key: 'VPA', labels: ['ACIDO VALPROICO', 'ÁCIDO VALPROICO', 'VALPROATO'] },
      { key: 'Carb', labels: ['CARBAMAZEPINA'] },
      { key: 'Fenit', labels: ['FENITOINA', 'FENITOÍNA'] },
      { key: 'Tacro', labels: ['TACROLIMUS'] },
      { key: 'Ciclo', labels: ['CICLOSPORINA'] },
    ],
  },
  {
    sectionKey: 'TM',
    mode: 'num',
    gates: [/\bAFP\b/i, /\bCEA\b/i, /CA\s*125/i, /CA\s*19-?9/i, /CA\s*15-?3/i, /\bPSA\b/i],
    fields: [
      { key: 'AFP', labels: ['AFP', 'ALFA FETOPROTEINA', 'ALFAFETOPROTEINA'] },
      { key: 'CEA', labels: ['CEA', 'ANTIGENO CARCINOEMBRIONARIO'] },
      { key: 'CA125', labels: ['CA 125', 'CA125'] },
      { key: 'CA199', labels: ['CA 19-9', 'CA 199', 'CA19-9'] },
      { key: 'CA153', labels: ['CA 15-3', 'CA 153', 'CA15-3'] },
      { key: 'PSA', labels: ['PSA', 'ANTIGENO PROSTATICO'] },
    ],
  },
  {
    sectionKey: 'NUT',
    mode: 'num',
    gates: [/VITAMINA\s+B12/i, /ACIDO\s+FOLICO/i, /ÁCIDO\s+FÓLICO/i, /\bFOLATO\b/i],
    fields: [
      { key: 'B12', labels: ['VITAMINA B12', 'COBALAMINA'] },
      { key: 'Fol', labels: ['ACIDO FOLICO', 'ÁCIDO FÓLICO', 'FOLATO'] },
    ],
  },
  {
    sectionKey: 'GI',
    mode: 'num',
    gates: [/CALPROTECTINA/i, /ELASTASA\s+FECAL/i],
    fields: [
      { key: 'Calpro', labels: ['CALPROTECTINA FECAL', 'CALPROTECTINA'] },
      { key: 'Elast', labels: ['ELASTASA FECAL', 'ELASTASA PANCREATICA'] },
    ],
  },
  {
    sectionKey: 'GI',
    mode: 'qual',
    gates: [/SANGRE\s+OCULTA/i],
    fields: [
      { key: 'SOH', patterns: [/SANGRE\s+OCULTA\s+EN\s+HECES/i, /SANGRE\s+OCULTA/i] },
    ],
  },
  {
    sectionKey: 'TOX',
    mode: 'num',
    gates: [/\bETANOL\b/i, /PARACETAMOL/i, /ACETAMINOFEN/i, /SALICILATO/i, /CARBOXIHEMOGLOBINA/i, /METAHEMOGLOBINA/i],
    fields: [
      { key: 'EtOH', labels: ['ETANOL'] },
      { key: 'APAP', labels: ['PARACETAMOL', 'ACETAMINOFEN', 'ACETAMINOFÉN'] },
      { key: 'ASA', labels: ['SALICILATOS', 'SALICILATO'] },
      { key: 'COHb', labels: ['CARBOXIHEMOGLOBINA', 'COHB'] },
      { key: 'MetHb', labels: ['METAHEMOGLOBINA', 'METHB'] },
    ],
  },
  {
    sectionKey: 'HEPB',
    mode: 'qual',
    gates: [/ANTI-?HBS/i, /ANTI-?HBC/i, /HBEAG/i, /ANTI-?HBE/i, /ANTICUERPOS\s+ANTI-?HBS/i],
    fields: [
      { key: 'AntiHBs', patterns: [/ANTICUERPOS\s+ANTI-?HBS/i, /ANTI-?HBS/i, /ANTI\s+HBS/i] },
      { key: 'AntiHBc', patterns: [/ANTICUERPOS\s+ANTI-?HBC/i, /ANTI-?HBC\s+IG\s*M/i, /ANTI-?HBC/i] },
      { key: 'HBeAg', patterns: [/ANTIGENO\s+E.*HEPATITIS\s+B/i, /\bHBEAG\b/i] },
      { key: 'AntiHBe', patterns: [/ANTICUERPOS\s+ANTI-?HBE/i, /ANTI-?HBE/i] },
    ],
  },
  {
    sectionKey: 'VIRAL',
    mode: 'qual',
    gates: [/\bVDRL\b/i, /RPR\b/i, /TOXOPLASMA/i, /\bCMV\b/i, /\bEBV\b/i, /RUBEOLA/i, /HERPES/i],
    fields: [
      { key: 'VDRL', patterns: [/\bVDRL\b/i, /\bRPR\b/i] },
      { key: 'ToxoIgM', patterns: [/IGM\s+TOXOPLASMA/i, /TOXOPLASMA\s+IGM/i, /ANTICUERPOS\s+IGM\s+TOXOPLASMA/i] },
      { key: 'ToxoIgG', patterns: [/IGG\s+TOXOPLASMA/i, /TOXOPLASMA\s+IGG/i] },
      { key: 'CMVIgM', patterns: [/CMV\s+IGM/i, /IGM\s+CITOMEGALOVIRUS/i] },
      { key: 'EBVIgM', patterns: [/EBV\s+IGM/i, /VCA\s+IGM/i] },
      { key: 'RubIgM', patterns: [/RUBEOLA\s+IGM/i, /IGM\s+RUBEOLA/i] },
    ],
  },
  {
    sectionKey: 'MICRO',
    mode: 'qual',
    gates: [
      /LEGIONELLA\s+EN\s+ORINA/i,
      /NEUMOCOCO\s+EN\s+ORINA/i,
      /ESTREPTOCOCO\s+A/i,
      /INFLUENZA/i,
      /CLOSTRIDIUM\s+DIFFICILE/i,
      /C\.\s*DIFF/i,
    ],
    fields: [
      { key: 'LegAg', patterns: [/ANTIGENO\s+LEGIONELLA\s+EN\s+ORINA/i, /LEGIONELLA\s+EN\s+ORINA/i] },
      { key: 'PneuAg', patterns: [/ANTIGENO\s+NEUMOCOCO\s+EN\s+ORINA/i, /NEUMOCOCO\s+EN\s+ORINA/i] },
      { key: 'StrepA', patterns: [/ESTREPTOCOCO\s+DEL\s+GRUPO\s+A/i, /ESTREPTOCOCO\s+A/i] },
      { key: 'FluAg', patterns: [/ANTIGENO\s+INFLUENZA/i, /INFLUENZA\s+A\s*\/\s*B/i] },
      { key: 'Cdiff', patterns: [/CLOSTRIDIUM\s+DIFFICILE/i, /C\.\s*DIFFICILE/i, /TOXINA\s+C\.\s*DIFF/i] },
    ],
  },
];

/** Claves de sección únicas para headers / tendencias / dedupe. */
export const LAB_EXTENDED_SECTION_KEYS = (function () {
  var seen = Object.create(null);
  var keys = [];
  for (var i = 0; i < LAB_EXTENDED_PANEL_DEFS.length; i++) {
    var k = LAB_EXTENDED_PANEL_DEFS[i].sectionKey;
    if (seen[k]) continue;
    seen[k] = 1;
    keys.push(k);
  }
  return keys;
})();

/** Alternation for section-header regexes (e.g. TIR|ENDO|…). */
export function labExtendedSectionAlt_() {
  return LAB_EXTENDED_SECTION_KEYS.join('|');
}
