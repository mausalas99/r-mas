import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3-multiple-ciphers';
import { applyMigrations } from './schema.mjs';
import { ensureClinicalUser, claimUsername } from './clinical-access-users.mjs';
import { createTeam, listTeamsForRenderer } from './clinical-access-teams-core.mjs';
import { mergeTeams } from './clinical-ops-sync-merge-teams.mjs';

function openDb() {
  const db = new Database(':memory:');
  applyMigrations(db);
  return db;
}

function makeUser(db, handle, rank = 'R1') {
  const user = ensureClinicalUser(db, { clientId: handle, rank });
  claimUsername(db, { userId: user.userId, username: handle });
  return user.userId;
}

describe('mergeTeams — skipped rows are logged, not silent', () => {
  it('warns when a team row cannot satisfy a DB constraint', () => {
    const db = openDb();
    const originalWarn = console.warn;
    const calls = [];
    console.warn = (...args) => calls.push(args);
    try {
      const incoming = {
        team_id: 'bad-team-1',
        name: 'Equipo Inválido',
        service: 'Not A Real Service', // violates teams.service CHECK constraint
        sala: 'Sala 1',
        rotation_active: 1,
      };
      mergeTeams(db, [], [incoming]);

      const row = db.prepare('SELECT team_id FROM teams WHERE team_id = ?').get('bad-team-1');
      assert.equal(row, undefined, 'the invalid row must still be skipped, not inserted');
      assert.ok(
        calls.some((args) => String(args[1]) === 'bad-team-1'),
        'the skip must be logged with the team_id so it can be traced'
      );
    } finally {
      console.warn = originalWarn;
      db.close();
    }
  });
});

describe('mergeTeams — orphan staged teams from pre-8.2.8 peers', () => {
  it('promotes a staged team in a sala with no active team of its own', () => {
    const db = openDb();
    try {
      const admin = makeUser(db, 'admin1', 'R4');
      const outsider = makeUser(db, 'resident1', 'R1');

      // Local: Sala 2 already has a live rotation.
      createTeam(db, {
        name: 'Equipo Sala 2',
        service: 'Sala',
        onCallDayIndex: 0,
        sala: 'Sala 2',
        createdBy: admin,
      });

      // Incoming from an old (<8.2.8) peer: staged because that peer saw a
      // hospital-wide active team (in Sala 2), even though Sala 1 has none.
      const incoming = {
        team_id: 'stray-team-1',
        name: 'Equipo Sala 1',
        service: 'Sala',
        sala: 'Sala 1',
        created_by: admin,
        rotation_active: 0,
      };
      mergeTeams(db, [], [incoming]);

      const visible = listTeamsForRenderer(db, outsider);
      const promoted = visible.find((t) => t.team_id === 'stray-team-1');
      assert.ok(promoted, 'orphan staged team should be visible to a non-member');
      assert.equal(promoted.rotation_active, 1);
      const row = db.prepare('SELECT updated_at FROM teams WHERE team_id = ?').get('stray-team-1');
      assert.ok(row.updated_at, 'promotion must stamp updated_at so it wins future merges');
    } finally {
      db.close();
    }
  });

  it('leaves an intentionally staged team (its own sala already active) alone', () => {
    const db = openDb();
    try {
      const admin = makeUser(db, 'admin2', 'R4');
      const outsider = makeUser(db, 'resident2', 'R1');

      createTeam(db, {
        name: 'Equipo Agosto',
        service: 'Sala',
        onCallDayIndex: 0,
        sala: 'Sala 1',
        createdBy: admin,
      });

      const incoming = {
        team_id: 'staged-team-1',
        name: 'Equipo Septiembre',
        service: 'Sala',
        sala: 'Sala 1',
        created_by: admin,
        rotation_active: 0,
      };
      mergeTeams(db, [], [incoming]);

      const visible = listTeamsForRenderer(db, outsider);
      assert.ok(
        !visible.some((t) => t.team_id === 'staged-team-1'),
        'a genuinely staged next-rotation team must stay hidden from non-members'
      );
      const row = db.prepare('SELECT rotation_active FROM teams WHERE team_id = ?').get('staged-team-1');
      assert.equal(row.rotation_active, 0);
    } finally {
      db.close();
    }
  });

  it('keeps a repaired team promoted across a re-merge of the same stale peer snapshot', () => {
    const db = openDb();
    try {
      const admin = makeUser(db, 'admin3', 'R4');

      createTeam(db, {
        name: 'Equipo Sala 2',
        service: 'Sala',
        onCallDayIndex: 0,
        sala: 'Sala 2',
        createdBy: admin,
      });

      const stalePeerRow = {
        team_id: 'stray-team-2',
        name: 'Equipo Sala 1',
        service: 'Sala',
        sala: 'Sala 1',
        created_by: admin,
        rotation_active: 0,
      };
      mergeTeams(db, [], [stalePeerRow]);
      mergeTeams(db, [], [stalePeerRow]);

      const row = db.prepare('SELECT rotation_active FROM teams WHERE team_id = ?').get('stray-team-2');
      assert.equal(row.rotation_active, 1);
    } finally {
      db.close();
    }
  });
});
