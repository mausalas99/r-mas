import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCloudDiagnosticsHumanView } from './cloud-sync-diagnostics-human.mjs';
import { renderCloudNubeDashboardHtml } from './panel-cloud-diagnostics-html.mjs';

describe('panel-cloud-diagnostics-html', () => {
  it('renderCloudNubeDashboardHtml uses inset groups', () => {
    const view = buildCloudDiagnosticsHumanView({
      status: 'idle',
      online: true,
      tokenPresent: true,
      roomId: 'room-1',
      revision: 12,
      transport: 'poll',
      roomSnapshot: { name: 'Sala 1', sala: 'Sala 1', turnKey: '2026-08' },
      outbox: { count: 0, byKind: {} },
    });
    const html = renderCloudNubeDashboardHtml(view);
    assert.match(html, /cloud-sync-inset-group/);
    assert.match(html, /Sala 1/);
    assert.match(html, /Conexión/);
    assert.match(html, /data-cloud-diag-action="retry"/);
    assert.ok(!html.includes('Estado de Nube en un solo panel'));
  });

  it('renderCloudNubeDashboardHtml shows clickable fix alerts only for active sync failures', () => {
    const view = buildCloudDiagnosticsHumanView({
      status: 'error',
      online: true,
      tokenPresent: true,
      roomId: 'room-1',
      transport: 'poll',
      lastCycleOk: false,
      outbox: { count: 0, byKind: {} },
      lastErrors: [
        {
          at: '2026-08-08T14:00:00.000Z',
          op: 'cycle',
          code: '',
          message: 'Cliente Nube no configurado',
        },
      ],
    });
    const html = renderCloudNubeDashboardHtml(view);
    assert.match(html, /Problemas detectados/);
    assert.match(html, /data-cloud-diag-fix="sync_client_not_ready"/);
    assert.match(html, /Cómo arreglar/);
    assert.ok(!html.includes('Cliente Nube no configurado'));
  });

  it('renderCloudNubeDashboardHtml hides stale errors when sync recovered', () => {
    const view = buildCloudDiagnosticsHumanView({
      status: 'idle',
      online: true,
      tokenPresent: true,
      roomId: 'room-1',
      transport: 'poll',
      lastCycleOk: true,
      outbox: { count: 0, byKind: {} },
      lastErrors: [
        {
          at: '2026-08-08T14:00:00.000Z',
          op: 'cycle',
          code: '',
          message: 'Cliente Nube no configurado',
        },
      ],
    });
    const html = renderCloudNubeDashboardHtml(view);
    assert.ok(!html.includes('Problemas detectados'));
  });

  it('renderCloudNubeDashboardHtml shows outbox rows when queue pending', () => {
    const view = buildCloudDiagnosticsHumanView({
      status: 'pending',
      online: true,
      tokenPresent: true,
      roomId: 'room-1',
      transport: 'poll',
      outbox: { count: 3, byKind: { signos: 2, censo: 1 } },
    });
    const html = renderCloudNubeDashboardHtml(view);
    assert.match(html, /Cola por tipo/);
    assert.match(html, /data-cloud-diag-fix="outbox_pending"/);
  });
});
