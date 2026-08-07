import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { encryptJson } from '../crypto-at-rest.js';
import worker from '../index.js';
import { salaFromSlug, normalizeInternoSala } from './sala-slug.js';
import { authenticateInterno } from './auth.js';
import { readInternoBoard } from './board.js';
import {
  applyInternoVitals,
  checkVitalsRateLimit,
  resetVitalsRateLimitsForTests,
} from './vitals.js';
import { handleInternoRoutes } from './routes.js';
import { serializePendientesJson } from '../../../../lib/entrega/entrega-pendientes.mjs';

const TEST_KEY = { WORKER_DATA_KEY: 'ab'.repeat(32) };

/** @param {string} hex */
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * @param {{
 *   sala?: string,
 *   token?: string,
 *   active?: boolean,
 *   roomId?: string,
 *   revision?: number,
 *   state?: object,
 * }} opts
 */
function createInternoDb(opts = {}) {
  const sala = opts.sala || 'Torre HU';
  const token = opts.token || 'secret-token';
  const roomId = opts.roomId || 'room-torre';
  const revision = opts.revision ?? 1;
  const accessRow = {
    sala,
    access_token: token,
    is_active: opts.active === false ? 0 : 1,
  };
  const roomRow = {
    id: roomId,
    revision,
    sala,
    turn_key: '2026-08',
    updated_at: '2026-08-07T12:00:00.000Z',
  };
  /** @type {object|null} */
  let roomState = opts.state || null;
  /** @type {Array<{ sql: string, args: unknown[] }>} */
  const mutations = [];

  const db = {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              if (sql.includes('FROM sala_interno_access')) {
                return accessRow.sala === args[0] ? accessRow : null;
              }
              if (sql.includes('FROM rooms WHERE sala = ? AND turn_key')) {
                return args[0] === sala ? roomRow : null;
              }
              if (sql.includes('FROM rooms WHERE sala = ?')) {
                return args[0] === sala ? roomRow : null;
              }
              if (sql.includes('SELECT revision FROM rooms WHERE id')) {
                return { revision: roomRow.revision };
              }
              if (sql.includes('FROM room_state')) {
                return roomState;
              }
              if (sql.includes('FROM mutations')) {
                return null;
              }
              return null;
            },
            async run() {
              if (sql.includes('INSERT INTO mutations')) {
                mutations.push({ sql, args });
                roomRow.revision = Number(args[1]);
              }
              if (sql.includes('UPDATE rooms SET revision')) {
                roomRow.revision = Number(args[0]);
              }
              if (sql.includes('UPDATE room_state SET ciphertext')) {
                roomState = {
                  ciphertext: args[0],
                  iv: args[1],
                };
              }
              return { meta: { changes: 1 } };
            },
            async all() {
              return { results: [] };
            },
          };
        },
      };
    },
    async batch(stmts) {
      const results = [];
      for (const stmt of stmts) {
        results.push(await stmt.run());
      }
      return results;
    },
    async setState(state) {
      const { ciphertext, iv } = await encryptJson(TEST_KEY, state);
      roomState = {
        ciphertext: hexToBytes(ciphertext),
        iv: hexToBytes(iv),
      };
    },
    getRevision() {
      return roomRow.revision;
    },
    getMutations() {
      return mutations;
    },
  };

  return db;
}

function sampleClinicalOps() {
  const pendientesJson = serializePendientesJson({
    version: 2,
    items: [
      {
        id: 'proc-1',
        type: 'procedimiento',
        kind: 'imagen',
        label: 'TAC',
        scheduledAt: '2026-08-07T14:00:00.000Z',
      },
    ],
    vitalsPlan: {
      enabled: true,
      frequency: 'q4h',
      metrics: ['ta', 'fc'],
    },
  });
  return {
    teams: [
      {
        team_id: 't1',
        service: 'Torre HU',
        sala: 'Torre HU',
        sub_area_fraction: 'A',
        members: [{ user_id: 'r1-on', rank: 'R1' }],
      },
    ],
    team_membership: [{ team_id: 't1', user_id: 'r1-on', rank: 'R1' }],
    team_guardia_today: [{ team_id: 't1', user_id: 'r1-on' }],
    active_guardias: [
      {
        patient_id: 'p1',
        covering_user_id: 'r1-on',
        source_team_id: 't1',
        status: 'Active',
        pendientes_json: pendientesJson,
        vitals_frequency: 'q4h',
      },
    ],
  };
}

describe('interno sala slugs', () => {
  it('maps torre-hu slug to Torre HU (regression)', () => {
    assert.equal(salaFromSlug('torre-hu'), 'Torre HU');
    assert.equal(normalizeInternoSala('torre-hu'), 'Torre HU');
  });

  it('supports all clinical sala slugs', () => {
    assert.equal(salaFromSlug('sala-1'), 'Sala 1');
    assert.equal(salaFromSlug('area-a-pensionistas'), 'Área A/Pensionistas');
    assert.equal(salaFromSlug('interconsultas'), 'Interconsultas');
    assert.equal(salaFromSlug('ux'), 'UX');
    assert.equal(salaFromSlug('eme'), 'Eme');
  });
});

