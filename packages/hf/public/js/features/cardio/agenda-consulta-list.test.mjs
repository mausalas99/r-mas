import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { setPatients } from '../../app-state.mjs';
import {
  buildAgendaConsultaListHtml,
  collectWeekConsultaRows,
} from './agenda-consulta-list.mjs';

/** Wednesday inside a fixed test week: Mon 2026-03-02 .. Sun 2026-03-08. */
const ANCHOR = new Date(2026, 2, 4);
const WEEK = { start: new Date(2026, 2, 2), endExclusive: new Date(2026, 2, 9) };

function ceEntry(overrides) {
  return Object.assign({ date: '2026-02-20', proximaConsultaFecha: '', cerrada: false }, overrides);
}

function cePatient(overrides) {
  return Object.assign(
    { id: 'p1', nombre: 'GOMEZ, ANA', area: 'CONSULTA EXTERNA', cardio: { consultas: [] } },
    overrides
  );
}

describe('agenda-consulta-list', () => {
  it('renders only patients with a consulta due this week', () => {
    setPatients([
      cePatient({
        id: 'due',
        nombre: 'DUE THIS WEEK',
        cardio: { consultas: [ceEntry({ proximaConsultaFecha: '2026-03-04' })] },
      }),
      cePatient({
        id: 'later',
        nombre: 'DUE NEXT MONTH',
        cardio: { consultas: [ceEntry({ proximaConsultaFecha: '2026-04-01' })] },
      }),
      cePatient({ id: 'none', nombre: 'NO FECHA', cardio: { consultas: [ceEntry()] } }),
    ]);
    const rows = collectWeekConsultaRows(WEEK);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].patient.id, 'due');
    assert.equal(rows[0].done, false);
    const html = buildAgendaConsultaListHtml(ANCHOR);
    assert.match(html, /DUE THIS WEEK/);
    assert.doesNotMatch(html, /DUE NEXT MONTH/);
    assert.doesNotMatch(html, /NO FECHA/);
    setPatients([]);
  });

  it('greys out a patient whose this-week visit was already closed, but keeps the row', () => {
    setPatients([
      cePatient({
        id: 'closed',
        nombre: 'YA ATENDIDA',
        cardio: {
          consultas: [
            // Original entry that scheduled the follow-up for this week.
            ceEntry({ date: '2026-02-18', proximaConsultaFecha: '2026-03-05' }),
            // The visit itself happened this week and was closed — a NEW
            // entry, dated today, per consulta-ic-wire's upsertConsultaEntry.
            ceEntry({ date: '2026-03-04', proximaConsultaFecha: '2026-06-01', cerrada: true }),
          ],
        },
      }),
    ]);
    const rows = collectWeekConsultaRows(WEEK);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].done, true);
    const html = buildAgendaConsultaListHtml(ANCHOR);
    assert.match(html, /hf-agenda-row--done/);
    assert.match(html, /YA ATENDIDA/);
    setPatients([]);
  });

  it('ignores patients not in Consulta Externa area', () => {
    setPatients([
      cePatient({
        id: 'sala',
        nombre: 'PACIENTE SALA',
        area: 'SALA 1',
        cardio: { consultas: [ceEntry({ proximaConsultaFecha: '2026-03-04' })] },
      }),
    ]);
    assert.equal(collectWeekConsultaRows(WEEK).length, 0);
    setPatients([]);
  });

  it('shows the empty state when nothing is due', () => {
    setPatients([]);
    const html = buildAgendaConsultaListHtml(ANCHOR);
    assert.match(html, /Sin consultas pendientes/);
  });
});
