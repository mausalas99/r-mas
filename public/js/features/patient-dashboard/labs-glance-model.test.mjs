import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildLabsGlanceForDay } from './labs-glance-model.mjs';

function set(id, hora, resLabs) {
  return { id, fecha: '13/08/2026', hora, resLabs };
}

describe('labs glance', () => {
  it('keeps each envío separate and only altered chips', () => {
    const model = buildLabsGlanceForDay({
      todayKey: '2026-8-13',
      orderedSets: [
        set('a', '07:14', ['BH\tHb 8.2* Hto 36', 'QS\tCr 1.1', 'GASES\tpH 7.31* PaO2 62*']),
        set('b', '14:20', ['GASES\tpH 7.40 PaO2 90']),
        set('c', '18:05', ['BH\tHb 8.0*']),
      ],
    });
    assert.equal(model.envios.length, 3);
    const dense = model.envios.find((e) => e.id === 'a');
    const sparseGaso = model.envios.find((e) => e.id === 'b');
    const sparseBh = model.envios.find((e) => e.id === 'c');
    assert.ok(dense);
    assert.equal(String(dense.hora).slice(0, 5), '07:14');
    assert.equal(dense.wide, true);
    const chips = dense.groups.flatMap((g) => g.chips.map((c) => c.raw));
    assert.ok(chips.some((t) => String(t).endsWith('*')));
    assert.equal(chips.some((t) => t === 'Cr' || String(t).includes('1.1')), false);
    assert.equal(chips.some((t) => /pafi/i.test(String(t))), false);
    assert.equal(sparseGaso.groups.length, 0);
    assert.equal(sparseGaso.wide, false);
    assert.equal(sparseBh.wide, false);
  });

  it('does not merge different hours on the same day', () => {
    const model = buildLabsGlanceForDay({
      todayKey: '2026-8-13',
      orderedSets: [
        set('a', '07:14', ['BH\tHb 8.2*']),
        set('b', '18:05', ['BH\tHb 8.0*']),
      ],
    });
    const ids = model.envios.map((e) => e.id);
    assert.equal(ids.includes('a') && ids.includes('b'), true);
    assert.equal(ids.length, 2);
  });

  it('includes BH alteraciones when mixed with cultivo in one set', () => {
    const model = buildLabsGlanceForDay({
      todayKey: '2026-8-13',
      orderedSets: [
        set('mix', '09:00', ['BH\tHb 8.2*', 'UROCULTIVO: E. COLI', 'ATB S: CIPRO']),
      ],
    });
    assert.equal(model.envios.length, 1);
    const envio = model.envios[0];
    assert.equal(envio.id, 'mix');
    const chips = envio.groups.flatMap((g) => g.chips.map((c) => c.raw));
    assert.ok(chips.some((t) => String(t).includes('8.2*')));
    assert.equal(chips.some((t) => /urocultivo|e\. coli|cipro/i.test(String(t))), false);
    assert.equal(JSON.stringify(envio).toLowerCase().includes('cultivo'), false);
  });

  it('omits cultivo-only sets from envíos', () => {
    const model = buildLabsGlanceForDay({
      todayKey: '2026-8-13',
      orderedSets: [
        set('cult', '10:00', ['UROCULTIVO: E. COLI', 'ATB S: CIPRO']),
        set('labs', '11:00', ['BH\tHb 8.0*']),
      ],
    });
    const ids = model.envios.map((e) => e.id);
    assert.equal(ids.includes('cult'), false);
    assert.equal(ids.includes('labs'), true);
    assert.equal(ids.length, 1);
  });

  it('returns no envíos when todayKey misses (does not fall back to another day)', () => {
    const model = buildLabsGlanceForDay({
      todayKey: '2026-8-13',
      orderedSets: [
        { id: 'yest', fecha: '12/08/2026', hora: '07:14', resLabs: ['BH\tHb 8.2*'] },
      ],
    });
    assert.equal(model.envios.length, 0);
  });
});
