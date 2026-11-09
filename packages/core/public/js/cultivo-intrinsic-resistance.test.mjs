import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  INTRINSIC_SOURCE,
  CLSI_SOURCE,
  intrinsicResistancesFor,
  intrinsicPendingFor,
  flagImpossibleSusceptible,
  isAmpcOrganism,
  intrinsicMatchesIn,
} from './cultivo-intrinsic-resistance.mjs';

const ids = (o) => intrinsicResistancesFor(o).map((r) => r.id);
const flagged = (o, rows) => flagImpossibleSusceptible(o, rows).map((f) => f.abbr || f.med);

test('fuente: EUCAST v1.2 enero 2023', () => {
  assert.match(INTRINSIC_SOURCE, /EUCAST.*v1\.2.*2023/);
  assert.equal(intrinsicResistancesFor('CITROBACTER BRAAKII')[0].fuente, INTRINSIC_SOURCE); // sin fila CLSI → EUCAST
  assert.deepEqual(intrinsicResistancesFor('KLEBSIELLA PNEUMONIAE')[0].fuentes, [CLSI_SOURCE, INTRINSIC_SOURCE]); // CLSI primero
});

test('CLSI M100-Ed36: fuente, estado y organismos que solo CLSI lista', () => {
  assert.match(CLSI_SOURCE, /CLSI M100.*36.*2026.*Apéndice B/);
  const r = (o, id) => intrinsicResistancesFor(o).find((x) => x.id === id);
  assert.equal(r('KLEBSIELLA PNEUMONIAE', 'ampamox').estado, 'clsi+eucast');
  assert.deepEqual(r('KLEBSIELLA PNEUMONIAE', 'ampamox').fuentes, [CLSI_SOURCE, INTRINSIC_SOURCE]);
  assert.equal(r('CITROBACTER FREUNDII', 'cefuroxima').estado, 'clsi');
  assert.equal(r('PSEUDOMONAS AERUGINOSA', 'tmpsmx').fuente, CLSI_SOURCE);
  assert.equal(r('PSEUDOMONAS AERUGINOSA', 'kananeo'), undefined); // solo EUCAST → pendiente
  assert.ok(intrinsicPendingFor('PSEUDOMONAS AERUGINOSA').some((p) => /Kanamicina/.test(p.atb) && /EUCAST espera R; CLSI no/.test(p.nota)));
  assert.ok(ids('BACTEROIDES FRAGILIS').includes('penicilina'));
  assert.ok(ids('FUSOBACTERIUM CANIFELINUM').includes('quinolonas'));
  assert.ok(ids('CLOSTRIDIOIDES DIFFICILE').includes('aminoglucosidos'));
  assert.ok(ids('PROVIDENCIA STUARTII').includes('gentnettobra'));
  assert.ok(!ids('PROVIDENCIA RETTGERI').includes('gentnettobra'));
  assert.ok(ids('MORGANELLA MORGANII').includes('tigeciclina'));
  assert.ok(!ids('MORGANELLA MORGANII').includes('ampsulb') || r('MORGANELLA MORGANII', 'ampsulb').estado === 'eucast');
  assert.ok(intrinsicPendingFor('BURKHOLDERIA CEPACIA').some((p) => /CLSI/.test(p.nota)));
  assert.ok(intrinsicPendingFor('PROTEUS MIRABILIS').some((p) => /imipenem/i.test(p.atb)));
  assert.ok(intrinsicPendingFor('SALMONELLA ENTERICA').length > 0);
});

test('organismos: alias en español, mayúsculas y acentos', () => {
  assert.ok(ids('Klebsiella pneumoniae').includes('ampamox'));
  assert.ok(ids('KLEBSIELLA PNEUMONIAE').includes('ticarcilina'));
  assert.ok(!ids('KLEBSIELLA PNEUMONIAE').includes('amoxclav'));
  assert.ok(ids('KLEBSIELLA AEROGENES').includes('cefoxitina'));
  assert.ok(ids('ENTEROBACTER CLOACAE').includes('cef1'));
  assert.ok(ids('PROTEUS MIRABILIS').includes('polimixinas'));
  assert.ok(!ids('PROTEUS MIRABILIS').includes('ampamox'));
  assert.ok(ids('SERRATIA MARCESCENS').includes('cefuroxima'));
  assert.deepEqual(ids('ALGO DESCONOCIDO'), []);
  assert.deepEqual(ids(''), []);
  assert.deepEqual(ids('PSEUDOMONAS PUTIDA'), []);
});

test('E. coli: solo reglas generales de Enterobacterales', () => {
  assert.ok(ids('ESCHERICHIA COLI').includes('glicopeptidos'));
  assert.ok(!ids('ESCHERICHIA COLI').includes('ampamox'));
  assert.ok(ids('ESCHERICHIA HERMANNII').includes('ampamox'));
});

