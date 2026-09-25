import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  soapMedCategorySegment,
  assembleSoapLines,
  buildNmClause,
} from './estado-actual-text-build.mjs';

describe('soapMedCategorySegment bold', () => {
  it('wraps a real value in markdown bold only when opts.bold is set', () => {
    assert.equal(soapMedCategorySegment('SEDACION', 'PROPOFOL'), 'SEDACION: PROPOFOL');
    assert.equal(soapMedCategorySegment('SEDACION', 'PROPOFOL', { bold: true }), 'SEDACION: **PROPOFOL**');
  });

  it('never bolds the NINGUNO fallback', () => {
    assert.equal(
      soapMedCategorySegment('VASOPRESORES', '', { always: true, bold: true }),
      'VASOPRESORES: NINGUNO'
    );
  });
});

describe('assembleSoapLines bold', () => {
  const ec = { four: 15, esferas: 3, vasop: 'NORADRENALINA', abx: 'CEFTRIAXONA' };
  const v = { fr: 18, sat: 96, tas: 120, tad: 80, fc: 78, temp: 37 };

  it('stays plain by default', () => {
    const lines = assembleSoapLines(ec, v, '', 'TEMPERATURA 37 °C', 'DIETA X');
    assert.match(lines[0], /^N: /);
    assert.doesNotMatch(lines.join('\n'), /\*\*/);
  });

  it('bolds zone labels, vitals and meds when opts.bold is set', () => {
    const lines = assembleSoapLines(ec, v, '', 'TEMPERATURA 37 °C', 'DIETA X', { bold: true });
    assert.match(lines[0], /^\*\*N:\*\* /);
    assert.match(lines[1], /FR \*\*18 RPM\*\*/);
    assert.match(lines[2], /TA \*\*120\/80 MMHG\*\*, FC \*\*78 LPM\*\*/);
    assert.match(lines[2], /VASOPRESORES: \*\*NORADRENALINA\*\*/);
    assert.match(lines[3], /\*\*TEMPERATURA 37 °C\*\*/);
    assert.match(lines[3], /ANTIBIOTICOTERAPIA: \*\*CEFTRIAXONA\*\*/);
  });
});

describe('buildNmClause bold', () => {
  it('bolds the insulin and bomba segments only when requested', () => {
    const ec = { nm: 'HEPARINA' };
    const plain = buildNmClause(ec, '', {}, null, [], [{ value: 4, units: 6 }], { bombaAlgoritmo: 2 });
    const bold = buildNmClause(ec, '', {}, null, [], [{ value: 4, units: 6 }], {
      bombaAlgoritmo: 2,
      bold: true,
    });
    assert.doesNotMatch(plain, /\*\*/);
    assert.match(bold, /\*\*BOMBA DE INSULINA EN ALGORITMO 2 \(4 \(6 U\)\)\*\*/);
  });

  it('bolds each NM med separately, never the || separator between them', () => {
    const ec = { nm: 'ERITROPOYETINA 4000UI SC C/24H | SENOSIDOS A-B 8.6MG VO C/8H' };
    const bold = buildNmClause(ec, '', {}, null, [], [], { bold: true });
    assert.match(bold, /\*\*ERITROPOYETINA 4000UI SC C\/24H\*\* \|\| \*\*SENOSIDOS A-B 8\.6MG VO C\/8H\*\*/);
  });
});
