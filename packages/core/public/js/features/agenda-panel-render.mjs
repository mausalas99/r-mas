import {
  addDaysLocal,
  clipEventToDayColumn,
  assignLanesByInterval,
  AGENDA_DISPLAY_FIRST_HOUR,
  AGENDA_DISPLAY_LAST_HOUR_EXCLUSIVE,
  VISUAL_DURATION_MS,
} from '../procedure-agenda-week.mjs';
import { storage } from '../storage.js';

/** @param {Date} monday @param {{ start: Date, endExclusive: Date }} week @param {Record<string, string>} pmap */

export function collectAgendaClipsByDay(monday, week, pmap) {
  const clipsByDay = [[], [], [], [], [], [], []];
  storage.getScheduledProcedures().forEach(function (ev) {
    const evtMs = Date.parse(ev.start);
    if (!Number.isFinite(evtMs)) return;
    if (evtMs >= week.endExclusive.getTime()) return;
    const evEndMs = evtMs + VISUAL_DURATION_MS;
    if (evEndMs <= week.start.getTime()) return;
    if (String(ev.patientId).indexOf('demo-') === 0) return;
    const patientLabel = pmap[ev.patientId] ? pmap[ev.patientId] : 'Paciente desconocido';
    for (let iDay = 0; iDay < 7; iDay += 1) {
      const colDate = addDaysLocal(monday, iDay);
      colDate.setHours(0, 0, 0, 0);
      const clip = clipEventToDayColumn(evtMs, colDate.getTime());
      if (!clip) continue;
      clipsByDay[iDay].push({ ev, clip, patientLabel });
    }
  });
  return clipsByDay;
}

const HOUR_MS = 60 * 60 * 1000;

/** Head cells (weekday label, day number, today / weekend flags). `now` marks today. */
function boardHeadCells(monday, now) {
  const todayKey = now.toDateString();
  const cells = [];
  for (let iDay = 0; iDay < 7; iDay += 1) {
    const colDate = addDaysLocal(monday, iDay);
    cells.push({
      wd: String(colDate.toLocaleDateString('es', { weekday: 'short' })).replace(/\.$/, '').toLowerCase(),
      day: colDate.getDate(),
      isToday: colDate.toDateString() === todayKey,
      isWeekend: iDay >= 5,
    });
  }
  return cells;
}

/** One day column: hour lines plus the event blocks laid out in lanes. */
function boardDayColumn(dayClips, rowPx) {
  const nHours = AGENDA_DISPLAY_LAST_HOUR_EXCLUSIVE - AGENDA_DISPLAY_FIRST_HOUR;
  const intervals = dayClips.map((x) => ({ id: x.ev.id, topMs: x.clip.topMs, botMs: x.clip.botMs }));
  const laneById = intervals.length === 0 ? new Map() : assignLanesByInterval(intervals.slice());
  let laneCount = 1;
  laneById.forEach((ln) => { laneCount = Math.max(laneCount, ln + 1); });
  const pctEach = 100 / laneCount;
  const blocks = dayClips.map(({ ev, clip, patientLabel }) => {
    const lane = laneById.get(ev.id) || 0;
    const startClock = String(
      new Date(ev.start).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
    ).replace('.', '');
    return {
      id: ev.id,
      top: Math.max(0, ((clip.topMs - clip.visStartMs) / HOUR_MS) * rowPx),
      height: Math.max(((clip.botMs - clip.topMs) / HOUR_MS) * rowPx, 18),
      left: laneCount <= 1 ? '3px' : 'calc(' + lane * pctEach + '% + 3px)',
      width: laneCount <= 1 ? 'calc(100% - 6px)' : 'calc(' + pctEach + '% - 10px)',
      flagged: !(ev.materialApproved && ev.anesthesiaScheduled),
      title: (ev.procedure || '') + ' · ' + (ev.location || '') + ' · ' + patientLabel,
      name: String(ev.procedure || ''),
      sub: startClock + ' · ' + (ev.location || ''),
      patient: String(patientLabel),
    };
  });
  return { height: nHours * rowPx, bands: Array.from({ length: nHours }, (_, h) => h % 2 === 1), blocks };
}

/** Everything the board view draws, from the week's clips. Pure: `now` and `rowPx` come in. */
export function buildAgendaBoardModel(monday, clipsByDay, rowPx, now) {
  return {
    rowPx,
    head: boardHeadCells(monday, now),
    times: Array.from(
      { length: AGENDA_DISPLAY_LAST_HOUR_EXCLUSIVE - AGENDA_DISPLAY_FIRST_HOUR },
      (_, i) => String(AGENDA_DISPLAY_FIRST_HOUR + i).padStart(2, '0') + ':00'
    ),
    cols: clipsByDay.map((c) => boardDayColumn(c, rowPx)),
    empty: clipsByDay.every((c) => c.length === 0),
  };
}
