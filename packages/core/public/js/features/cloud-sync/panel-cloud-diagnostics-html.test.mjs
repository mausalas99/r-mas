import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCloudDiagnosticsHumanView } from './cloud-sync-diagnostics-human.mjs';
import { renderCloudNubeDashboardHtml } from './panel-cloud-diagnostics-html.mjs';

describe('panel-cloud-diagnostics-html', () => {
  it('live channel down (poll): «Sin canal en vivo», Reintentar ahora, numbered steps', () => {
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
    // poll transport = live channel down → warn hero with «Reintentar ahora».
    assert.match(html, /cloud-sync-hero-title">Sin canal en vivo</);
    assert.match(html, /data-cloud-diag-action="retry">Reintentar ahora/);
    const labels = [...html.matchAll(/cloud-sync-chain-label">([^<]+)</g)].map((m) => m[1]);
    assert.deepEqual(labels, ['Internet', 'Sesión', 'Sala', 'En vivo']);
    assert.match(html, /Qué puedes hacer/);
    assert.match(html, /data-cloud-diag-action="copy-report"/);
    assert.match(html, /Todo lo que cambiaste ya está en Nube\./);
    assert.match(html, /Rev\. 12 local · descarga — · envío — · 0 pacientes locales/);
    // No labs waiting → no «Descartar» button.
    assert.doesNotMatch(html, /prune-labs/);
  });

  it('live channel up: ok hero, «Sincronizar ahora», no numbered steps', () => {
    const view = buildCloudDiagnosticsHumanView({
      status: 'idle', online: true, tokenPresent: true, roomId: 'room-1', transport: 'ws',
      roomSnapshot: { sala: 'Sala 1' }, outbox: { count: 0, byKind: {} },
    });
    const html = renderCloudNubeDashboardHtml(view);
    assert.match(html, /data-level="ok"/);
    assert.match(html, /data-cloud-diag-action="sync">Sincronizar ahora/);
    assert.doesNotMatch(html, /Qué puedes hacer/);
    assert.match(html, /cloud-sync-chain-detail">Conectado</);
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
    assert.match(html, /En espera de envío/);
    assert.match(html, /3 cambios/);
    assert.match(html, /<dt>Signos<\/dt><dd>2<\/dd>/);
    assert.match(html, /data-cloud-diag-fix="outbox_pending"/);
  });

  it('labs waiting: offers «Descartar…» with the count and a warning', () => {
    const view = buildCloudDiagnosticsHumanView({
      status: 'pending', online: true, tokenPresent: true, roomId: 'room-1', transport: 'ws',
      outbox: {
        count: 1, byKind: { labs: 2 },
        entries: [{ enqueuedAt: Date.parse('2026-09-26T10:00:00Z') }],
      },
    }, Date.parse('2026-09-26T10:04:00Z'));
    const html = renderCloudNubeDashboardHtml(view);
    assert.match(html, /data-cloud-diag-action="prune-labs"/);
    assert.match(html, /Borra 2 labs sin enviar\. No se puede deshacer\./);
    assert.match(html, /El más antiguo espera desde hace 4 min\./);
  });
});
