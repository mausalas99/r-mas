import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  clusterDayLabSets,
  buildDayLabView,
  buildDayOutputPayload,
  pickLabworkGroup,
  pickSomeSourceText,
  buildLabHistoryDayOptionsHtml,
  daySelectValue,
  parseDaySelectValue,
  findDayForHistoryRef,
  resolveSelectedDayKey,
  filterOutDaySets,
} from './lab-history-day-view.mjs';

function set(id, fecha, hora, resLabs) {
  return { id: id, fecha: fecha, hora: hora, resLabs: resLabs };
}

describe('day select values', () => {
  it('round-trips a day key through the select prefix', () => {
    assert.equal(daySelectValue('13/08/2026'), 'day:13/08/2026');
    assert.equal(parseDaySelectValue('day:13/08/2026'), '13/08/2026');
    assert.equal(parseDaySelectValue('__idx_2'), '');
    assert.equal(parseDaySelectValue(''), '');
  });
});

describe('clusterDayLabSets', () => {
  it('merges same-hour labs into one group and keeps a later window separate', () => {
    var groups = clusterDayLabSets([
      set('late', '13/08/2026', '11:40', ['BH\tHb 8.0*']),
      set('coag', '13/08/2026', '04:23', ['COAG\tTP 12.9 TTP 39.3* INR 1.1']),
      set('qs', '13/08/2026', '04:23', ['QS\tCr 1.2*']),
    ]);
    assert.equal(groups.length, 2);
    assert.equal(groups[0].hora, '11:40');
    assert.equal(groups[1].hora, '04:23');
    assert.ok(groups[1].resLabs.some(function (row) {
      return /COAG/.test(String(row));
    }));
    assert.ok(groups[1].resLabs.some(function (row) {
      return /QS/.test(String(row));
    }));
    assert.equal(groups[1].sets.length, 2);
  });

  it('does not merge labs more than 2 h apart', () => {
    var groups = clusterDayLabSets([
      set('a', '13/08/2026', '07:00', ['BH\tHb 8.2*']),
      set('b', '13/08/2026', '18:00', ['BH\tHb 8.0*']),
    ]);
    assert.equal(groups.length, 2);
    assert.equal(groups[0].hora, '18:00');
    assert.equal(groups[1].hora, '07:00');
  });

  it('keeps cultivo in its own family group', () => {
    var groups = clusterDayLabSets([
      set('labs', '13/08/2026', '09:00', ['BH\tHb 8.2*']),
      set('cult', '13/08/2026', '09:10', ['UROCULTIVO: E. COLI', 'ATB S: CIPRO']),
    ]);
    assert.ok(groups.length >= 2);
    var cult = groups.find(function (g) {
      return g.tipoLabel === 'Cultivo';
    });
    var labs = groups.find(function (g) {
      return g.tipoLabel === 'Labs';
    });
    assert.ok(cult);
    assert.ok(labs);
  });

  it('keeps only the richest EGO fragment when partial reports land more than 2h apart', () => {
    var groups = clusterDayLabSets([
      set('early', '13/08/2026', '02:00', ['EGO:\n  AMAR  TURB']),
      set('later', '13/08/2026', '09:00', ['EGO:\n  AMAR  TURB  pH 6.5  D 1.013\n  Leu 17-18* Eri 2-3']),
    ]);
    var egoGroups = groups.filter(function (g) {
      return g.resLabs.some(function (row) {
        return /^EGO/.test(String(row));
      });
    });
    assert.equal(egoGroups.length, 1, 'el fragmento EGO más pobre no debe quedar como su propio bloque');
    assert.ok(/Leu 17-18/.test(egoGroups[0].resLabs.join('\n')));
  });

  it('returns an empty list when there are no usable sets', () => {
    assert.deepEqual(clusterDayLabSets([]), []);
    assert.deepEqual(clusterDayLabSets([{ id: 'x', fecha: '13/08/2026', resLabs: [] }]), []);
  });
});