test('S. maltophilia: quinolonas NO son resistencia esperada; TMP solo sí', () => {
  const i = ids('STENOTROPHOMONAS MALTOPHILIA');
  assert.ok(!i.includes('cipro') && !i.includes('ticarclav') && !i.includes('ceftazidima'));
  assert.ok(i.includes('carbapenemicos') && i.includes('aminoglucosidos') && i.includes('trimetoprim'));
  const f = flagged('STENOTROPHOMONAS MALTOPHILIA', [
    { med: 'LEVOFLOXACINA', interp: 'S' },
    { med: 'TRIMETOPRIM/SULFAMETOXAZOL', interp: 'S' },
    { med: 'MEROPENEM', interp: 'S' },
    { med: 'FOSFOMICINA', interp: 'S' },
    { med: 'TETRACICLINA', interp: 'S' },
    { med: 'DOXICICLINA', interp: 'S' },
    { med: 'MINOCICLINA', interp: 'S' },
  ]);
  assert.deepEqual(f, ['MERO', 'FOSFOMICIN', 'TETRA']);
});

test('Pseudomonas: ceftazidima y cefepima no; ertapenem y TMP-SMX (CLSI) sí', () => {
  const rows = [
    { med: 'CEFTAZIDIMA', interp: 'S' },
    { med: 'ERTAPENEM', interp: 'S' },
    { med: 'TRIMETOPRIM/SULFAMETOXAZOL', interp: 'S' },
    { med: 'TETRACICLINA', interp: 'S' },
    { med: 'GENTAMICINA', interp: 'S' },
    { med: 'AMPICILINA', interp: 'S' },
  ];
  assert.deepEqual(flagged('PSEUDOMONAS AERUGINOSA', rows), ['ERTA', 'TMP/SMX', 'TETRA', 'AMP']);
});

test('Acinetobacter: ampicilina-sulbactam queda como nota, no marca', () => {
  const rows = [{ med: 'AMPICILINA/SULBACTAM', interp: 'S' }, { med: 'CEFTRIAXONA', interp: 'S' }];
  assert.deepEqual(flagged('ACINETOBACTER BAUMANNII', rows), []); // ceftriaxona: solo EUCAST
  assert.ok(intrinsicPendingFor('ACINETOBACTER BAUMANNII').some((p) => /ceftriaxona/i.test(p.atb)));
  assert.ok(intrinsicPendingFor('ACINETOBACTER BAUMANNII').some((p) => /sulbactam/i.test(p.atb)));
});

test('Enterococcus: faecalis vs faecium; TMP-SMX marca (CLSI); sinergia no cuenta', () => {
  const rows = [
    { med: 'CEFTRIAXONA', interp: 'S' },
    { med: 'CLINDAMICINA', interp: 'S' },
    { med: 'TRIMETOPRIM/SULFAMETOXAZOL', interp: 'S' },
    { med: 'GENT. SINERGIA', interp: 'S' },
    { med: 'GENTAMICINA', interp: 'S' },
    { med: 'OXACILINA', interp: 'S' },
  ];
  assert.deepEqual(flagged('ENTEROCOCCUS FAECALIS', rows), ['CFTX', 'CLINDA', 'TMP/SMX', 'GENT']);
  assert.deepEqual(flagged('ENTEROCOCCUS FAECIUM', rows), ['CFTX', 'CLINDA', 'TMP/SMX', 'GENT']);
  assert.deepEqual(flagged('ENTEROCOCCUS GALLINARUM', [{ med: 'VANCOMICINA', interp: 'S' }]), ['VANCO']);
  assert.deepEqual(flagged('ENTEROCOCCUS FAECALIS', [{ med: 'VANCOMICINA', interp: 'S' }]), []);
});

test('Staphylococcus: ceftazidima y aztreonam; saprophyticus suma novobiocina', () => {
  const rows = [{ med: 'CEFTAZIDIMA', interp: 'S' }, { med: 'NOVOBIOCINA', interp: 'S' }, { med: 'OXACILINA', interp: 'S' }];
  assert.deepEqual(flagged('STAPHYLOCOCCUS AUREUS', rows), []); // ceftazidima: solo EUCAST
  assert.deepEqual(flagged('STAPHYLOCOCCUS HOMINIS', rows), ['CAZ']); // sin fila CLSI → EUCAST
  assert.deepEqual(flagged('STAPHYLOCOCCUS SAPROPHYTICUS', rows), ['NOVOBIOCIN']);
});

test('Listeria: todas las cefalosporinas', () => {
  assert.deepEqual(flagged('LISTERIA MONOCYTOGENES', [{ med: 'CEFTRIAXONA', interp: 'S' }, { med: 'AMPICILINA', interp: 'S' }]), ['CFTX']);
});

