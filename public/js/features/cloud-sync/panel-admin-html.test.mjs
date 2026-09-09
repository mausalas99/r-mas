import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAdminShellHtml,
  resumenHtml,
  bootstrapHtml,
  adminSkeletonHtml,
  salasTableHtml,
  redCensusHtml,
  applyNetworkCensusFilters,
  listSelectedNetworkPatients,
  setSelectAllVisibleNetwork,
  peligroHtml,
} from './panel-admin-html.mjs';

describe('buildAdminShellHtml', () => {
  it('uses tabs instead of details accordion', () => {
    const html = buildAdminShellHtml(true);
    assert.match(html, /role="tablist"/);
    assert.match(html, /data-admin-tab="resumen"/);
    assert.match(html, /data-admin-tab="salas"/);
    assert.match(html, /data-admin-tab="red"/);
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

describe('redCensusHtml', () => {
  it('flattens patients from every sala into one sorted table with a switch action', () => {
    const html = redCensusHtml([
      {
        sala: 'Área A/Pensionistas',
        roomId: 'r-a',
        code: 'AAAA',
        entries: [{ id: 'p1', fields: { nombre: 'PEREZ', cama: '3', cuarto: '412', servicio: 'Área A' } }],
      },
      { sala: 'Eme', error: 'Sin sala activa este mes.' },
    ]);
    assert.match(html, /PEREZ/);
    assert.match(html, /412/);
    assert.match(html, /data-admin-action="switch-network-room"/);
    assert.match(html, /data-room-code="AAAA"/);
    assert.match(html, /data-patient-id="p1"/);
    assert.match(html, /Sin sala activa este mes\./);
    assert.match(html, /data-network-filter="sala"/);
    assert.match(html, /data-network-filter="team"/);
    assert.match(html, /data-network-filter="activity"/);
    assert.match(html, /data-sala="Área A\/Pensionistas"/);
  });

  it('marks archived patients and exposes an archive/restore action carrying the room id', () => {
    const html = redCensusHtml([
      {
        sala: 'Eme',
        roomId: 'r-eme',
        code: 'EEEE',
        entries: [{ id: 'p2', fields: { nombre: 'GOMEZ', archived: true } }],
      },
    ]);
    assert.match(html, /Archivado/);
    assert.match(html, /data-admin-action="archive-network-patient"/);
    assert.match(html, /data-room-id="r-eme"/);
    assert.match(html, /data-patient-id="p2"/);
    assert.match(html, /data-archived="1"/);
    assert.match(html, />Restaurar</);
  });

  it('only offers permanent delete for already-archived patients, scoped to that room', () => {
    const archivedHtml = redCensusHtml([
      {
        sala: 'Eme',
        roomId: 'r-eme',
        code: 'EEEE',
        entries: [{ id: 'p2', fields: { nombre: 'GOMEZ', registro: 'REG-9', archived: true } }],
      },
    ]);
    assert.match(archivedHtml, /data-admin-action="delete-network-patient"/);
    assert.match(archivedHtml, /data-room-id="r-eme"/);
    assert.match(archivedHtml, /data-patient-id="p2"/);
    assert.match(archivedHtml, /data-registro="REG-9"/);

    const activeHtml = redCensusHtml([
      {
        sala: 'Eme',
        roomId: 'r-eme',
        code: 'EEEE',
        entries: [{ id: 'p3', fields: { nombre: 'RUIZ' } }],
      },
    ]);
    assert.doesNotMatch(activeHtml, /data-admin-action="delete-network-patient"/);
  });

  it('resolves the team filter option from clinicalOps team assignments', () => {
    const html = redCensusHtml([
      {
        sala: 'Sala 1',
        roomId: 'r1',
        code: 'CCCC',
        entries: [{ id: 'p3', fields: { nombre: 'RUIZ' } }],
        clinicalOps: {
          teams: [{ team_id: 't1', name: 'Equipo Azul' }],
          patient_team_assignment: [{ patient_id: 'p3', team_id: 't1', effective_at: '2020-01-01T00:00:00.000Z' }],
        },
      },
    ]);
    assert.match(html, /Equipo Azul/);
    assert.match(html, /data-team-id="t1"/);
  });

  it('shows an empty state when no patients are visible anywhere', () => {
    const html = redCensusHtml([]);
    assert.match(html, /Sin pacientes en ninguna área/);
  });
});

describe('network census multiselect (bulk archive/delete)', () => {
  it('listSelectedNetworkPatients reads only checked rows; setSelectAllVisibleNetwork skips hidden (filtered-out) rows', () => {
    if (typeof document === 'undefined') {
      assert.ok(true);
      return;
    }
    document.body.innerHTML =
      '<div id="root"><div data-admin-red><table><tbody>' +
      '<tr><td><input type="checkbox" data-network-select data-room-id="r1" data-patient-id="p1" data-registro="R1" data-archived="0" /></td></tr>' +
      '<tr hidden><td><input type="checkbox" data-network-select data-room-id="r2" data-patient-id="p2" data-registro="R2" data-archived="1" /></td></tr>' +
      '<tr><td><input type="checkbox" data-network-select data-room-id="r3" data-patient-id="p3" data-registro="R3" data-archived="1" /></td></tr>' +
      '</tbody></table></div></div>';
    const root = /** @type {HTMLElement} */ (document.getElementById('root'));

    setSelectAllVisibleNetwork(root, true);
    const selected = listSelectedNetworkPatients(root);
    // The hidden (filtered-out) row must not get selected by "select all visible".
    assert.deepEqual(
      selected.map((p) => p.patientId).sort(),
      ['p1', 'p3']
    );
    assert.equal(selected.find((p) => p.patientId === 'p3').archived, true);
    assert.equal(selected.find((p) => p.patientId === 'p1').registro, 'R1');

    setSelectAllVisibleNetwork(root, false);
    assert.equal(listSelectedNetworkPatients(root).length, 0);
    document.body.innerHTML = '';
  });
});

describe('applyNetworkCensusFilters', () => {
  it('hides rows that do not match the selected sala/team/activity filters', () => {
    if (typeof document === 'undefined') {
      assert.ok(true);
      return;
    }
    document.body.innerHTML =
      '<div id="root"><div data-admin-red>' +
      '<select data-network-filter="sala"><option value="" selected>x</option><option value="Eme">Eme</option></select>' +
      '<select data-network-filter="team"><option value="" selected>x</option></select>' +
      '<select data-network-filter="activity"><option value="" selected>x</option></select>' +
      '<table><tbody>' +
      '<tr data-sala="Eme" data-team-id="__sin_equipo__" data-archived="0"><td>A</td></tr>' +
      '<tr data-sala="Sala 1" data-team-id="__sin_equipo__" data-archived="0"><td>B</td></tr>' +
      '</tbody></table></div></div>';
    const root = /** @type {HTMLElement} */ (document.getElementById('root'));
    const salaSelect = root.querySelector('[data-network-filter="sala"]');
    salaSelect.value = 'Eme';
    applyNetworkCensusFilters(root);
    const rows = root.querySelectorAll('tbody tr');
    assert.equal(rows[0].hidden, false);
    assert.equal(rows[1].hidden, true);
    document.body.innerHTML = '';
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
