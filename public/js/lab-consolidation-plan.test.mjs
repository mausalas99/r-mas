import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLabConsolidationMergeJobs,
  countAutoLabConsolidationMerges,
  findOutlierLabConsolidationGroups,
  labDayTipoGroupKey,
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

  it('buildLabConsolidationMergeJobs no fusiona gasometrías por ventana 2 h', () => {
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
});
