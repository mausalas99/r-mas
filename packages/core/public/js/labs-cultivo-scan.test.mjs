import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  findCultivoGermenRuns,
  parseSensCrudasAntibiogramaGlued,
  parseSensCrudasAntibiogramaSlice,
  buildCultivoTipoDisplay,
  insertSpaceAfterCultivoKeyword_,
} from './labs-cultivo-scan.mjs';

// Real SOME (hospital lab portal) PDF text extraction glues each row with no
// separators: "MICROORGANISMO*Escherichia coli" and
// "ANTIBIOGRAMA*AMP/SULBACTAM16/8I" then "*AMIKACINA<=16S" per line.
var PDF_EXTRACT_LINES = [
  'UROCULTIVO POR SONDA',
  'PRODUCTO*',
  'MICROORGANISMO*Escherichia coli',
  'COMENTARIO:*',
  'CUENTA DE KASS*25,000 UFC/mL',
  'ANTIBIOGRAMA*AMP/SULBACTAM16/8I',
  '*AMIKACINA<=16S',
  '*AMPICILINA>16R',
  '*',
  'MICROORGANISMO*Enterococcus faecalis',
  'COMENTARIO:*',
  'CUENTA DE KASS*+100,000 UFC/mL',
  'ANTIBIOGRAMA*AMPICILINA<=2S',
  '*NITROFURANTOINA<=32S',
  '*PENICILINA8S',
  '*',
  'MICROORGANISMO*',
  'COMENTARIO:*',
];

describe('labs-cultivo-scan: glued PDF extraction format', () => {
  it('finds one run per organism even when MICROORGANISMO is glued to the germ name', () => {
    var runs = findCultivoGermenRuns(PDF_EXTRACT_LINES);
    assert.equal(runs.length, 2);
    assert.equal(runs[0].germen, 'ESCHERICHIA COLI');
    assert.equal(runs[1].germen, 'ENTEROCOCCUS FAECALIS');
  });

  it('does not spill the first organism run into the second', () => {
    var runs = findCultivoGermenRuns(PDF_EXTRACT_LINES);
    assert.equal(PDF_EXTRACT_LINES[runs[0].i1], 'MICROORGANISMO*Enterococcus faecalis');
  });

  it('parses glued antibiogram rows (name+mic+interp with no separators)', () => {
    var lineasAb = ['ANTIBIOGRAMAAMP/SULBACTAM16/8I', 'AMIKACINA<=16S', 'AMPICILINA>16R', ''];
    var sens = parseSensCrudasAntibiogramaGlued(lineasAb);
    assert.deepEqual(sens, [
      { med: 'AMP/SULBACTAM', mic: '16/8', interp: 'I' },
      { med: 'AMIKACINA', mic: '<=16', interp: 'S' },
      { med: 'AMPICILINA', mic: '>16', interp: 'R' },
    ]);
  });

  it('parses a name glued directly to a single-digit MIC (no comparison operator)', () => {
    var sens = parseSensCrudasAntibiogramaGlued(['ANTIBIOGRAMAPENICILINA8S']);
    assert.deepEqual(sens, [{ med: 'PENICILINA', mic: '8', interp: 'S' }]);
  });

  it('stops at the next MICROORGANISMO/COMENTARIO section', () => {
    var sens = parseSensCrudasAntibiogramaGlued([
      'ANTIBIOGRAMAAMPICILINA<=2S',
      'MICROORGANISMO',
      'NITROFURANTOINA<=32S',
    ]);
    assert.deepEqual(sens, [{ med: 'AMPICILINA', mic: '<=2', interp: 'S' }]);
  });

  it('the old tab-separated line-pair format still parses via the fallback', () => {
    var lineasAb = ['ANTIBIOGRAMA', '', 'AMIKACINA', '<=16\tS', ''];
    var sens = parseSensCrudasAntibiogramaSlice(lineasAb);
    assert.deepEqual(sens, [{ med: 'AMIKACINA', mic: '<=16', interp: 'S' }]);
  });
});

// Real SOME table-row format: the field label sits alone on its own line
// prefixed with a tab (e.g. "\tMICROORGANISMO\t"), and the germ name is a
// few lines further down. A leading tab used to make germenFromSameLine_
// wrongly treat "MICROORGANISMO" itself as the germ name instead of
// falling through to scan the following lines.
var TAB_LABEL_LINES = [
  'UROCULTIVO POR SONDA',
  'PRODUCTO',
  '\tMICROORGANISMO\t',
  '*',
  'Escherichia coli',
  'COMENTARIO:',
  '\tCUENTA DE KASS\t',
  '*',
  '25,000 UFC/mL',
];

describe('labs-cultivo-scan: tab-prefixed field-label format', () => {
  it('does not read the leading-tab MICROORGANISMO label itself as the germ name', () => {
    var runs = findCultivoGermenRuns(TAB_LABEL_LINES);
    assert.equal(runs.length, 1);
    assert.equal(runs[0].germen, 'ESCHERICHIA COLI');
  });
});

// Multi-organism report (e.g. raspado corneal con dos gérmenes) where PDF
// extraction glues two adjacent "MICROORGANISMO" table-cell labels onto the
// same line with only a tab between them, before the real germ name — the
// same-line check used to accept the second label itself as the germ,
// producing a run literally named "MICROORGANISMO".
var GLUED_DOUBLE_LABEL_LINES = [
  'RASPADO CORNEAL (MN OI)',
  'PRODUCTO',
  'MICROORGANISMO\tMICROORGANISMO',
  '*',
  'Salmonella enterica',
  'COMENTARIO:',
];

describe('labs-cultivo-scan: glued double MICROORGANISMO label', () => {
  it('falls through to the real germ name instead of returning the glued label', () => {
    var runs = findCultivoGermenRuns(GLUED_DOUBLE_LABEL_LINES);
    assert.equal(runs.length, 1);
    assert.equal(runs[0].germen, 'SALMONELLA ENTERICA');
  });
});

describe('labs-cultivo-scan: buildCultivoTipoDisplay keyword spacing', () => {
  it('inserts a space when the study keyword is glued to the next word', () => {
    assert.equal(buildCultivoTipoDisplay('UROCULTIVOPOR SONDA', ''), 'UROCULTIVO POR SONDA');
  });

  it('leaves already-spaced tipo lines untouched', () => {
    assert.equal(buildCultivoTipoDisplay('UROCULTIVO POR SONDA', ''), 'UROCULTIVO POR SONDA');
  });
});

describe('labs-cultivo-scan: insertSpaceAfterCultivoKeyword_ (exported, used by estado-actual render/table paths)', () => {
  it('inserts a space after the glued study keyword', () => {
    assert.equal(
      insertSpaceAfterCultivoKeyword_('UROCULTIVOPOR SONDA 16/08: KLEBSIELLA PNEUMONIAE'),
      'UROCULTIVO POR SONDA 16/08: KLEBSIELLA PNEUMONIAE'
    );
  });

  it('leaves an already-spaced line untouched', () => {
    var s = 'UROCULTIVO POR SONDA 16/08: KLEBSIELLA PNEUMONIAE';
    assert.equal(insertSpaceAfterCultivoKeyword_(s), s);
  });
});
