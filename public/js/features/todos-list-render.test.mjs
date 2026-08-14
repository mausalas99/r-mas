import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { todoRowDetailBits } from './todos-list-render.mjs';

describe('todoRowDetailBits', () => {
  it('omits Estado pendiente and Estado completado', () => {
    var open = todoRowDetailBits({ text: 'RX TORAX', completed: false });
    var done = todoRowDetailBits({ text: 'RX TORAX', completed: true });
    assert.deepEqual(open, []);
    assert.deepEqual(done, []);
    assert.equal(open.join(' ').includes('pendiente'), false);
    assert.equal(done.join(' ').includes('completado'), false);
  });

  it('keeps due, overdue, and handoff bits', () => {
    var bits = todoRowDetailBits(
      { due: 'hoy 18:00', dueDate: '2000-01-01T00:00:00.000Z', completed: false },
      { handoff: true }
    );
    assert.ok(bits.includes('Vence: hoy 18:00'));
    assert.ok(bits.includes('Atrasado'));
    assert.ok(bits.includes('De entrega'));
    assert.equal(bits.some(function (b) { return /Estado:/.test(b); }), false);
  });
});
