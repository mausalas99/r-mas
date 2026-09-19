import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { equiposFilterSummaryText } from './panel-admin-equipos-summary.mjs';

describe('equiposFilterSummaryText', () => {
  it('shows visible users and cloud totals', () => {
    const text = equiposFilterSummaryText({
      visible: 3,
      total: 15,
      overview: { counts: { users: 15, members: 79 } },
    });
    assert.match(text, /Mostrando 3 de 15 usuarios/);
    assert.match(text, /15 cuentas Nube/);
    assert.match(text, /79 membresías Nube en salas/);
  });

  it('sums memberships for the filtered sala', () => {
    const text = equiposFilterSummaryText({
      visible: 2,
      total: 15,
      overview: { counts: { users: 15, members: 79 } },
      salaFilter: 'Sala 2',
      rooms: [
        { sala: 'Sala 2', memberCount: 6 },
        { sala: 'Sala 2', memberCount: 4 },
        { sala: 'Sala 1', memberCount: 8 },
      ],
    });
    assert.match(text, /10 membresías Nube en Sala 2/);
    assert.doesNotMatch(text, /79 membresías Nube en salas/);
  });
});
