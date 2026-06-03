'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { mergeBundlePut, emptyBundle } = require('./bundle-merge.js');

const now = () => '2026-05-30T12:00:00.000Z';

describe('bundle-merge', () => {
  it('first put creates revision 1', () => {
    const r = mergeBundlePut(
      null,
      {
        baseRevision: 0,
        baseEntityVersions: {},
        agenda: [{ id: 'e1', patientId: 'p1', procedure: 'A' }],
        todos: {},
      },
      { nowIso: now, clientId: 'c1' }
    );
    assert.equal(r.ok, true);
    assert.equal(r.bundle.revision, 1);
    assert.equal(r.bundle.entityVersions['a:e1'], 1);
  });

  it('disjoint todo keys auto-merge', () => {
    let bundle = emptyBundle(now());
    bundle.revision = 1;
    bundle.entityVersions = { 't:p1:t1': 1 };
    bundle.todos = { p1: [{ id: 't1', text: 'one' }] };
    const r = mergeBundlePut(
      bundle,
      {
        baseRevision: 1,
        baseEntityVersions: {},
        todos: { p1: [{ id: 't2', text: 'two' }] },
      },
      { nowIso: now, clientId: 'c2' }
    );
    assert.equal(r.ok, true);
    assert.equal(r.bundle.revision, 2);
    assert.equal(r.bundle.todos.p1.length, 2);
    assert.equal(r.bundle.entityVersions['t:p1:t2'], 1);
  });

  it('stale entity version yields conflict', () => {
    let bundle = emptyBundle(now());
    bundle.revision = 1;
    bundle.entityVersions = { 'a:e1': 2 };
    bundle.agenda = [{ id: 'e1', procedure: 'Server' }];
    const r = mergeBundlePut(
      bundle,
      {
        baseRevision: 1,
        baseEntityVersions: { 'a:e1': 1 },
        agenda: [{ id: 'e1', procedure: 'Stale' }],
      },
      { nowIso: now }
    );
    assert.equal(r.ok, false);
    assert.equal(r.conflicts.length, 1);
    assert.equal(r.conflicts[0].key, 'a:e1');
  });

  it('partial PUT keeps todos when only agenda sent', () => {
    let bundle = emptyBundle(now());
    bundle.revision = 1;
    bundle.entityVersions = { 't:p1:t1': 1 };
    bundle.todos = { p1: [{ id: 't1', text: 'keep' }] };
    const r = mergeBundlePut(
      bundle,
      {
        baseRevision: 1,
        baseEntityVersions: { 'a:e1': 0 },
        agenda: [{ id: 'e1', procedure: 'New' }],
      },
      { nowIso: now }
    );
    assert.equal(r.ok, true);
    assert.equal(r.bundle.todos.p1[0].text, 'keep');
    assert.equal(r.bundle.agenda.length, 1);
  });

  it('clinicalOps union keeps teams from both peers', () => {
    let bundle = emptyBundle(now());
    bundle.revision = 1;
    bundle.entityVersions = { clinicalOps: 1 };
    bundle.clinicalOps = {
      exportedAt: '2020-01-01T00:00:00',
      teams: [{ team_id: 'team-a', name: 'A', created_at: '2020-01-01T00:00:00' }],
      team_membership: [],
    };
    const r = mergeBundlePut(
      bundle,
      {
        baseRevision: 1,
        baseEntityVersions: { clinicalOps: 1 },
        clinicalOps: {
          exportedAt: '2025-01-01T00:00:00',
          teams: [{ team_id: 'team-b', name: 'B', created_at: '2025-01-01T00:00:00' }],
          team_membership: [],
        },
      },
      { nowIso: now, clientId: 'c2' }
    );
    assert.equal(r.ok, true);
    assert.equal(r.bundle.clinicalOps.teams.length, 2);
  });
});