describe('interno auth', () => {
  it('accepts Authorization: Interno <token>', async () => {
    const db = createInternoDb({ sala: 'Sala 1', token: 'abc' });
    const req = new Request('http://localhost/api/interno/v1/board?sala=Sala%201', {
      headers: { Authorization: 'Interno abc' },
    });
    const auth = await authenticateInterno(req, db);
    assert.ok(!(auth instanceof Response));
    assert.equal(auth.sala, 'Sala 1');
  });

  it('rejects missing token', async () => {
    const db = createInternoDb();
    const req = new Request('http://localhost/api/interno/v1/board?sala=Torre%20HU');
    const auth = await authenticateInterno(req, db);
    assert.ok(auth instanceof Response);
    assert.equal(auth.status, 401);
  });
});

describe('interno routes', () => {
  it('GET /ping returns health payload', async () => {
    const res = await handleInternoRoutes(
      new Request('http://localhost/api/interno/v1/ping'),
      { DB: createInternoDb() },
      '/ping'
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body, { ok: true, interno: true, board: 'v2' });
  });

  it('GET /board requires auth', async () => {
    const res = await handleInternoRoutes(
      new Request('http://localhost/api/interno/v1/board?sala=Torre%20HU'),
      { DB: createInternoDb() },
      '/board'
    );
    assert.equal(res.status, 401);
  });
});

describe('interno board', () => {
  it('returns inactive board when token row is disabled', async () => {
    const db = createInternoDb({ active: false });
    const board = await readInternoBoard(TEST_KEY, db, 'Torre HU');
    assert.equal(board?.inactive, true);
    assert.equal(board?.patients.length, 0);
  });

  it('builds board rows for Torre HU guardia patients', async () => {
    const db = createInternoDb({ sala: 'Torre HU' });
    await db.setState({
      revision: 1,
      entries: [
        {
          id: 'p1',
          nombre: 'GONZALEZ TEST',
          cuarto: '301',
          cama: '01',
          sala: 'Torre HU',
        },
      ],
      entityVersions: {},
      todos: {},
      agenda: [],
      clinicalOps: sampleClinicalOps(),
      labSidecars: {},
    });
    const board = await readInternoBoard(TEST_KEY, db, 'Torre HU');
    assert.equal(board?.active, true);
    assert.equal(board?.patients.length, 1);
    assert.equal(board?.patients[0].id, 'p1');
  });
});

describe('interno vitals', () => {
  beforeEach(() => {
    resetVitalsRateLimitsForTests();
  });

  it('rate limits POST /vitals to 60/min', () => {
    const req = new Request('http://localhost/api/interno/v1/vitals', {
      headers: { 'cf-connecting-ip': '10.0.0.5' },
    });
    for (let i = 0; i < 60; i += 1) {
      assert.equal(checkVitalsRateLimit(req, 'tok'), true);
    }
    assert.equal(checkVitalsRateLimit(req, 'tok'), false);
  });

  it('merges monitoreo and bumps room revision', async () => {
    const db = createInternoDb({ sala: 'Torre HU', revision: 3 });
    await db.setState({
      revision: 3,
      entries: [
        {
          id: 'p1',
          nombre: 'GONZALEZ TEST',
          cuarto: '301',
          cama: '01',
          sala: 'Torre HU',
          monitoreo: { historial: [], estadoClinico: {}, confirmado: {} },
        },
      ],
      entityVersions: {},
      todos: {},
      agenda: [],
      clinicalOps: sampleClinicalOps(),
      labSidecars: {},
    });

    const res = await applyInternoVitals(TEST_KEY, db, 'Torre HU', 'p1', {
      vitals: { fc: 88, ta: '120/70' },
      reporterName: 'Interno Test',
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.patientId, 'p1');
    assert.equal(body.version, 4);
    assert.equal(db.getRevision(), 4);
    assert.equal(db.getMutations().length, 1);
  });
});

describe('interno static shell', () => {
  it('serves GET /interno/torre-hu via ASSETS', async () => {
    const env = {
      ASSETS: {
        async fetch(request) {
          const url = new URL(request.url);
          if (url.pathname === '/interno/index.html') {
            return new Response('<html>interno</html>', {
              status: 200,
              headers: { 'Content-Type': 'text/html' },
            });
          }
          return new Response('missing', { status: 404 });
        },
      },
    };
    const res = await worker.fetch(new Request('http://localhost/interno/torre-hu'), env);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /interno/);
  });

  it('rejects unknown interno slug', async () => {
    const res = await worker.fetch(new Request('http://localhost/interno/not-a-sala'), {});
    assert.equal(res.status, 404);
  });
});
