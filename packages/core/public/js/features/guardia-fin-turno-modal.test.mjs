import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildFinTurnoSheetHtml } from './guardia-fin-turno-html.mjs';

describe('guardia-fin-turno-html', () => {
  it('buildFinTurnoSheetHtml lists teams and Enviar N', () => {
    const html = buildFinTurnoSheetHtml([
      {
        sourceTeamId: 't-fer',
        teamLabel: 'Equipo Fer',
        openCount: 2,
        patients: [
          {
            patientId: 'p1',
            guardiaId: 'g1',
            patientLabel: '402 · Pérez',
            itemLabels: ['TAC tórax'],
          },
          {
            patientId: 'p2',
            guardiaId: 'g2',
            patientLabel: '318 · Ruiz',
            itemLabels: ['gasometría'],
          },
        ],
      },
    ]);
    assert.match(html, /2 pendientes abiertos/);
    assert.match(html, /Equipo Fer/);
    assert.match(html, /Enviar 2/);
    assert.match(html, /data-source-team="t-fer"/);
    assert.match(html, /TAC tórax/);
    assert.doesNotMatch(html, /heredar/i);
  });
});
