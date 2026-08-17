import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readEquiposRowDraft, readEquiposRowRank, readEquiposRowSala } from './panel-admin-equipos-row-persist.mjs';
import {
  equiposBulkPurgeConfirmMessage,
  listSelectedEquiposRows,
  listVisibleEquiposRows,
  readEquiposRowPurgeTarget,
  setSelectAllVisibleEquipos,
} from './panel-admin-equipos-bulk.mjs';

/** @param {Record<string, string>} attrs @param {Record<string, { value: string, selectedIndex?: number }>} selects @param {{ checked?: boolean, hidden?: boolean }} [opts] */
function fakeRow(attrs, selects, opts = {}) {
  const boxes = { checked: !!opts.checked };
  return {
    hidden: !!opts.hidden,
    getAttribute(key) {
      return attrs[key] ?? null;
    },
    setAttribute(key, value) {
      attrs[key] = String(value);
    },
    querySelector(sel) {
      if (sel === '[data-admin-equipos-select]') return boxes;
      if (sel === '.cloud-sync-admin-equipos-user-sala') {
        return { value: selects.sala?.value || '', selectedIndex: 0 };
      }
      if (sel === '.cloud-sync-admin-equipos-rank') {
        return { value: selects.rank?.value || 'R1', selectedIndex: 0 };
      }
      if (sel === '.cloud-sync-admin-equipos-team') {
        return { value: selects.team?.value || '', selectedIndex: 0 };
      }
      if (sel === '.cloud-sync-admin-equipos-cycle') {
        return { value: selects.cycle?.value || '', selectedIndex: 0 };
      }
      return null;
    },
  };
}

describe('readEquiposRowDraft', () => {
  it('captures sala, R3 rank, team and cycle without DOM globals', () => {
    const row = fakeRow(
      {
        'data-cloud-username': 'axel',
        'data-cloud-display': 'Axel',
        'data-user-id': 'u1',
        'data-user-rank': 'R3',
        'data-sala': 'Sala 1',
      },
      {
        sala: { value: 'Interconsultas' },
        rank: { value: 'R3' },
        team: { value: 't1' },
        cycle: { value: 'A' },
      }
    );
    const draft = readEquiposRowDraft(/** @type {any} */ (row), [
      { team_id: 't1', name: 'Dr. Axel/Daniela', sala: 'Interconsultas', service: 'Interconsultas' },
    ]);
    assert.equal(draft.username, 'axel');
    assert.equal(draft.sala, 'Interconsultas');
    assert.equal(readEquiposRowSala(/** @type {any} */ (row)), 'Interconsultas');
    assert.equal(draft.rank, 'R3');
    assert.equal(draft.teamId, 't1');
    assert.equal(draft.subAreaFraction, 'A');
    assert.equal(readEquiposRowRank(/** @type {any} */ (row)), 'R3');
  });
});

describe('equipos bulk selection helpers', () => {
  it('lists only non-hidden rows for select-all, but selected includes hidden checked', () => {
    if (typeof document === 'undefined') {
      assert.ok(true);
      return;
    }
    document.body.innerHTML =
      '<div id="root"><input type="checkbox" data-admin-equipos-select-all />' +
      '<div data-admin-equipos-list>' +
      '<article class="cloud-sync-admin-equipos-row"><input type="checkbox" data-admin-equipos-select /></article>' +
      '<article class="cloud-sync-admin-equipos-row" hidden><input type="checkbox" data-admin-equipos-select checked /></article>' +
      '</div></div>';
    const root = /** @type {HTMLElement} */ (document.getElementById('root'));
    assert.equal(listVisibleEquiposRows(root).length, 1);
    // Hidden row already checked — must survive sala filter.
    assert.equal(listSelectedEquiposRows(root).length, 1);
    setSelectAllVisibleEquipos(root, true);
    assert.equal(listSelectedEquiposRows(root).length, 2);
    document.body.innerHTML = '';
  });
});

describe('handleCloudEquiposBulkSave sala push', () => {
  it('pushes to the sala(s) just assigned, not only the admin\'s own teams', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('./panel-admin-equipos-bulk.mjs', import.meta.url), 'utf8');
    const idx = src.indexOf('export async function handleCloudEquiposBulkSave');
    assert.ok(idx >= 0);
    const body = src.slice(idx);
    assert.match(body, /changedSalas\s*=\s*\[\.\.\.new Set\(drafts\.map\(\(d\) => d\.sala\)/);
    assert.match(body, /for \(const sala of changedSalas\) await publishClinicalTeamsAfterChange\(\{ sala \}\)/);
  });
});

describe('equipos bulk purge helpers', () => {
  it('reads purge targets from row data attributes', () => {
    const row = {
      getAttribute(key) {
        if (key === 'data-user-id') return 'u1';
        if (key === 'data-cloud-id') return 'c1';
        if (key === 'data-cloud-username') return 'local_abc';
        return null;
      },
    };
    assert.deepEqual(readEquiposRowPurgeTarget(row), {
      userId: 'u1',
      cloudId: 'c1',
      handle: 'local_abc',
    });
  });

  it('builds bulk purge confirm with counts', () => {
    const msg = equiposBulkPurgeConfirmMessage(3, { cloud: 2, local: 1 });
    assert.match(msg, /3 usuario/);
    assert.match(msg, /2 con cuenta Nube/);
    assert.match(msg, /1 con perfil clínico/);
  });
});
