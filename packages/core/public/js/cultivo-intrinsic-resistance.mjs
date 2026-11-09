/**
 * Fenotipos de resistencia esperada (antes "resistencia intrínseca"). Solo datos + lógica pura, sin UI.
 *
 * Fuentes: EUCAST (bacterias), EUCAST AFST (hongos) y CLSI M100 (bacterias).
 * Bacterias: EUCAST "Expected Resistant Phenotypes" v1.2, enero 2023
 * (https://www.eucast.org/expert_rules_and_expected_phenotypes). Documento gratuito.
 * CLSI: M100, 36.ª ed., enero 2026, Apéndice B (Intrinsic Resistance). Solo se cita; el PDF no está en el repo.
 * El dueño tiene permiso de uso de CLSI (2026-11-09). Solo las celdas "R" de la tabla; las celdas con nota
 * "no se puede confirmar" van como `pendiente`.
 * Un "S" en una combinación con R esperada es sospechoso (error de identificación o de prueba).
 * Si EUCAST y CLSI listan la misma combinación, la fila trae las dos fuentes.
 *
 * `estado`: 'eucast', 'clsi' o 'eucast+clsi'. `pendiente` = la fuente no lo da como regla exacta; no marca nada.
 */
import { classifyAtbInterp } from './labs-cultivo-atb.mjs';
import { abreviarAbAtb_ } from './labs-cultivo-abbr.mjs';

export const INTRINSIC_SOURCE = 'EUCAST Expected Resistant Phenotypes v1.2, enero 2023';
export const CLSI_SOURCE = 'CLSI M100, 36.ª ed., enero 2026, Apéndice B';
// Hongos: EUCAST AFST Breakpoint Table. "-" = prueba no recomendada, se puede informar R sin probar.
export const FUNGI_SOURCE = 'EUCAST AFST Antifungal Breakpoint Table v12.1 (válida desde 2026-03-18), marca "-"';

