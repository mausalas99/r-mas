/**
 * Synthetic pharmacotherapy profiles (no real patients) shared by the old-vs-new HTML test and the
 * capture that made med-pharm-profile-view.old.json. `TODAY` is passed in; nothing reads the clock.
 */
import { buildPharmViewWindow, unifyRowsForWindow, groupUnifiedRowsByMed } from '../med-pharm-view-window.mjs';

export const TODAY = { year: 2026, monthIndex: 10, day: 12 };

function days(list, v) {
  const m = {};
  list.forEach((d) => { m[d] = v || 1; });
  return m;
}

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

function profile() {
  return {
    months: {
      '2026-10': {
        year: 2026,
        monthIndex: 9,
        rows: [
          { rowKey: 'ceftriaxona|1g|q24h|iv', med: 'Ceftriaxona <1 g> & "x"', dosis: '1 g', freq: 'Q24H', via: 'INTRAVENOSA', cat: 'ANTIBIÓTICO', days: days(range(20, 31)), notAdmin: { 22: true } },
          { rowKey: 'omeprazol|20|q24h|vo', med: 'Omeprazol', dosis: '20 mg', freq: 'Q24H', via: 'ORAL', cat: 'GASTRO', days: days(range(14, 31)) },
        ],
      },
      '2026-11': {
        year: 2026,
        monthIndex: 10,
        lastSomePasteAt: '2026-11-10T12:00:00.000Z',
        rows: [
          { rowKey: 'ceftriaxona|1g|q24h|iv', med: 'Ceftriaxona <1 g> & "x"', dosis: '1 g', freq: 'Q24H', via: 'INTRAVENOSA', cat: 'ANTIBIÓTICO', days: days(range(1, 12)), notAdmin: { 3: true, 4: true } },
          { rowKey: 'omeprazol|20|q24h|vo', med: 'Omeprazol', dosis: '20 mg', freq: 'Q24H', via: 'ORAL', cat: 'GASTRO', days: days(range(1, 12)) },
          { rowKey: 'enoxaparina|40|q24h|sc', med: 'Enoxaparina', dosis: '40 mg', freq: 'Q24H', via: 'SUBCUTANEA', cat: 'ANTICOAGULANTE', days: days(range(1, 6), 2) },
          { rowKey: 'insulina|10|q8h|sc', med: 'Insulina NPH', dosis: '10 UI', freq: 'Q8H', via: 'SUBCUTANEA', cat: 'ENDOCRINO', days: days(range(2, 12)) },
          { rowKey: 'insulina|14|q8h|sc', med: 'Insulina NPH', dosis: '14 UI', freq: 'Q8H', via: 'SUBCUTANEA', cat: 'ENDOCRINO', days: days(range(8, 12)) },
          { rowKey: 'paracetamol|1g|prn|vo', med: 'Paracetamol', dosis: '1 g', freq: 'PRN', via: '', cat: 'ANALGESIA', days: {} },
          { rowKey: 'salbutamol|2p|q6h|inh', med: 'Salbutamol', dosis: '2 puff', freq: 'Q6H', via: 'INHALADA', cat: 'RESPIRATORIO', days: days([5, 9]), hidden: true },
        ],
      },
    },
  };
}

function build(p, viewYear, viewMonthIndex) {
  const window = buildPharmViewWindow({ profile: p, viewYear, viewMonthIndex, today: TODAY, fimiFecha: '' });
  const unified = unifyRowsForWindow(p, window.columns);
  const groups = groupUnifiedRowsByMed(unified, p, window.columns);
  return { profile: p, window, unified, groups };
}

const cur = build(profile(), 2026, 10);
const past = build(profile(), 2026, 9);
const noData = build({ months: {} }, 2026, 10);
const future = build(profile(), 2027, 2);

export const SCENARIOS = {
  listCurrent: { kind: 'list', ...cur },
  listPast: { kind: 'list', ...past },
  gridFull: { kind: 'grid', ...cur, rows: cur.unified },
  gridPast: { kind: 'grid', ...past, rows: past.unified },
  gridOneVariants: { kind: 'grid', ...cur, rows: cur.unified.filter((r) => r.med === 'Insulina NPH') },
  gridOneSingle: { kind: 'grid', ...cur, rows: cur.unified.filter((r) => r.med === 'Omeprazol') },
  gridNoWindow: { kind: 'grid', ...future, rows: [] },
  emptyColumns: { kind: 'emptyColumns', ...noData },
  emptyFilterHiddenOn: { kind: 'emptyFilter', ...cur, hiddenCount: 2, showHidden: true },
  emptyFilterHiddenOff: { kind: 'emptyFilter', ...cur, hiddenCount: 3, showHidden: false },
  emptyFilterNone: { kind: 'emptyFilter', ...cur, hiddenCount: 0, showHidden: false },
  subtitleMulti: { kind: 'subtitle', ...cur, rows: cur.unified.filter((r) => r.med === 'Insulina NPH') },
  subtitleOne: { kind: 'subtitle', ...cur, rows: cur.unified.filter((r) => r.med === 'Omeprazol') },
};
