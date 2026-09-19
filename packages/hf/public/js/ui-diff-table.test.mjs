import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDiffTableHtml, conflictRowsToDiffTable } from './ui-diff-table.mjs';

describe('ui-diff-table', () => {
  it('marks removed rows and optional added row', () => {
    var html = buildDiffTableHtml({
      title: 'Limpieza',
      columns: ['A', 'B'],
      rows: [
        { cells: ['x', 'y'], removed: true },
        { cells: ['m', 'n'] },
      ],
      showAdded: true,
      addedRow: { cells: ['new', 'row'] },
    });
    assert.match(html, /ui-diff-row--removed/);
    assert.match(html, /ui-diff-row--added/);
    assert.match(html, /Limpieza/);
  });

  it('maps conflict keys to three-column table', () => {
    var html = conflictRowsToDiffTable({
      keys: ['labs'],
      conflictingKeys: ['labs'],
      localData: { labs: 'A' },
      serverData: { labs: null },
      formatLabel: (k) => 'Labs',
      formatValue: (v) => (v == null ? '—' : String(v)),
    });
    assert.match(html, /Labs/);
    assert.match(html, /ui-diff-row--removed/);
  });
});
