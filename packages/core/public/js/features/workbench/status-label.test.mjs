import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildStatusLabelHtml, statusLabelMeta } from './status-label.mjs';

describe('status-label', () => {
  it('renders the four statuses with the right classes and text', () => {
    assert.match(buildStatusLabelHtml('vencido'), /wb-status--vencido">VENCIDO</);
    assert.match(buildStatusLabelHtml('en_curso'), /wb-status--en-curso">EN CURSO</);
    assert.match(buildStatusLabelHtml('abierto'), /wb-status--abierto">ABIERTO</);
    assert.match(buildStatusLabelHtml('listo'), /wb-status--listo">LISTO</);
  });

  it('rejects an unknown status', () => {
    assert.throws(() => statusLabelMeta('quien-sabe'));
  });
});
