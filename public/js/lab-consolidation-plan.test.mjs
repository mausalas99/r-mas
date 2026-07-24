import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLabConsolidationMergeJobs,
  buildManualLabConsolidationJobs,
  countAutoLabConsolidationMerges,
  findOutlierLabConsolidationGroups,
  labDayTipoGroupKey,
  labSetSectionSummary,
  listLabConsolidationCandidates,
  validateManualConsolidationGroup,
} from './lab-consolidation-plan.mjs';
import { LAB_CONSOLIDATION_WINDOW_MS } from './lab-consolidation-cluster.mjs';

describe('lab-consolidation-plan', () => {
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
