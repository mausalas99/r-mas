import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAdminShellHtml,
  resumenHtml,
  bootstrapHtml,
  adminSkeletonHtml,
  salasTableHtml,
  peligroHtml,
} from './panel-admin-html.mjs';

describe('buildAdminShellHtml', () => {
  it('uses tabs instead of details accordion', () => {
    const html = buildAdminShellHtml(true);
    assert.match(html, /role="tablist"/);
    assert.match(html, /data-admin-tab="resumen"/);
    assert.match(html, /data-admin-tab="salas"/);
    assert.match(html, /data-admin-tab="equipos"/);
    assert.match(html, />Usuarios</);
    assert.doesNotMatch(html, /data-admin-tab="usuarios"/);
    assert.match(html, /data-admin-tab="mutaciones"/);
    assert.match(html, /data-admin-tab="peligro"/);
    assert.match(html, /data-admin-section="resumen"/);
    assert.doesNotMatch(html, /<details/);
    assert.doesNotMatch(html, /cloud-sync-admin-title/);
    assert.doesNotMatch(html, /Consola de operaciones/);
  });

  it('omits bootstrap when not requested', () => {
    const html = buildAdminShellHtml(false);
    assert.doesNotMatch(html, /data-admin-bootstrap/);
    assert.doesNotMatch(html, /data-admin-key-input/);
  });

  it('includes compact bootstrap when requested', () => {
    const html = bootstrapHtml();
    assert.match(html, /Clave de sesión/);
    assert.match(html, /Promover a admin/);
    assert.doesNotMatch(html, /SYNC_ADMIN_KEY/);
  });
});

describe('resumenHtml', () => {
  it('uses two-column stats with wide storage cell', () => {
    const html = resumenHtml({
      counts: { users: 2, rooms: 3, members: 4, storageBytes: 1024 },
      meters: { storageSoftBytes: 25e6, storageHardBytes: 50e6, maxMembersPerRoom: 12 },
    });
    assert.match(html, /cloud-sync-admin-stats__wide/);
    assert.match(html, /Almacenamiento/);
    assert.match(html, /1\.0 KB/);
    assert.match(html, /cloud-sync-admin-stat-meta/);
    assert.match(html, /data-admin-action="refresh-resumen"/);
  });
});

describe('salasTableHtml', () => {
  it('lists individual ward salas and shows KB storage', () => {
    const html = salasTableHtml([
      {
        id: 'r1',
        sala: 'Sala 1',
        turnKey: '2026-08',
        code: 'RC65RH',
        revision: 1,
        memberCount: 4,
        storageBytes: 4096,
      },
      {
        id: 'r2',
        sala: 'Torre HU',
        turnKey: '2026-08',
        code: 'ABCD12',
        revision: 0,
        memberCount: 1,
        storageBytes: 200,
      },
    ]);
    assert.match(html, /Sala 1/);
    assert.match(html, /propio espacio por mes/);
    assert.match(html, /4\.0 KB/);
    assert.match(html, /200 B/);
    assert.match(html, /Torre HU/);
    assert.doesNotMatch(html, />Storage</);
    assert.doesNotMatch(html, /1 · 2 · E/);
  });
});

describe('peligroHtml', () => {
  it('exposes purge control instead of prose-only list', () => {
    const html = peligroHtml();
    assert.match(html, /data-admin-peligro-room/);
    assert.match(html, /data-admin-action="purge-room-selected"/);
    assert.match(html, /data-admin-tab="equipos"/);
    assert.doesNotMatch(html, /wrangler d1 execute/);
    assert.doesNotMatch(html, /Usá /);
  });
});

describe('adminSkeletonHtml', () => {
  it('renders compact skeleton bars', () => {
    const html = adminSkeletonHtml();
    assert.match(html, /cloud-sync-admin-skeleton/);
    assert.match(html, /aria-busy="true"/);
  });
});