describe('buildDayLabView', () => {
  it('exposes the day fecha and newest-first groups', () => {
    var view = buildDayLabView([
      set('a', '13/08/2026', '11:40', ['BH\tHb 8.0*']),
      set('b', '13/08/2026', '04:23', ['QS\tCr 1.2*']),
    ]);
    assert.equal(view.fecha, '13/08/2026');
    assert.equal(view.groups.length, 2);
    assert.equal(view.groups[0].hora, '11:40');
  });

  it('buildDayOutputPayload wraps the newest group for replay', () => {
    var payload = buildDayOutputPayload({
      rows: [
        { set: set('a', '13/08/2026', '11:40', ['BH\tHb 8.0*']) },
        { set: set('b', '13/08/2026', '04:23', ['QS\tCr 1.2*']) },
      ],
    });
    assert.ok(payload);
    assert.equal(payload.newest.hora, '11:40');
    assert.equal(payload.view.groups.length, 2);
    assert.ok(payload.result.resLabs.some(function (row) {
      return /BH/.test(String(row));
    }));
  });

  it('keeps Tablas/diagramas on a labwork group when newest is cultivo', () => {
    var some =
      'Expediente: 1\nNombre: X\nHEMATOLOGÍA\nBH Hb 12.3';
    var payload = buildDayOutputPayload({
      rows: [
        {
          set: {
            id: 'cult',
            fecha: '11/08/2026',
            hora: '21:21',
            resLabs: ['UROCULTIVO: NEGATIVO'],
            sourceText: 'cultivo crudo',
          },
        },
        {
          set: {
            id: 'labs',
            fecha: '11/08/2026',
            hora: '09:32',
            resLabs: ['BH\tHb 12.3*'],
            sourceText: some,
          },
        },
      ],
    });
    assert.ok(payload);
    assert.equal(payload.newest.tipoLabel, 'Cultivo');
    assert.equal(payload.labwork.tipoLabel, 'Labs');
    assert.match(payload.result.sourceText, /Expediente/);
    assert.ok(payload.result.resLabs.some(function (row) {
      return /BH/.test(String(row));
    }));
  });
});

describe('pickLabworkGroup / pickSomeSourceText', () => {
  it('skips cultivo for diagrams and prefers a SOME source', () => {
    var groups = [
      { tipoLabel: 'Cultivo', resLabs: ['UROCULTIVO: NEGATIVO'], sourceText: 'cultivo' },
      {
        tipoLabel: 'Labs',
        resLabs: ['BH\tHb 8'],
        sourceText: 'Expediente: 1\nNombre: X\nHEMATOLOGÍA',
      },
    ];
    assert.equal(pickLabworkGroup(groups).tipoLabel, 'Labs');
    assert.match(pickSomeSourceText(groups), /Expediente/);
  });
});

describe('findDayForHistoryRef / resolveSelectedDayKey', () => {
  function idFn(s) {
    return String(s.id);
  }
  var days = [
    { dayKey: '13/08/2026', rows: [{ set: { id: 'a' }, idx: 0 }] },
    { dayKey: '12/08/2026', rows: [{ set: { id: 'b' }, idx: 1 }] },
  ];

  it('resolves a day: value and a raw set id', () => {
    assert.equal(findDayForHistoryRef(days, 'day:12/08/2026', idFn).dayKey, '12/08/2026');
    assert.equal(findDayForHistoryRef(days, 'b', idFn).dayKey, '12/08/2026');
    assert.equal(findDayForHistoryRef(days, 'missing', idFn), null);
  });

  it('prefers an explicit day, then a set id, then the newest day', () => {
    assert.equal(resolveSelectedDayKey(days, 'day:12/08/2026', idFn), '12/08/2026');
    assert.equal(resolveSelectedDayKey(days, 'b', idFn), '12/08/2026');
    assert.equal(resolveSelectedDayKey(days, '', idFn), '13/08/2026');
  });
});

describe('filterOutDaySets', () => {
  it('drops sets by identity or id', () => {
    var keep = { id: 'keep' };
    var gone = { id: 'gone' };
    var day = { rows: [{ set: gone, idx: 0 }] };
    assert.deepEqual(filterOutDaySets([keep, gone], day), [keep]);
    assert.deepEqual(filterOutDaySets([keep, { id: 'gone' }], day), [keep]);
  });
});

describe('buildLabHistoryDayOptionsHtml', () => {
  it('emits one option per day, not per envío', () => {
    var html = buildLabHistoryDayOptionsHtml(
      [{ dayKey: '13/08/2026' }, { dayKey: '12/08/2026' }],
      '13/08/2026'
    );
    assert.match(html, /value="day:13\/08\/2026"/);
    assert.match(html, /selected/);
    assert.match(html, />13\/08\/2026</);
    assert.match(html, />12\/08\/2026</);
    assert.equal(html.includes('optgroup'), false);
    assert.equal((html.match(/<option/g) || []).length, 2);
  });
});
