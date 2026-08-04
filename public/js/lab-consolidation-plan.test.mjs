import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLabConsolidationMergeJobs,
  buildManualLabConsolidationJobs,
  buildSameDateTimeLabMergeJobs,
  countAutoLabConsolidationMerges,
  findOutlierLabConsolidationGroups,
  labDayTipoGroupKey,
  labSetSectionSummary,
  listLabConsolidationCandidates,
  validateManualConsolidationGroup,
} from './lab-consolidation-plan.mjs';
import { LAB_CONSOLIDATION_WINDOW_MS } from './lab-consolidation-cluster.mjs';
import { isGasometriaOnlyResLabs } from './lab-history-format.mjs';

describe('lab-consolidation-plan — outliers y same-datetime', () => {
  it('findOutlierLabConsolidationGroups detecta mismo día con >2 h entre clusters', () => {
    var sets = [
      { id: 'a', day: '2026-6-12', tipo: 'labs', ms: 0 },
      { id: 'b', day: '2026-6-12', tipo: 'labs', ms: 5 * 60 * 60 * 1000 },
    ];
    var outliers = findOutlierLabConsolidationGroups(
      sets,
      function (s) {
        return s.day;
      },
      function (s) {
        return s.tipo;
      },
      function (s) {
        return s.ms;
      }
    );
    assert.equal(outliers.length, 1);
    assert.equal(outliers[0].clusters.length, 2);
    assert.equal(outliers[0].setCount, 2);
  });

  it('buildSameDateTimeLabMergeJobs une BH+GASES con QS+GASES misma hora', () => {
    var sets = [
      {
        id: '1',
        fecha: '03/08/2026',
        hora: '05:51',
        tipo: 'labs',
        resLabs: ['BH\tHb 9.42', 'GASES\tpH 7.32 pCO2 44 pO2 70 Lactato 0.8 Bica 22.7'],
      },
      {
        id: '2',
        fecha: '03/08/2026',
        hora: '05:51',
        tipo: 'labs',
        resLabs: [
          'QS\tGlu 73',
          'GASES\tpH 7.32 pCO2 44 pO2 70 Lactato 0.8 Bica 22.7 AG 11.5',
        ],
      },
    ];
    var jobs = buildSameDateTimeLabMergeJobs(
      sets,
      function (s) {
        return s.tipo;
      },
      function (s) {
        return isGasometriaOnlyResLabs(s.resLabs);
      }
    );
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].kind, 'same-datetime');
    assert.equal(jobs[0].sets.length, 2);
  });

  it('buildSameDateTimeLabMergeJobs no une gasos puros con valores distintos', () => {
    var sets = [
      {
        id: '1',
        fecha: '03/08/2026',
        hora: '05:51',
        tipo: 'gaso',
        resLabs: ['GASES\tpH 7.32 pCO2 44'],
      },
      {
        id: '2',
        fecha: '03/08/2026',
        hora: '05:51',
        tipo: 'gaso',
        resLabs: ['GASES\tpH 7.40 pCO2 30'],
      },
    ];
    var jobs = buildSameDateTimeLabMergeJobs(
      sets,
      function (s) {
        return s.tipo;
      },
      function (s) {
        return isGasometriaOnlyResLabs(s.resLabs);
      }
    );
    assert.equal(jobs.length, 0);
  });

  it('buildLabConsolidationMergeJobs auto solo une ≤2 h', () => {
    var sets = [
      { id: 'a', day: '2026-6-12', tipo: 'labs', ms: 0 },
      { id: 'b', day: '2026-6-12', tipo: 'labs', ms: 90 * 60 * 1000 },
      { id: 'c', day: '2026-6-12', tipo: 'labs', ms: 5 * 60 * 60 * 1000 },
    ];
    var jobs = buildLabConsolidationMergeJobs(
      sets,
      function (s) {
        return s.day;
      },
      function (s) {
        return s.tipo;
      },
      function (s) {
        return s.ms;
      },
      null
    );
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].kind, 'auto');
    assert.equal(jobs[0].sets.length, 2);
    assert.equal(countAutoLabConsolidationMerges(jobs), 1);
  });

  it('buildLabConsolidationMergeJobs no fusiona gasometrías seriadas', () => {
    var sets = [
      { id: 'a', day: '2026-6-12', tipo: 'gaso', ms: 0 },
      { id: 'b', day: '2026-6-12', tipo: 'gaso', ms: 90 * 60 * 1000 },
    ];
    var jobs = buildLabConsolidationMergeJobs(
      sets,
      function (s) {
        return s.day;
      },
      function (s) {
        return s.tipo;
      },
      function (s) {
        return s.ms;
      },
      null
    );
    assert.equal(jobs.length, 0);
  });

  it('buildLabConsolidationMergeJobs une labs + gasometría inicial ≤2 h', () => {
    var sets = [
      { id: 'a', day: '2026-6-12', tipo: 'labs', ms: 0 },
      { id: 'b', day: '2026-6-12', tipo: 'gaso', ms: 45 * 60 * 1000 },
    ];
    var jobs = buildLabConsolidationMergeJobs(
      sets,
      function (s) {
        return s.day;
      },
      function (s) {
        return s.tipo;
      },
      function (s) {
        return s.ms;
      },
      null
    );
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].kind, 'auto');
    assert.equal(jobs[0].sets.length, 2);
  });

  it('buildLabConsolidationMergeJobs une gaso solitaria con labs >2 h (mañana)', () => {
    var sets = [
      { id: 'gaso', day: '2026-8-3', tipo: 'gaso', ms: 0 },
      { id: 'labs', day: '2026-8-3', tipo: 'labs', ms: 167 * 60 * 1000 },
    ];
    var jobs = buildLabConsolidationMergeJobs(
      sets,
      function (s) {
        return s.day;
      },
      function (s) {
        return s.tipo;
      },
      function (s) {
        return s.ms;
      },
      null
    );
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].kind, 'auto');
    assert.equal(jobs[0].sets.length, 2);
  });

});

