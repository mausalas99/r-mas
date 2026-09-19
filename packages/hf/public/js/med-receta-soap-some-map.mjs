/**
 * Catálogo SOME → destino SOAP (fallback tras heurísticas clínicas).
 * Amplía magic-paste a Estado Actual; no agranda filtros de Manejo.
 */

const FORM_SKIP = new Set([
  'TABLETA',
  'COMPRIMIDO',
  'CAPSULA',
  'GRAGEA',
  'SOLUCION',
  'SUSPENSION',
  'CREMA',
  'UNGUENTO',
  'JARABE',
  'POLVO',
  'OVULO',
  'PARCHE',
  'BOLSA',
  'SUPOSITORIO',
  'AEROSOL',
  'SPRAY',
  'GRANULADO',
  'EFERV',
  'SUPLEMENTO',
  'FORMULA',
  'ALIMENTACION',
  'NUTRICION',
  'PARENTERAL',
]);

/** Frases multi-palabra (más largas primero). */
const PHRASES = [
  ['VALPROATO DE MAGNESIO', 'antiepilepticos'],
  ['VALPROATO SEMISODICO', 'antiepilepticos'],
  ['ACIDO VALPROICO', 'antiepilepticos'],
  ['SACUBITRILO VALSARTAN', 'antihta'],
  ['MONONITRATO DE ISOSORBIDA', 'antihta'],
  ['DINITRATO DE ISOSORBIDA', 'antihta'],
  ['NITROPRUSIATO DE SODIO', 'antihta'],
  ['CLORURO DE SODIO', 'nm'],
  ['CLORURO DE CALCIO', 'nm'],
  ['ACETATO DE SODIO', 'nm'],
  ['BICARBONATO DE SODIO', 'nm'],
  ['SULFATO FERROSO', 'nm'],
  ['SULFATO DE PROTAMINA', 'antidotos'],
  ['ACIDO FOLICO', 'nm'],
  ['ACIDO FOLINICO', 'antidotos'],
  ['ACIDO TRANEXAMICO', 'nm'],
  ['ACIDO URSODESOXICOLICO', 'nm'],
  ['ACIDO ASCORBICO', 'nm'],
  ['ACIDO MICOFENOLICO', 'nm'],
  ['ACIDO AMINOCAPROICO', 'nm'],
  ['COMPLEJO DE PROTROMBINA', 'transfusiones'],
  ['SEROALBUMINA HUMANA', 'transfusiones'],
];

