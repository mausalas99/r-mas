import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildLabsGlanceForDay, formatAlteredChip } from './labs-glance-model.mjs';

function set(id, hora, resLabs) {
  return { id, fecha: '13/08/2026', hora, resLabs };
}

describe('labs glance', () => {
  it('formatAlteredChip keeps analyte + value', () => {
    assert.equal(formatAlteredChip({ label: 'Cr', value: '1.4*', raw: '1.4*' }), 'Cr 1.4*');
    assert.equal(formatAlteredChip({ label: 'Hb', value: '8.2*', raw: '8.2*' }), 'Hb 8.2*');
    assert.equal(formatAlteredChip({ label: '8.2', value: '8.2*', raw: '8.2*' }), '8.2*');
    assert.equal(formatAlteredChip({ label: 'Hb', value: 'Hb 8.2*', raw: 'Hb 8.2*' }), 'Hb 8.2*');
  });

  it('keeps each envío separate and only altered chips', () => {
    const model = buildLabsGlanceForDay({
      todayKey: '2026-8-13',
      orderedSets: [
        set('a', '07:14', ['BH\tHb 8.2* Hto 36', 'QS\tCr 1.1', 'GASES\tpH 7.31* PaO2 62*']),
        set('b', '14:20', ['GASES\tpH 7.40 PaO2 90']),
        set('c', '18:05', ['BH\tHb 8.0*']),
      ],
    });
    assert.equal(model.envios.length, 2);
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
    assert.equal(sparseGaso, undefined);
    assert.equal(sparseBh.wide, false);
  });

  it('collapses same-hour clones into one envío and omits all-normal FEB', () => {
    const model = buildLabsGlanceForDay({
      todayKey: '2026-8-13',
      orderedSets: [
        set('coag-a', '11:40', ['COAG\tTP 12.9 TTP 39.3* INR 1.1']),
        set('coag-b', '11:40', ['COAG\tTP 12.9 TTP 39.3* INR 1.1']),
        set('feb-a', '09:13', ['FEB\tTifO neg TifH neg ParaA neg']),
        set('feb-b', '09:13', ['FEB\tTifO neg TifH neg ParaA neg']),
        set('am-a', '04:23', ['BH\tHb 12.3*', 'QS\tCr 1.6*', 'ESC\tK 3.4*', 'PFHs\tAST 110*']),
        set('am-b', '04:23', ['BH\tHb 12.3*', 'QS\tCr 1.6*', 'ESC\tK 3.4*', 'PFHs\tAST 110*']),
      ],
    });
    const horas = model.envios.map((e) => String(e.hora).slice(0, 5));
    assert.deepEqual(horas, ['11:40', '04:23']);
    assert.equal(model.envios.length, 2);
    const am = model.envios.find((e) => String(e.hora).slice(0, 5) === '04:23');
    assert.equal(am.wide, true);
    assert.equal(am.groups.length, 4);
  });

  it('merges complementary panels at the same hour into one envío', () => {
    const model = buildLabsGlanceForDay({
      todayKey: '2026-8-13',
      orderedSets: [
        set('coag', '04:23', ['COAG\tTTP 39.3*']),
        set('qs', '04:23', ['QS\tCr 1.6*']),
      ],
    });
    assert.equal(model.envios.length, 1);
    assert.equal(String(model.envios[0].hora).slice(0, 5), '04:23');
    const tipos = model.envios[0].groups.map((g) => g.tipo);
    assert.equal(tipos.includes('COAG') && tipos.includes('QS'), true);
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

  it('ignores other days without grouping the full history', () => {
    const others = [];
    for (let i = 0; i < 80; i += 1) {
      others.push({
        id: 'old-' + i,
        fecha: '01/08/2026',
        hora: '07:00',
        resLabs: ['BH\tHb 12.0*'],
      });
    }
    const model = buildLabsGlanceForDay({
      todayKey: '2026-8-13',
      orderedSets: others.concat([
        { id: 'today', fecha: '13/08/2026', hora: '08:00', resLabs: ['BH\tHb 8.2*'] },
      ]),
    });
    assert.equal(model.envios.length, 1);
    assert.equal(model.envios[0].id, 'today');
  });

  it('counts en-rango values across the whole day, including all-normal sets', () => {
    const model = buildLabsGlanceForDay({
      todayKey: '2026-8-13',
      orderedSets: [
        set('a', '07:14', ['BH\tHb 8.2* Hto 36', 'QS\tCr 1.1 Na 138']),
        set('b', '14:20', ['GASES\tpH 7.40 PaO2 90']),
      ],
    });
    // Hto 36, Cr 1.1, Na 138, pH 7.40, PaO2 90 = 5 en-rango values.
    assert.equal(model.enRangoCount, 5);
  });

  it('marks trend on an altered chip vs. the same analyte in an earlier envío', () => {
    const model = buildLabsGlanceForDay({
      todayKey: '2026-8-13',
      orderedSets: [
        set('a', '04:00', ['QS\tK 3.9']),
        set('b', '11:00', ['QS\tK 2.9*']),
      ],
    });
    const later = model.envios.find((e) => e.id === 'b');
    const kChip = later.groups[0].chips.find((c) => c.label === 'K');
    assert.equal(kChip.trend, 'down');
    assert.equal(kChip.delta, '-1');
  });

  it('leaves trend unset for the first reading of the day', () => {
    const model = buildLabsGlanceForDay({
      todayKey: '2026-8-13',
      orderedSets: [set('a', '04:00', ['QS\tK 2.9*'])],
    });
    const kChip = model.envios[0].groups[0].chips.find((c) => c.label === 'K');
    assert.equal(kChip.trend, undefined);
  });
});
