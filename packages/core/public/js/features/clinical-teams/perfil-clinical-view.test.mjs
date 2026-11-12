import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadJsx } from '../preact-view-test-helpers.mjs';
import { sameHtml as same } from '../preact-html-compare.mjs';

const view = await loadJsx(import.meta.url, `import { PerfilSala, PerfilAccount } from './perfil-clinical-view.jsx';
  export const sala = (p) => renderToString(<PerfilSala {...p} />);
  export const account = (p) => renderToString(<PerfilAccount {...p} />);`);

// Markup buildPerfilSalaHtml / buildPerfilAccountHtml wrote before the port.
const OLD = createRequire(import.meta.url)('./perfil-clinical-view-old-html.json');
// Preact closes void tags with `/>`; the old strings did not.
const sameHtml = (a, b, n) => same(a.replace(/\/>/g, '>'), b, n);
// The old templates left a space before `>` where an optional attribute was empty.
const old = (s) => s.replace(/ >/g, '>');

const salas = OLD.salas;
const base = { collapseKey: 'perfil.sala', salas, open: true };

test('Sala section equals the old HTML (picked, unset, first of month, confirmed)', () => {
  sameHtml(view.sala({ ...base, sala: salas[0], hint: '' }), old(OLD.sala.picked), 'picked');
  sameHtml(view.sala({ ...base, sala: '', hint: 'pick' }), old(OLD.sala.none), 'none');
  sameHtml(view.sala({ ...base, sala: salas[0], hint: 'newMonth' }), old(OLD.sala.newMonth), 'newMonth');
  sameHtml(view.sala({ ...base, sala: salas[0], hint: '' }), old(OLD.sala.confirmed), 'confirmed');
});

const acct = { legacyUsername: false, usernameForInput: 'dr<m>&"x', clinicalName: 'Dra. <Ana> & "Q"', rank: 'R2',
  ranks: ['R1', 'R2', 'R3'], programAdmin: false, directoryNote: false };

test('Account form equals the old HTML (plain, admin + legacy + note, profile gate)', () => {
  sameHtml(view.account(acct), old(OLD.account.plain), 'plain');
  sameHtml(view.account({ ...acct, rank: 'R4', ranks: ['R1', 'R2', 'R3', 'R4'], programAdmin: true, directoryNote: true, legacyUsername: true }),
    old(OLD.account.admin), 'admin');
  sameHtml(view.account({ ...acct, usernameForInput: '', clinicalName: '', rank: 'R4', ranks: ['R1', 'R2', 'R3', 'R4'] }),
    old(OLD.account.gate), 'gate');
});

test('props builders: clock and collapse state decide open and hint', async () => {
  globalThis.localStorage = { _m: {}, getItem(k) { return this._m[k] ?? null; }, setItem(k, v) { this._m[k] = v; } };
  const { perfilSalaProps } = await import('./teams-roster-panel-build.mjs');
  const day = (d) => new Date(2026, 10, d, 12);
  assert.equal(perfilSalaProps({ sala: '' }, day(12)).hint, 'pick');
  assert.equal(perfilSalaProps({ sala: salas[0] }, day(12)).hint, '');
  const first = perfilSalaProps({ sala: salas[0] }, day(1));
  assert.equal(first.hint, 'newMonth');
  assert.equal(first.open, true);
});
