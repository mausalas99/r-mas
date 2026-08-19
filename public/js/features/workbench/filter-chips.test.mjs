import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildFilterChipsHtml, mountFilterChips } from './filter-chips.mjs';

const CHIPS = [
  { id: 'con-pendiente', label: 'Con pendiente · 9' },
  { id: 'todos', label: 'Todos' },
  { id: 'ingresos', label: 'Ingresos' },
];

describe('buildFilterChipsHtml', () => {
  it('marks the active chip white+border, inactive ones plain text', () => {
    const html = buildFilterChipsHtml(CHIPS, 'con-pendiente');
    assert.match(html, /wb-chip--active" data-wb-chip-id="con-pendiente"/);
    assert.doesNotMatch(html, /wb-chip--active" data-wb-chip-id="todos"/);
  });

  it('supports a teal-fill active variant for zone chips', () => {
    const html = buildFilterChipsHtml(CHIPS, 'todos', { variant: 'teal' });
    assert.match(html, /wb-chip--active-teal" data-wb-chip-id="todos"/);
  });
});

describe('mountFilterChips', () => {
  it('calls onChange and re-renders the active chip on click', () => {
    if (typeof document === 'undefined') return;
    const host = document.createElement('div');
    let changed = null;
    mountFilterChips(host, CHIPS, { activeId: 'con-pendiente', onChange: (id) => (changed = id) });
    host.querySelector('[data-wb-chip-id="todos"]').click();
    assert.equal(changed, 'todos');
    assert.equal(host.querySelector('[data-wb-chip-id="todos"]').className.includes('wb-chip--active'), true);
  });
});