const BY_DEST = {
  abx: [
    'CEFEPIMA',
    'CEFALEXINA',
    'CEFALOTINA',
    'CEFIXIMA',
    'CEFTOLOZANO',
    'AVIBACTAM',
    'DICLOXACILINA',
    'DORIPENEM',
    'ANFOTERICINA',
    'COLISTIN',
    'BENCILPENICILINA',
    'BENZATINA',
    'VALGANCICLOVIR',
    'CLORANFENICOL',
    'CICLOSERINA',
    'BEDAQUILINA',
    'DELAMANID',
    'DAPSONA',
    'ESTREPTOMICINA',
    'ISONIAZIDA',
    'ETAMBUTOL',
    'PIRAZINAMIDA',
    'PROTEONAMIDA',
    'RIFAMICINA',
    'GEMIFLOXACINO',
    'GATIFLOXACINO',
    'TETRACICLINA',
    'OXITETRACICLINA',
    'TINIDAZOL',
    'TRINIDAZOL',
    'KETOCONAZOL',
    'MICONAZOL',
    'CLOTRIMAZOL',
    'TERBINAFINA',
    'NISTATINA',
    'ISOCONAZOL',
    'FUSIDATO',
    'ZANAMIVIR',
    'RIBAVIRINA',
    'NITAZOXANIDA',
    'ANTIMONIATO',
  ],
  analgesia: [
    'KETOROLACO',
    'CLONIXINATO',
    'FENAZOPIRIDINA',
    'METADONA',
    'LOXOPROFENO',
    'ETORICOXIB',
    'PARECOXIB',
    'NIMESULIDA',
  ],
  antiemeticos: [
    'DIFENIDOL',
    'APREPITANT',
    'FOSAPREPITANT',
    'DOLASETRON',
    'TROPISETRON',
    'DOMPERIDONA',
    'MECLIZINA',
    'DOXILAMINA',
  ],
  sedacion: [
    'ALPRAZOLAM',
    'BROMAZEPAM',
    'CLORAZEPATO',
    'TRIAZOLAM',
    'ZOLPIDEM',
    'LOFLAZEPATO',
    'CLOZAPINA',
    'ARIPIPRAZOL',
    'BREXPIPRAZOL',
    'ZIPRASIDONA',
    'ZUCLOPENTIXOL',
    'FLUPENTIXOL',
    'CLORPROMAZINA',
    'LEVOMEPROMAZINA',
    'PERFENAZINA',
    'SULPIRIDA',
    'AMISULPRIDA',
    'KETAMINA',
    'ETOMIDATO',
    'TIOPENTAL',
    'HIDROXIZINA',
  ],
  antiepilepticos: ['CLOBAZAM', 'VIGABATRINA', 'PRIMIDONA'],
  antiparkinsonianos: [
    'RASAGILINA',
    'ROTIGOTINA',
    'BROMOCRIPTINA',
    'CABERGOLINA',
  ],
  antidotos: [
    'FABOTERAPICO',
    'FABOTERICO',
    'MESNA',
    'SUGAMMADEX',
    'NALTREXONA',
    'DEFERASIROX',
    'DEXRAZOXANO',
    'AMIFOSTINA',
    'NOVEFAZOL',
  ],
  viaAerea: [
    'BENZONATATO',
    'ERDOSTEINA',
    'AMINOFILINA',
    'TEOFILINA',
    'MONTELUKAST',
    'DORNASA',
    'UMECLIDINIO',
    'VILANTEROL',
    'OLODATEROL',
    'GLICOPIRRONIO',
  ],
  vasop: ['LEVOSIMENDAN', 'EFEDRINA'],
  antihta: [
    'FIMASARTAN',
    'METILDOPA',
    'PRAZOSINA',
    'APRESOLINA',
    'MONONITRATO',
    'ISOSORBIDA',
    'SACUBITRILO',
    'IVABRADINA',
    'BOSENTAN',
    'ALFUZOSINA',
  ],
  diuretico: [],
  anticoagulacion: ['PARNAPARINA', 'ACENOCUMAROL'],
  antitromboticos: [
    'ABCIXIMAB',
    'TIROFIBAN',
    'ANAGRELIDA',
    'INDOBUFENO',
    'ELTROMBOPAG',
  ],
  antiarritmicos: ['DRONEDARONA'],
  estatinas: ['SIMVASTATINA'],
  transfusiones: ['SEROALBUMINA', 'FILGRASTIM', 'MOLGRAMOSTIM', 'ROMIPLOSTIM'],
  nm: [
    'DAPAGLIFOZINA',
    'ALOGLUTAMOL',
    'BEZAFIBRATO',
    'FENOFIBRATO',
    'EZETIMIBA',
    'GEMFIBROZILO',
    'CIPROFIBRATO',
    'PITAVASTATINA',
    'COLESTIRAMINA',
    'LOPERAMIDA',
    'LORATADINA',
    'CLORFENAMINA',
    'CETIRIZINA',
    'DESLORATADINA',
    'LEVOCETIRIZINA',
    'FEXOFENADINA',
    'EBASTINA',
    'ERITROPOYETINA',
    'CARBOXIMALTOSA',
    'DESIDUSTAT',
    'CISAPRIDA',
    'CINITAPRIDA',
    'ITOPRIDA',
    'MOSAPRIDA',
    'LEVOSULPIRIDA',
    'TRIMEBUTINA',
    'PINAVERINO',
    'PINAVERIO',
    'MEBEVERINA',
    'ALVERINA',
    'OXIBUTININA',
    'TOLTERODINA',
    'MIRABEGRON',
    'DUTASTERIDA',
    'LINAGLIPTINA',
    'VILDAGLIPTINA',
    'PIOGLITAZONA',
    'ACARBOSA',
    'GLIPIZIDA',
    'CANAGLIFLOZINA',
    'BARICITINIB',
    'TOCILIZUMAB',
    'SIROLIMUS',
    'LAMIVUDINA',
    'ABACAVIR',
    'TENOFOVIR',
    'EMTRICITABINA',
    'DOLUTEGRAVIR',
    'EFAVIRENZ',
    'RITONAVIR',
    'LOPINAVIR',
    'DARUNAVIR',
    'RALTEGRAVIR',
    'ATAZANAVIR',
    'ZIDOVUDINA',
    'BICTEGRAVIR',
    'NEVIRAPINA',
    'ADEMETIONINA',
    'LEVOCARNITINA',
    'ALENDRONATO',
    'DENOSUMAB',
    'CALCITRIOL',
    'COLECALCIFEROL',
    'TIAMAZOL',
    'FLUDROCORTISONA',
    'HIDROXICLOROQUINA',
    'MESALAZINA',
    'SULFASALAZINA',
    'OCTREOTIDA',
    'DESMOPRESINA',
    'ATRACURIO',
    'SUXAMETONIO',
    'PIRIDOSTIGMINA',
    'NEOSTIGMINA',
    'RIVASTIGMINA',
    'CEREBROLYSIN',
    'CITICOLINA',
    'BETAHISTINA',
    'CINARIZINA',
    'DIOSMINA',
    'PENTOXIFILINA',
    'SILDENAFIL',
    'MELATONINA',
    'MODAFINILO',
    'ATOMOXETINA',
    'ANFEBUTAMONA',
    'DESVENLAFAXINA',
    'VORTIOXETINA',
    'FLUVOXAMINA',
    'IMIPRAMINA',
    'MAPROTILINA',
    'MILNACIPRAN',
    'ALMAGATO',
    'MAGALDRATO',
    'URSODESOXICOLICO',
    'IBANDRONICO',
    'ZOLEDRONICO',
    'RISEDRONICO',
    'TRANEXAMICO',
    'ETAMSILATO',
    'FOLINATO',
    'SACARATO',
    'GLUTAMINA',
    'OLIGOELEMENTOS',
    'PANCREATINA',
    'ESPAVEN',
    'PLANTAGO',
    'PSYLLIUM',
    'PICOSULFATO',
    'LUBIPROSTONA',
    'RACECADOTRILO',
    'DIOSMECTITA',
    'SACCHAROMYCES',
    'TRIMETAZIDINA',
    'NIMODIPINO',
    'LANSOPRAZOL',
    'MISOPROSTOL',
    'OXITOCINA',
    'CARBETOCINA',
    'MEDROXIPROGESTERONA',
    'PROGESTERONA',
    'DIENOGEST',
    'TAMOXIFENO',
    'ANASTROZOL',
    'LETROZOL',
    'HIDROXICARBAMIDA',
  ],
};