test('hongos: AFST v12.1, celdas "-"', () => {
  assert.deepEqual(flagged('CANDIDA KRUSEI', [{ med: 'FLUCONAZOL', interp: 'S' }, { med: 'VORICONAZOL', interp: 'S' }]), ['FLUCONAZOL']);
  assert.deepEqual(flagged('CANDIDA ALBICANS', [{ med: 'FLUCONAZOL', interp: 'S' }]), []);
  assert.deepEqual(flagged('CRYPTOCOCCUS NEOFORMANS', [{ med: 'CASPOFUNGINA', interp: 'S' }, { med: 'ANFOTERICINA B', interp: 'S' }]), ['CASPOFUNGI']);
  assert.deepEqual(flagged('ASPERGILLUS TERREUS', [{ med: 'ANFOTERICINA B', interp: 'S' }]), ['ANFOTERICI']);
  assert.deepEqual(flagged('ASPERGILLUS FUMIGATUS', [{ med: 'ANFOTERICINA B', interp: 'S' }]), []);
  assert.match(intrinsicResistancesFor('CANDIDA KRUSEI')[0].fuente, /AFST/);
  assert.ok(intrinsicPendingFor('CANDIDA AURIS').length > 0);
  assert.deepEqual(ids('CANDIDA AURIS'), []);
});

test('isAmpcOrganism: grupo AmpC de EUCAST', () => {
  for (const o of ['ENTEROBACTER CLOACAE', 'KLEBSIELLA AEROGENES', 'ENTEROBACTER AEROGENES', 'CITROBACTER FREUNDII']) {
    assert.equal(isAmpcOrganism(o), true, o);
  }
  for (const o of ['ESCHERICHIA COLI', 'KLEBSIELLA PNEUMONIAE', 'CITROBACTER KOSERI', 'PSEUDOMONAS AERUGINOSA', '', 'DESCONOCIDO']) {
    assert.equal(isAmpcOrganism(o), false, o);
  }
});

test('nombres como los escribe el laboratorio: abreviados, mayúsculas/minúsculas, sufijos, ruido', () => {
  const amp = [{ med: 'AMPICILINA', interp: 'S' }];
  for (const o of ['K. pneumoniae', 'K pneumoniae', 'Klebsiella pneumoniae ssp pneumoniae', 'KLEBSIELLA PNEUMONIAE BLEE', '  *Klebsiella pneumoniae (BLEE)', 'klebsiella  pneumoniae']) {
    assert.deepEqual(flagged(o, amp), ['AMP'], o);
  }
  assert.equal(isAmpcOrganism('E. cloacae'), true);
  assert.equal(isAmpcOrganism('Enterobacter cloacae complex'), true);
  assert.equal(isAmpcOrganism('E. coli'), false);
  assert.ok(ids('E. coli').includes('glicopeptidos'));
  assert.ok(ids('P. aeruginosa').includes('ertapenem'));
  assert.ok(ids('P. mirabilis').includes('polimixinas'));
  assert.ok(!ids('S. aureus').includes('ceftazidima') && ids('S. aureus').includes('aztreonam'));
  assert.ok(ids('Staphylococcus coagulasa negativa').includes('ceftazidima'));
  assert.ok(ids('E. faecalis').includes('quinupristina'));
  assert.ok(ids('E. faecium').includes('cefalosporinas'));
  assert.ok(ids('A. baumannii').includes('ertapenem'));
  assert.ok(ids('S. maltophilia').includes('carbapenemicos'));
  assert.ok(ids('S. marcescens').includes('cefuroxima'));
  assert.ok(ids('C. krusei').includes('fluconazol'));
  assert.deepEqual(ids('E. xyz'), []);
  assert.deepEqual(ids('Negativo'), []);
  assert.deepEqual(ids('—'), []);
});

test('R o I no se marcan; entradas vacías', () => {
  assert.deepEqual(flagged('KLEBSIELLA PNEUMONIAE', [{ med: 'AMPICILINA', interp: 'R' }, { med: 'AMPICILINA', interp: 'I' }]), []);
  assert.deepEqual(flagImpossibleSusceptible('KLEBSIELLA PNEUMONIAE', []), []);
  assert.deepEqual(flagImpossibleSusceptible('KLEBSIELLA PNEUMONIAE', null), []);
  const k = flagImpossibleSusceptible('KLEBSIELLA PNEUMONIAE', [{ med: 'AMPICILINA', mic: '<=2', interp: 'S' }]);
  assert.equal(k[0].abbr, 'AMP');
});

test('Klebsiella: amoxi-clav S y ampicilina-sulbactam S no se marcan', () => {
  assert.deepEqual(
    flagged('KLEBSIELLA PNEUMONIAE', [{ med: 'AMOXICILINA/ACIDO CLAVULANICO', interp: 'S' }, { med: 'AMPICILINA/SULBACTAM', interp: 'S' }]),
    []
  );
});

test('intrinsicMatchesIn: devuelve las filas con cualquier resultado', () => {
  const amp = { med: 'AMPICILINA', interp: 'R' };
  const cip = { med: 'CIPROFLOXACINA', interp: 'S' };
  const hits = intrinsicMatchesIn('KLEBSIELLA PNEUMONIAE', [amp, cip]);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].row, amp);
  assert.deepEqual(intrinsicMatchesIn('ESCHERICHIA COLI', [amp]), []);
});