const norm = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/\b(SPP?|SPECIES)\.?(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Antibióticos/clases: etiqueta + prueba sobre el nombre normalizado del antibiótico. */
const ATB = {
  ampamox: { label: 'Ampicilina / amoxicilina', test: (n) => /AMPICILINA|AMOXICILINA/.test(n) && !/SULB|CLAV/.test(n) },
  amoxclav: { label: 'Amoxicilina-clavulánico', test: (n) => /AMOX\w*.*CLAV|AUGMENTIN/.test(n) },
  ampsulb: { label: 'Ampicilina-sulbactam', test: (n) => /AMP\w*.*SULB/.test(n) },
  ticarcilina: { label: 'Ticarcilina', test: (n) => /TICARCILINA/.test(n) && !/CLAV/.test(n) },
  ticarclav: { label: 'Ticarcilina-clavulánico', test: (n) => /TICARCILINA.*CLAV/.test(n) },
  pip: { label: 'Piperacilina', test: (n) => /PIPERACILINA/.test(n) && !/TAZ/.test(n) },
  piptazo: { label: 'Piperacilina-tazobactam', test: (n) => /PIPERACILINA.*TAZ|PIP\/TAZ/.test(n) },
  penicilina: { label: 'Bencilpenicilina', test: (n) => /PENICILINA/.test(n) },
  cef1: { label: 'Cefalosporinas 1ª gen (cefazolina, cefalotina, cefalexina)', test: (n) => /CEFAZOLINA|CEFALOTINA|CEFALEXINA|CEFADROXILO|CEFRADINA|CEPHALOTHIN/.test(n) },
  cefoxitina: { label: 'Cefoxitina', test: (n) => /CEFOXITINA/.test(n) },
  cefuroxima: { label: 'Cefuroxima', test: (n) => /CEFUROXIMA/.test(n) },
  cefotriax: { label: 'Cefotaxima / ceftriaxona', test: (n) => /CEFOTAXIMA|CEFTRIAXONA/.test(n) },
  ceftazidima: { label: 'Ceftazidima', test: (n) => /CEFTAZIDIMA/.test(n) },
  cefalosporinas: { label: 'Cefalosporinas (todas)', test: (n) => /\bCEF|CEFALO/.test(n) },
  aztreonam: { label: 'Aztreonam', test: (n) => /AZTREONAM/.test(n) },
  ertapenem: { label: 'Ertapenem', test: (n) => /ERTAPENEM/.test(n) },
  carbapenemicos: { label: 'Carbapenémicos', test: (n) => /MEROPENEM|IMIPENEM|ERTAPENEM|DORIPENEM/.test(n) },
  cipro: { label: 'Ciprofloxacino', test: (n) => /CIPROFLOXACINA/.test(n) },
  cloranfenicol: { label: 'Cloranfenicol', test: (n) => /CLORANFENICOL/.test(n) },
  // Las filas de sinergia / alto nivel (GENT-SIN) no son resistencia de bajo nivel.
  aminoglucosidos: {
    label: 'Aminoglucósidos',
    test: (n) => /GENTAMICINA|AMIKACINA|TOBRAMICINA|ESTREPTOMICINA|KANAMICINA|NETILMICINA|NEOMICINA/.test(n) && !/SINERG|ALTO NIVEL|HLAR|SYNERG/.test(n),
  },
  kananeo: { label: 'Kanamicina / neomicina', test: (n) => /KANAMICINA|NEOMICINA/.test(n) },
  trimetoprim: { label: 'Trimetoprim solo', test: (n) => /TRIMETOPRIM/.test(n) && !/SULFA|SMX|TMP/.test(n) },
  sulfonamidas: { label: 'Sulfonamidas', test: (n) => /SULFADIAZINA|SULFISOXAZOL|SULFAMETOXAZOL/.test(n) && !/TRIM|TMP/.test(n) },
  fosfomicina: { label: 'Fosfomicina', test: (n) => /FOSFOMICINA/.test(n) },
  tetraciclinas: { label: 'Tetraciclinas', test: (n) => /TETRACICLINA|DOXICICLINA|MINOCICLINA/.test(n) },
  // S. maltophilia: EUCAST (nota 7): solo tetraciclina; doxiciclina, minociclina y tigeciclina varían.
  tetraciclina: { label: 'Tetraciclina (no doxiciclina/minociclina/tigeciclina)', test: (n) => /TETRACICLINA/.test(n) },
  tigeciclina: { label: 'Tigeciclina', test: (n) => /TIGECICLINA/.test(n) },
  polimixinas: { label: 'Colistina / polimixina B', test: (n) => /COLISTINA|POLIMIXINA/.test(n) },
  nitrofurantoina: { label: 'Nitrofurantoína', test: (n) => /NITROFURANTOINA/.test(n) },
  glicopeptidos: { label: 'Glicopéptidos (vancomicina, teicoplanina)', test: (n) => /VANCOMICINA|TEICOPLANINA|DALBAVANCINA|TELAVANCINA|ORITAVANCINA/.test(n) },
  vancomicina: { label: 'Vancomicina', test: (n) => /VANCOMICINA/.test(n) },
  fusidico: { label: 'Ácido fusídico', test: (n) => /FUSIDICO/.test(n) },
  macrolidos: { label: 'Macrólidos', test: (n) => /ERITROMICINA|AZITROMICINA|CLARITROMICINA/.test(n) },
  clindamicina: { label: 'Clindamicina', test: (n) => /CLINDAMICINA|LINCOMICINA/.test(n) },
  quinupristina: { label: 'Quinupristina-dalfopristina', test: (n) => /QUINUPRISTINA/.test(n) },
  rifampicina: { label: 'Rifampicina', test: (n) => /RIFAMPICINA|RIFAMPIN/.test(n) },
  linezolid: { label: 'Oxazolidinonas (linezolid)', test: (n) => /LINEZOLID|TEDIZOLID/.test(n) },
  novobiocina: { label: 'Novobiocina', test: (n) => /NOVOBIOCINA/.test(n) },
  fluconazol: { label: 'Fluconazol', test: (n) => /FLUCONAZOL/.test(n) },
  equinocandinas: { label: 'Equinocandinas', test: (n) => /ANIDULAFUNGINA|CASPOFUNGINA|MICAFUNGINA|REZAFUNGINA/.test(n) },
  anfotericina: { label: 'Anfotericina B', test: (n) => /ANFOTERICINA/.test(n) },
  nalidixico: { label: 'Ácido nalidíxico', test: (n) => /NALIDIXICO/.test(n) },
  tmpsmx: { label: 'Trimetoprim-sulfametoxazol', test: (n) => /TRIMET.*(SULFA|SMX)|SULFAMETOX.*TRIM|TMP.?SMX|COTRIMOXAZOL/.test(n) },
  gentnettobra: {
    label: 'Gentamicina / netilmicina / tobramicina',
    test: (n) => /GENTAMICINA|NETILMICINA|TOBRAMICINA/.test(n) && !/SINERG|ALTO NIVEL|HLAR|SYNERG/.test(n),
  },
  quinolonas: { label: 'Quinolonas', test: (n) => /CIPROFLOXACINA|LEVOFLOXACINA|MOXIFLOXACINA|OFLOXACINA|NORFLOXACINA/.test(n) },
};

/** Reglas generales de EUCAST por tabla (aplican a todo organismo que las lista). */
const GENERAL = {
  enterobacterales: 'penicilina glicopeptidos fusidico linezolid clindamicina rifampicina quinupristina',
  noFermentadores: 'penicilina cef1 cefoxitina cefuroxima glicopeptidos fusidico macrolidos clindamicina quinupristina rifampicina linezolid',
  gramnegOtros: 'glicopeptidos clindamicina linezolid',
  grampos: 'aztreonam polimixinas nalidixico',
};
const ENTERO_PEND = [['Macrólidos', 'EUCAST: resistentes con excepciones (azitromicina en fiebre tifoidea, eritromicina en diarrea del viajero)']];
const ANAEROBIO_PEND = [['Aztreonam, aminoglucósidos, colistina, ác. nalidíxico', 'EUCAST dice "usualmente resistentes" para anaerobios, no una regla por especie']];

// Atajo: [alias[], antibióticos específicos, reglas generales, pendientes]
const E = 'enterobacterales';
const NF = 'noFermentadores';
const GN = 'gramnegOtros';
const GP = 'grampos';
const AMPC = 'ampamox amoxclav ampsulb cef1 cefoxitina'; // C. freundii, E. cloacae complex, K. aerogenes
const PROTEEAE = 'tetraciclinas polimixinas nitrofurantoina';
const ORGANISMOS = [
  // Tabla 1 — Enterobacterales y Aeromonas (reglas 1.1–1.25)
  [['CITROBACTER KOSERI', 'CITROBACTER AMALONATICUS', 'CITROBACTER SEDLAKII', 'CITROBACTER FARMERI', 'CITROBACTER RODENTIUM'], 'ampamox ticarcilina', E, ENTERO_PEND],
  [['CITROBACTER FREUNDII', 'CITROBACTER BRAAKII', 'CITROBACTER MURLINIAE', 'CITROBACTER WERKMANII', 'CITROBACTER YOUNGAE'], AMPC, E, ENTERO_PEND],
  [['ENTEROBACTER'], AMPC, E, ENTERO_PEND],
  [['ENTEROBACTER AEROGENES', 'KLEBSIELLA AEROGENES'], AMPC, E, ENTERO_PEND],
  [['ESCHERICHIA HERMANNII'], 'ampamox ticarcilina', E, ENTERO_PEND],
  [['ESCHERICHIA', 'SALMONELLA', 'SHIGELLA'], '', E, ENTERO_PEND],
  [['HAFNIA ALVEI'], 'ampamox amoxclav polimixinas', E, ENTERO_PEND],
  [['KLEBSIELLA', 'KLEBSIELLA PNEUMONIAE', 'KLEBSIELLA OXYTOCA', 'KLEBSIELLA VARIICOLA', 'KLEBSIELLA QUASIPNEUMONIAE', 'RAOULTELLA'], 'ampamox ticarcilina', E, ENTERO_PEND],
  [['LECLERCIA ADECARBOXYLATA'], 'fosfomicina', E, ENTERO_PEND],
  [['MORGANELLA'], 'ampamox amoxclav ampsulb cef1 ' + PROTEEAE, E, ENTERO_PEND],
  [['PLESIOMONAS SHIGELLOIDES'], 'ampamox amoxclav ampsulb', E, ENTERO_PEND],
  [['PROTEUS MIRABILIS'], PROTEEAE, E, ENTERO_PEND],
  [['PROTEUS PENNERI', 'PROTEUS VULGARIS'], 'ampamox cef1 cefuroxima ' + PROTEEAE, E, ENTERO_PEND],
  [['PROVIDENCIA'], 'ampamox amoxclav ampsulb cef1 ' + PROTEEAE, E, ENTERO_PEND],
  [['SERRATIA MARCESCENS'], 'ampamox amoxclav ampsulb cef1 cefoxitina cefuroxima polimixinas nitrofurantoina', E, ENTERO_PEND],
  [['YERSINIA ENTEROCOLITICA'], 'ampamox amoxclav ampsulb ticarcilina cef1 cefoxitina', E, ENTERO_PEND],
  [['YERSINIA PSEUDOTUBERCULOSIS'], 'polimixinas', E, ENTERO_PEND],
  [['AEROMONAS', 'AEROMONAS CAVIAE'], 'ampamox ampsulb', E, ENTERO_PEND],
  [['AEROMONAS HYDROPHILA'], 'ampamox ampsulb', E, ENTERO_PEND],
  [['AEROMONAS VERONII', 'AEROMONAS JANDAEI'], 'ampamox ampsulb ticarcilina', E, ENTERO_PEND],
  [['AEROMONAS DHAKENSIS'], 'ampamox ampsulb cefoxitina', E, ENTERO_PEND],

  // Tabla 2 — no fermentadores
  [
    ['ACINETOBACTER BAUMANNII', 'ACINETOBACTER PITTII', 'ACINETOBACTER NOSOCOMIALIS'],
    'ampamox amoxclav cefotriax aztreonam ertapenem trimetoprim fosfomicina',
    NF,
    [
      ['Ampicilina-sulbactam', 'EUCAST nota: A. baumannii puede salir S por la actividad del sulbactam'],
      ['Tetraciclinas / tigeciclina', 'EUCAST: R a tetraciclina y doxiciclina, menos a minociclina y tigeciclina; resultados clínicos variables'],
    ],
  ],
  [['ACHROMOBACTER XYLOSOXIDANS'], 'ampamox aztreonam', NF, []],
  [
    ['BURKHOLDERIA CEPACIA'],
    'ampamox amoxclav ampsulb ticarcilina ticarclav pip piptazo cefotriax aztreonam ertapenem cipro cloranfenicol aminoglucosidos trimetoprim fosfomicina polimixinas',
    NF,
    [['Algunos β-lactámicos', 'EUCAST nota: algunas cepas salen S in vitro pero son clínicamente resistentes']],
  ],
  [['PSEUDOMONAS AERUGINOSA'], 'ampamox amoxclav ampsulb cefotriax ertapenem cloranfenicol kananeo trimetoprim tetraciclinas tigeciclina', NF, []],
  [['STENOTROPHOMONAS MALTOPHILIA'], 'ampamox amoxclav ampsulb ticarcilina pip piptazo cefotriax aztreonam carbapenemicos aminoglucosidos trimetoprim fosfomicina tetraciclina', NF, []],

  // Tabla 3 — otros gramnegativos
  [['HAEMOPHILUS INFLUENZAE'], 'fusidico', GN, []],
  [['MORAXELLA CATARRHALIS', 'NEISSERIA'], 'trimetoprim', GN, []],

  // Tabla 4 — grampositivos
  [['STAPHYLOCOCCUS'], 'ceftazidima', GP, []],
  [['STAPHYLOCOCCUS SAPROPHYTICUS'], 'ceftazidima fusidico fosfomicina novobiocina', GP, []],
  [['STAPHYLOCOCCUS COHNII', 'STAPHYLOCOCCUS XYLOSUS'], 'ceftazidima novobiocina', GP, []],
  [['STAPHYLOCOCCUS CAPITIS'], 'ceftazidima fosfomicina', GP, []],
  [['STREPTOCOCCUS'], 'fusidico ceftazidima aminoglucosidos', GP, []],
  [['ENTEROCOCCUS FAECALIS'], 'fusidico ceftazidima cefalosporinas aminoglucosidos macrolidos clindamicina quinupristina sulfonamidas', GP, []],
  [['ENTEROCOCCUS GALLINARUM', 'ENTEROCOCCUS CASSELIFLAVUS'], 'fusidico ceftazidima cefalosporinas aminoglucosidos macrolidos clindamicina quinupristina vancomicina sulfonamidas', GP, []],
  [['ENTEROCOCCUS FAECIUM'], 'fusidico ceftazidima cefalosporinas aminoglucosidos macrolidos sulfonamidas', GP, []],
  [['CORYNEBACTERIUM'], 'fosfomicina', GP, []],
  [['LISTERIA MONOCYTOGENES'], 'ceftazidima cefalosporinas', GP, []],
  [['LEUCONOSTOC', 'PEDIOCOCCUS', 'LACTOBACILLUS CASEI', 'LACTOBACILLUS RHAMNOSUS'], 'glicopeptidos', GP, []],

  // Hongos — EUCAST AFST v12.1, celdas "-"
  [['CANDIDA KRUSEI', 'PICHIA KUDRIAVZEVII'], 'fluconazol', '', [], FUNGI_SOURCE],
  [['CANDIDA AURIS'], '', '', [['Fluconazol', 'EUCAST: sin datos para recomendar fluconazol; la mayoría tiene CMI >16, no es regla fija']], FUNGI_SOURCE],
  [['CRYPTOCOCCUS NEOFORMANS'], 'equinocandinas', '', [], FUNGI_SOURCE],
  [['ASPERGILLUS'], 'fluconazol', '', [], FUNGI_SOURCE],
  [['ASPERGILLUS FLAVUS', 'ASPERGILLUS NIDULANS', 'ASPERGILLUS TERREUS'], 'fluconazol anfotericina', '', [], FUNGI_SOURCE],

  // Tabla 5 — anaerobios
  [['CLOSTRIDIUM RAMOSUM', 'CLOSTRIDIUM INNOCUUM'], 'vancomicina', '', ANAEROBIO_PEND],
  [['BACTEROIDES'], '', '', ANAEROBIO_PEND],
];

// CLSI M100-Ed36, Apéndice B. Misma forma que ORGANISMOS: [alias[], antibióticos, regla general, pendientes].
// Las reglas generales son las notas de cada tabla de CLSI (Enterobacterales, no fermentadores, grampositivos).
const GENERAL_CLSI = {
  enterobacterales: 'glicopeptidos fusidico linezolid clindamicina rifampicina quinupristina',
  noFermentadores: GENERAL.noFermentadores,
  grampos: GENERAL.grampos,
};
const IMIPENEM_PEND = [['Imipenem', 'CLSI nota d: Proteus, Providencia y Morganella pueden tener CMI altas sin carbapenemasa. Si sale S, se informa S']];
const CLSI_AMPC = 'ampamox amoxclav ampsulb cef1 cefoxitina';
const CLSI_PROTEEAE = 'tetraciclinas tigeciclina nitrofurantoina polimixinas';
const CLSI = [
  // B1 — Enterobacterales
  [['CITROBACTER FREUNDII'], CLSI_AMPC + ' cefuroxima', E, []],
  [['CITROBACTER KOSERI', 'CITROBACTER AMALONATICUS', 'CITROBACTER FARMERI', 'CITROBACTER SEDLAKII'], 'ampamox ticarcilina', E, []],
  [['ENTEROBACTER CLOACAE', 'ENTEROBACTER ASBURIAE', 'ENTEROBACTER HORMAECHEI', 'KLEBSIELLA AEROGENES', 'ENTEROBACTER AEROGENES'], CLSI_AMPC, E, []],
  [['ESCHERICHIA COLI'], '', E, []],
  [['ESCHERICHIA HERMANNII'], 'ampamox ticarcilina', E, []],
  [['HAFNIA ALVEI'], CLSI_AMPC + ' polimixinas', E, []],
  [['HAFNIA PARALVEI'], 'polimixinas', E, []],
  [['KLEBSIELLA PNEUMONIAE', 'KLEBSIELLA OXYTOCA', 'KLEBSIELLA VARIICOLA', 'RAOULTELLA'], 'ampamox ticarcilina', E, []],
  [['MORGANELLA MORGANII'], 'ampamox amoxclav cef1 cefuroxima tigeciclina nitrofurantoina polimixinas', E, IMIPENEM_PEND],
  [['PROTEUS MIRABILIS'], CLSI_PROTEEAE, E, IMIPENEM_PEND],
  [['PROTEUS PENNERI', 'PROTEUS VULGARIS'], 'ampamox cef1 cefuroxima ' + CLSI_PROTEEAE, E, IMIPENEM_PEND],
  [['PROVIDENCIA RETTGERI'], 'ampamox amoxclav cef1 ' + CLSI_PROTEEAE, E, IMIPENEM_PEND],
  [
    ['PROVIDENCIA STUARTII'],
    'ampamox amoxclav cef1 gentnettobra ' + CLSI_PROTEEAE,
    E,
    [...IMIPENEM_PEND, ['Amikacina', 'CLSI nota e: P. stuartii no es resistente natural a amikacina']],
  ],
  [
    ['SALMONELLA', 'SHIGELLA'],
    '',
    E,
    [['Aminoglucósidos, cefalosporinas 1.ª y 2.ª gen, cefamicinas', 'CLSI: pueden salir S in vitro pero no sirven en la clínica. No informar como S']],
  ],
  [['SERRATIA MARCESCENS'], CLSI_AMPC + ' cefuroxima nitrofurantoina polimixinas', E, []],
  [['YERSINIA ENTEROCOLITICA'], 'ampamox amoxclav ticarcilina cef1', E, []],

  // B2 — no fermentadores
  [['ACINETOBACTER BAUMANNII', 'ACINETOBACTER CALCOACETICUS'], 'ampamox amoxclav aztreonam ertapenem trimetoprim cloranfenicol fosfomicina', NF, []],
  [
    ['BURKHOLDERIA CEPACIA'],
    'ampamox pip ticarcilina ampsulb amoxclav ertapenem polimixinas fosfomicina',
    NF,
    [['Piperacilina-tazobactam, cefotaxima, ceftriaxona, cefepima, aztreonam, imipenem, aminoglucósidos, trimetoprim', 'CLSI nota a: no se puede confirmar la resistencia natural; hay cepas S in vitro']],
  ],
  [['PSEUDOMONAS AERUGINOSA'], 'ampamox ampsulb amoxclav cefotriax ertapenem tetraciclinas tigeciclina trimetoprim tmpsmx cloranfenicol', NF, []],
  [
    ['STENOTROPHOMONAS MALTOPHILIA'],
    'ampamox pip ticarcilina ampsulb amoxclav piptazo cefotriax aztreonam carbapenemicos aminoglucosidos trimetoprim fosfomicina tetraciclina',
    NF,
    [],
  ],

  // B3 — Staphylococcus (S. aureus, lugdunensis, epidermidis, haemolyticus: sin resistencia natural, solo la nota general)
  [['STAPHYLOCOCCUS AUREUS', 'STAPHYLOCOCCUS LUGDUNENSIS', 'STAPHYLOCOCCUS EPIDERMIDIS', 'STAPHYLOCOCCUS HAEMOLYTICUS'], '', GP, []],
  [['STAPHYLOCOCCUS SAPROPHYTICUS'], 'novobiocina fosfomicina fusidico', GP, []],
  [['STAPHYLOCOCCUS CAPITIS'], 'fosfomicina', GP, []],
  [['STAPHYLOCOCCUS COHNII', 'STAPHYLOCOCCUS XYLOSUS'], 'novobiocina', GP, []],

  // B4 — Enterococcus (nota a: pueden salir S in vitro, no se informan S)
  [['ENTEROCOCCUS FAECALIS'], 'cefalosporinas aminoglucosidos clindamicina quinupristina trimetoprim tmpsmx fusidico', GP, []],
  [['ENTEROCOCCUS FAECIUM'], 'cefalosporinas aminoglucosidos clindamicina trimetoprim tmpsmx fusidico', GP, []],
  [['ENTEROCOCCUS GALLINARUM', 'ENTEROCOCCUS CASSELIFLAVUS'], 'cefalosporinas vancomicina aminoglucosidos clindamicina quinupristina trimetoprim tmpsmx fusidico', GP, []],

  // B5 y B6 — anaerobios
  [['CLOSTRIDIUM', 'CLOSTRIDIOIDES'], 'aminoglucosidos', '', []],
  [['CLOSTRIDIUM INNOCUUM'], 'vancomicina aminoglucosidos', '', []],
  [['BACTEROIDES'], 'aminoglucosidos penicilina ampamox', '', []],
  [['FUSOBACTERIUM CANIFELINUM'], 'aminoglucosidos quinolonas', '', []],
];

const words = (s) => (s ? s.split(' ').filter(Boolean) : []);

// «E. coli» → «ESCHERICHIA COLI». Se arma desde los alias de dos palabras + algunas especies comunes
// cuyo alias es solo el género.
const ABREV = new Map(
  [
    ...[...ORGANISMOS, ...CLSI].flatMap((o) => o[0]).filter((a) => a.includes(' ')),
    'ESCHERICHIA COLI', 'STAPHYLOCOCCUS AUREUS', 'STAPHYLOCOCCUS EPIDERMIDIS', 'STAPHYLOCOCCUS HAEMOLYTICUS',
    'STAPHYLOCOCCUS HOMINIS', 'STREPTOCOCCUS PNEUMONIAE', 'STREPTOCOCCUS PYOGENES', 'STREPTOCOCCUS AGALACTIAE',
    'MORGANELLA MORGANII', 'ENTEROBACTER CLOACAE',
  ].map((a) => [a.replace(/^(\w)\w*\s+/, '$1 '), a])
);

function findIn(lista, organismo) {
  let n = norm(organismo).replace(/^[^A-Z]+/, '');
  const m = n.match(/^([A-Z])\.?\s+([A-Z]+)(.*)$/);
  if (m && ABREV.has(m[1] + ' ' + m[2])) n = ABREV.get(m[1] + ' ' + m[2]) + m[3];
  if (!n) return null;
  let best = null;
  let bestLen = 0;
  for (const o of lista) {
    for (const a of o[0]) {
      if ((n === a || n.startsWith(a + ' ')) && a.length > bestLen) {
        best = o;
        bestLen = a.length;
      }
    }
  }
  return best;
}

const tag = (src) => (/CLSI/.test(src) ? 'clsi' : 'eucast');

const idsOf = (o, general) => (o ? new Set([...words(o[1]), ...words(general[o[2]])]) : new Set());

/**
 * Antibióticos con resistencia esperada para el organismo. [] si no se conoce.
 * CLSI manda: si CLSI lista al organismo, solo sus celdas "R" marcan (y se cita EUCAST si coincide).
 * Lo que solo EUCAST espera pasa a `intrinsicPendingFor`. Si CLSI no lista al organismo, vale EUCAST.
 */
export function intrinsicResistancesFor(organismo) {
  const c = findIn(CLSI, organismo);
  const e = findIn(ORGANISMOS, organismo);
  const eSrc = e && e[4] ? e[4] : INTRINSIC_SOURCE;
  const ci = idsOf(c, GENERAL_CLSI);
  const ei = idsOf(e, GENERAL);
  const fuentes = new Map();
  if (c) ci.forEach((id) => fuentes.set(id, ei.has(id) ? [CLSI_SOURCE, eSrc] : [CLSI_SOURCE]));
  else ei.forEach((id) => fuentes.set(id, [eSrc]));
  return [...fuentes].map(([id, f]) => ({ id, atb: ATB[id].label, estado: f.map(tag).join('+'), fuentes: f, fuente: f.join('; ') }));
}

/** true si EUCAST pone al organismo en el grupo AmpC cromosómico (C. freundii y afines, Enterobacter, K. aerogenes). */
export function isAmpcOrganism(organismo) {
  const o = findIn(ORGANISMOS, organismo);
  return !!o && o[1] === AMPC;
}

/** Casos que la fuente no da como regla exacta. No marcan nada; la UI futura puede mostrarlos como "ver". */
export function intrinsicPendingFor(organismo) {
  const c = findIn(CLSI, organismo);
  const e = findIn(ORGANISMOS, organismo);
  const ci = idsOf(c, GENERAL_CLSI);
  const soloEucast = c ? [...idsOf(e, GENERAL)].filter((id) => !ci.has(id)).map((id) => [ATB[id].label, 'EUCAST espera R; CLSI no la lista. No marca']) : [];
  return [...(c ? c[3] : []), ...soloEucast, ...(e ? e[3] : [])].map(([atb, nota]) => ({ atb, nota, estado: 'pendiente' }));
}

/**
 * Antibióticos reportados "S" que son intrínsecamente resistentes → posible error de identificación.
 * sensRows: [{ med, mic, interp }] (formato sensCrudas).
 */
export function flagImpossibleSusceptible(organismo, sensRows) {
  return intrinsicMatchesIn(organismo, sensRows)
    .filter((h) => classifyAtbInterp(h.row.interp) === 's')
    .map((h) => ({ med: h.row.med, abbr: abreviarAbAtb_(h.row.med), mic: h.row.mic || '', interp: h.row.interp, clase: h.clase, fuente: h.fuente }));
}

/** Filas del antibiograma que son resistentes por especie (EUCAST y/o CLSI), con cualquier resultado. [{ row, clase, fuente, fuentes, estado }] */
export function intrinsicMatchesIn(organismo, sensRows) {
  const res = intrinsicResistancesFor(organismo);
  if (!res.length || !sensRows || !sensRows.length) return [];
  const out = [];
  for (const s of sensRows) {
    const n = norm(s.med);
    const hit = res.find((r) => ATB[r.id].test(n));
    if (hit) out.push({ row: s, clase: hit.atb, fuente: hit.fuente, fuentes: hit.fuentes, estado: hit.estado });
  }
  return out;
}