const TOKEN_MAP = (function buildTokenMap(byDest) {
  const map = Object.create(null);
  const keys = Object.keys(byDest);
  for (let i = 0; i < keys.length; i += 1) {
    const dest = keys[i];
    const list = byDest[dest];
    for (let j = 0; j < list.length; j += 1) {
      const tok = list[j];
      if (!map[tok]) map[tok] = dest;
    }
  }
  return map;
})(BY_DEST);

/**
 * Bolsas de reposición / irrigación: no van a cubos SOAP de EA.
 * @param {string} nombreRaw
 */
export function isSuerosMedicationNombre(nombreRaw) {
  const n = String(nombreRaw || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!n) return false;
  if (/\b(HARTMANN|RINGER)\b/.test(n)) return true;
  if (/\bAGUA INYECTABLE\b/.test(n)) return true;
  if (/\b(CLORURO DE SODIO|NACL)\b/.test(n) && /\b0\.9\b/.test(n)) return true;
  if (/\b(GLUCOSA|DEXTROSA)\b/.test(n) && /\b(5|10)\s*%/.test(n)) return true;
  return false;
}

function destFromPhrases(n) {
  for (let i = 0; i < PHRASES.length; i += 1) {
    const pair = PHRASES[i];
    if (n.indexOf(pair[0]) !== -1) return pair[1];
  }
  return '';
}

function destFromTokens(n) {
  const tokens = n.split(/[^A-Z]+/);
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];
    if (!t || t.length < 5 || FORM_SKIP.has(t)) continue;
    const dest = TOKEN_MAP[t];
    if (dest) return dest;
  }
  return '';
}

/**
 * @param {string} nNorm nombre ya normalizado (mayúsculas, sin acentos)
 * @returns {string} destino SOAP o ''
 */
export function classifyBySomeCatalog(nNorm) {
  const n = String(nNorm || '');
  if (!n) return '';
  return destFromPhrases(n) || destFromTokens(n);
}
