import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import {
  filterInternoSalaRows,
  buildInternoQrUrl,
  mountInternoQrPanelInHost,
} from './panel-interno-qr.mjs';

describe('filterInternoSalaRows', () => {
  it('returns Sala 1 / Sala 2 / Sala E in order, filling in missing rows', () => {
    const rows = filterInternoSalaRows([
      { sala: 'Sala E', access_token: 'e-tok', is_active: 1 },
      { sala: 'Sala 1', access_token: '1-tok', is_active: 0 },
    ]);
    assert.deepEqual(rows.map((r) => r.sala), ['Sala 1', 'Sala 2', 'Sala E']);
    assert.equal(rows[0].access_token, '1-tok');
    assert.equal(rows[2].access_token, 'e-tok');
    assert.equal(rows[1].access_token, '');
    assert.equal(rows[1].is_active, 0);
  });

  it('drops rows for salas outside Sala 1/2/E (e.g. Torre HU)', () => {
    const rows = filterInternoSalaRows([{ sala: 'Torre HU', access_token: 'x', is_active: 1 }]);
    assert.deepEqual(rows.map((r) => r.sala), ['Sala 1', 'Sala 2', 'Sala E']);
  });

  it('handles a missing/null rows argument', () => {
    assert.deepEqual(filterInternoSalaRows(null).map((r) => r.sala), ['Sala 1', 'Sala 2', 'Sala E']);
  });
});

describe('buildInternoQrUrl', () => {
  it('builds the phone URL with the token in the query and the subkey in the fragment', () => {
    const url = buildInternoQrUrl({
      baseUrl: 'https://sync.example.workers.dev',
      sala: 'Sala 1',
      token: 'tok123',
      subkeyB64: 'subkeyB64==',
    });
    assert.equal(url, 'https://sync.example.workers.dev/interno/sala-1?t=tok123#k=subkeyB64%3D%3D');
  });

  it('returns empty for a sala with no room slug', () => {
    assert.equal(
      buildInternoQrUrl({ baseUrl: 'https://x', sala: 'Nope', token: 't', subkeyB64: 'k' }),
      ''
    );
  });

  it('returns empty when the subkey is missing (room DEK not cached yet)', () => {
    assert.equal(
      buildInternoQrUrl({ baseUrl: 'https://x', sala: 'Sala 1', token: 't', subkeyB64: '' }),
      ''
    );
  });
});

describe('mountInternoQrPanelInHost', () => {
  const prevUser = clinicalSessionContext.user;
  const hadWindow = 'window' in globalThis;
  const prevWindow = hadWindow ? globalThis.window : undefined;

  afterEach(() => {
    clinicalSessionContext.user = prevUser;
    if (hadWindow) globalThis.window = prevWindow;
    else delete globalThis.window;
  });

  it('renders nothing for a non-admin user', () => {
    if (typeof document === 'undefined') return;
    clinicalSessionContext.user = { rank: 'R1', user_id: 'u1' };
    const host = document.createElement('div');
    mountInternoQrPanelInHost(host, { runtime: () => ({ showToast() {} }) });
    assert.equal(host.childElementCount, 0);
  });

  it('renders the panel shell for an R4 (admin) user', () => {
    if (typeof document === 'undefined') return;
    clinicalSessionContext.user = { rank: 'R4', user_id: 'u1' };
    globalThis.window = {};
    const host = document.createElement('div');
    mountInternoQrPanelInHost(host, { runtime: () => ({ showToast() {} }) });
    assert.ok(host.querySelector('.cloud-interno-qr-panel'));
    assert.match(host.querySelector('.clinical-teams-empty')?.textContent || '', /No disponible/);
  });
});