describe('lab-consolidation-plan — auto merge y manual', () => {
  it('buildLabConsolidationMergeJobs mantiene gasometría seriada aunque haya labs previos', () => {
    var sets = [
      { id: 'a', day: '2026-6-12', tipo: 'labs', ms: 0 },
      { id: 'b', day: '2026-6-12', tipo: 'gaso', ms: 45 * 60 * 1000 },
      { id: 'c', day: '2026-6-12', tipo: 'gaso', ms: 90 * 60 * 1000 },
    ];
    var jobs = buildLabConsolidationMergeJobs(
      sets,
      function (s) {
        return s.day;
      },
      function (s) {
        return s.tipo;
      },
      function (s) {
        return s.ms;
      },
      null
    );
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].sets.length, 2);
    assert.equal(jobs[0].sets[0].id, 'a');
    assert.equal(jobs[0].sets[1].id, 'b');
  });

  it('buildLabConsolidationMergeJobs no fusiona 2ª gaso con labs+gaso ya pareados', () => {
    var sets = [
      { id: 'pair', day: '2026-6-12', tipo: 'labs', hasGaso: true, ms: 0 },
      { id: 'gaso2', day: '2026-6-12', tipo: 'gaso', hasGaso: true, ms: 64 * 60 * 1000 },
    ];
    var jobs = buildLabConsolidationMergeJobs(
      sets,
      function (s) {
        return s.day;
      },
      function (s) {
        return s.tipo;
      },
      function (s) {
        return s.ms;
      },
      null,
      function (s) {
        return !!s.hasGaso;
      }
    );
    assert.equal(jobs.length, 0, 'par existente no debe absorber otra gasometría ≤2 h');
  });

  it('findOutlierLabConsolidationGroups no ofrece outlier para solo gasometrías seriadas', () => {
    var sets = [
      { id: 'a', day: '2026-6-12', tipo: 'gaso', ms: 0 },
      { id: 'b', day: '2026-6-12', tipo: 'gaso', ms: 5 * 60 * 60 * 1000 },
    ];
    var outliers = findOutlierLabConsolidationGroups(
      sets,
      function (s) {
        return s.day;
      },
      function (s) {
        return s.tipo;
      },
      function (s) {
        return s.ms;
      }
    );
    assert.equal(outliers.length, 0);
  });

  it('buildLabConsolidationMergeJobs outlier une día completo', () => {
    var sets = [
      { id: 'a', day: '2026-6-12', tipo: 'labs', ms: 0 },
      { id: 'b', day: '2026-6-12', tipo: 'labs', ms: 5 * 60 * 60 * 1000 },
    ];
    var gk = labDayTipoGroupKey('2026-6-12', 'labs');
    var jobs = buildLabConsolidationMergeJobs(
      sets,
      function (s) {
        return s.day;
      },
      function (s) {
        return s.tipo;
      },
      function (s) {
        return s.ms;
      },
      [gk]
    );
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].kind, 'outlier');
    assert.equal(jobs[0].sets.length, 2);
  });

  it('respeta límite exacto de ventana en auto', () => {
    var sets = [
      { id: 'a', day: '2026-6-12', tipo: 'labs', ms: 0 },
      { id: 'b', day: '2026-6-12', tipo: 'labs', ms: LAB_CONSOLIDATION_WINDOW_MS },
    ];
    var jobs = buildLabConsolidationMergeJobs(
      sets,
      function (s) {
        return s.day;
      },
      function (s) {
        return s.tipo;
      },
      function (s) {
        return s.ms;
      },
      null
    );
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].sets.length, 2);
  });

  it('listLabConsolidationCandidates omite mixtos y sin día', () => {
    var sets = [
      { id: 'a', day: '2026-6-12', tipo: 'labs' },
      { id: 'b', day: 'unknown', tipo: 'labs' },
      { id: 'c', day: '2026-6-12', tipo: 'mixed' },
      { id: 'd', day: '2026-6-12', tipo: 'gaso' },
    ];
    var out = listLabConsolidationCandidates(
      sets,
      function (s) {
        return s.day;
      },
      function (s) {
        return s.tipo;
      }
    );
    assert.deepEqual(
      out.map(function (s) {
        return s.id;
      }),
      ['a', 'd']
    );
  });

  it('validateManualConsolidationGroup exige mismo día y familia', () => {
    var byId = {
      a: { id: 'a', day: '2026-6-12', tipo: 'labs' },
      b: { id: 'b', day: '2026-6-12', tipo: 'gaso' },
      c: { id: 'c', day: '2026-6-12', tipo: 'cultivo' },
      d: { id: 'd', day: '2026-6-13', tipo: 'labs' },
    };
    var getDay = function (s) {
      return s.day;
    };
    var getTipo = function (s) {
      return s.tipo;
    };
    assert.equal(validateManualConsolidationGroup(['a', 'b'], byId, getDay, getTipo).ok, true);
    assert.equal(validateManualConsolidationGroup(['a', 'c'], byId, getDay, getTipo).ok, false);
    assert.equal(validateManualConsolidationGroup(['a', 'd'], byId, getDay, getTipo).ok, false);
    assert.equal(validateManualConsolidationGroup(['a'], byId, getDay, getTipo).ok, false);
  });

  it('buildManualLabConsolidationJobs solo fusiona grupos elegidos', () => {
    var byId = {
      a: { id: 'a' },
      b: { id: 'b' },
      c: { id: 'c' },
      d: { id: 'd' },
    };
    var jobs = buildManualLabConsolidationJobs(
      [
        ['a', 'b'],
        ['c'],
        ['c', 'd'],
      ],
      byId
    );
    // ['c'] solo no genera job ni marca used → el siguiente grupo puede usarlo
    assert.equal(jobs.length, 2);
    assert.equal(jobs[0].kind, 'manual');
    assert.deepEqual(
      jobs[0].sets.map(function (s) {
        return s.id;
      }),
      ['a', 'b']
    );
    assert.deepEqual(
      jobs[1].sets.map(function (s) {
        return s.id;
      }),
      ['c', 'd']
    );
  });

  it('labSetSectionSummary lista secciones únicas', () => {
    assert.equal(labSetSectionSummary(['BH\tHb 12', 'QS\tNa 140', '', 'GASES\tpH 7.4']), 'BH · QS · GASES');
  });
});
