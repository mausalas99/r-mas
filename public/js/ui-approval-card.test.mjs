import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildApprovalCardHtml,
  buildApprovalPagerHtml,
  buildConfirmCardHtml,
  wrapApprovalInConflictModal,
  wrapConfirmInConflictModal,
} from './ui-approval-card.mjs';

describe('ui-approval-card', () => {
  it('renders question options and disables primary without answer', () => {
    var html = buildApprovalCardHtml({
      question: '¿Eliminar pacientes?',
      options: ['Sí', 'No'],
      type: 'radio',
      selected: [],
      primaryLabel: 'Confirmar',
    });
    assert.match(html, /¿Eliminar pacientes\?/);
    assert.match(html, /data-approval-opt="0"/);
    assert.match(html, /data-approval-primary[^>]*disabled/);
  });

  it('enables primary when selected', () => {
    var html = buildApprovalCardHtml({
      question: 'Q',
      options: ['A'],
      selected: [0],
      primaryLabel: 'OK',
    });
    assert.doesNotMatch(html, /data-approval-primary disabled/);
    assert.match(html, /aria-pressed="true"/);
  });

  it('builds pager and conflict wrap', () => {
    var pager = buildApprovalPagerHtml(3, 1, false);
    assert.match(pager, /data-approval-page="1"/);
    assert.match(pager, /is-current/);
    var wrap = wrapApprovalInConflictModal('<div>x</div>');
    assert.match(wrap, /lab-conflict-modal/);
  });

  it('renders sent state', () => {
    var html = buildApprovalCardHtml({ sent: true, sentLabel: 'Enviado' });
    assert.match(html, /ui-approval-card--sent/);
    assert.match(html, /Enviado/);
  });

  it('renders simple confirm without radio quiz', () => {
    var html = buildConfirmCardHtml({
      question: '¿Eliminar este paciente?',
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
    });
    assert.match(html, /ui-approval-card--confirm/);
    assert.match(html, /ui-confirm-title/);
    assert.match(html, /¿Eliminar este paciente\?/);
    assert.match(html, /data-approval-confirm/);
    assert.match(html, /data-approval-cancel/);
    assert.doesNotMatch(html, /data-approval-opt/);
    assert.doesNotMatch(html, /data-approval-primary/);
    assert.doesNotMatch(html, /data-approval-dismiss/);
  });

  it('renders confirm title, lead and patient list', () => {
    var html = buildConfirmCardHtml({
      title: 'Quitar de esta Mac',
      question: 'Un admin lo eliminó en Nube.',
      items: ['Ana · 123'],
      confirmLabel: 'Eliminar aquí',
      cancelLabel: 'Conservar aquí',
    });
    assert.match(html, /Quitar de esta Mac/);
    assert.match(html, /ui-confirm-lead/);
    assert.match(html, /Un admin lo eliminó en Nube/);
    assert.match(html, /<li>Ana · 123<\/li>/);
    assert.match(html, /Eliminar aquí/);
    var wrap = wrapConfirmInConflictModal(html);
    assert.match(wrap, /ui-confirm-modal/);
    assert.match(wrap, /material-glass/);
    assert.match(wrap, /role="dialog"/);
  });
});
