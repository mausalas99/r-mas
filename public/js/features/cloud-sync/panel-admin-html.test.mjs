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
  listVisibleNetworkRowsWithRegistro,
  markNetworkRowLabsVerified,
  setSelectAllVisibleNetwork,
  peligroHtml,
} from './panel-admin-html.mjs';

function isoDaysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

const COMPLETE_ADMISSION_FIELDS = { cama: '3', cuarto: '412', servicio: 'Área A' };

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
    assert.match(html, /data-network-filter="labs"/);
    assert.match(html, /data-sala="Área A\/Pensionistas"/);
    assert.match(html, /data-no-labs="1"/);
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

  it('offers permanent delete for any patient, active or archived, scoped to that room', () => {
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
    assert.match(activeHtml, /data-admin-action="delete-network-patient"/);
  });

  it('shows who last touched a patient and when, resolving the actor id against the clinical roster', () => {
    const html = redCensusHtml(
      [
        {
          sala: 'Eme',
          roomId: 'r-eme',
          code: 'EEEE',
          entries: [{ id: 'p4', fields: { nombre: 'TORRES' } }],
          entityVersions: {
            'entries/p4': { updatedAt: '2026-09-01T00:00:00.000Z', actorId: 'u1' },
            'entries/p4/fields': { updatedAt: '2026-09-10T00:00:00.000Z', actorId: 'u2' },
          },
        },
      ],
      [{ user_id: 'u2', clinical_name: 'Dra. Emily', username: 'emily' }]
    );
    assert.match(html, /Dra\. Emily/);
    assert.doesNotMatch(html, />u2</);
  });

  it('falls back to the raw actor id when the roster has no match, and to "Sin datos" with no activity', () => {
    const html = redCensusHtml([
      {
        sala: 'Eme',
        roomId: 'r-eme',
        code: 'EEEE',
        entries: [
          { id: 'p5', fields: { nombre: 'DIAZ' } },
          { id: 'p6', fields: { nombre: 'LUNA' } },
        ],
        entityVersions: {
          'entries/p5': { updatedAt: '2026-09-10T00:00:00.000Z', actorId: 'ghost-id' },
        },
      },
    ]);
    assert.match(html, /ghost-id/);
    assert.match(html, /Sin datos/);
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

describe('redCensusHtml stale-labs highlight (probable discharge)', () => {
  it('flags a complete-admission patient whose last lab set write is more than 7 days old', () => {
    const html = redCensusHtml([
      {
        sala: 'Sala 1',
        roomId: 'r1',
        code: 'CCCC',
        entries: [{ id: 'p1', fields: { nombre: 'PEREZ', ...COMPLETE_ADMISSION_FIELDS } }],
        entityVersions: {
          'labSidecars/p1/s1': { updatedAt: isoDaysAgo(10), actorId: 'u1' },
        },
      },
    ]);
    assert.match(html, /cloud-sync-admin-row--stale-labs/);
    assert.match(html, /cloud-sync-admin-stale-labs">hace 10 d/);
  });

  it('does not flag a patient with a lab set write in the last 7 days', () => {
    const html = redCensusHtml([
      {
        sala: 'Sala 1',
        roomId: 'r1',
        code: 'CCCC',
        entries: [{ id: 'p1', fields: { nombre: 'PEREZ', ...COMPLETE_ADMISSION_FIELDS } }],
        entityVersions: {
          'labSidecars/p1/s1': { updatedAt: isoDaysAgo(2), actorId: 'u1' },
        },
      },
    ]);
    assert.doesNotMatch(html, /cloud-sync-admin-row--stale-labs/);
    assert.doesNotMatch(html, /cloud-sync-admin-stale-labs/);
  });

  it('shows "Nunca" and flags a complete-admission patient with no lab entity-version key at all', () => {
    const html = redCensusHtml([
      {
        sala: 'Sala 1',
        roomId: 'r1',
        code: 'CCCC',
        entries: [{ id: 'p1', fields: { nombre: 'PEREZ', ...COMPLETE_ADMISSION_FIELDS } }],
        entityVersions: { 'entries/p1/fields': { updatedAt: isoDaysAgo(1), actorId: 'u1' } },
      },
    ]);
    assert.match(html, /cloud-sync-admin-row--stale-labs/);
    assert.match(html, /cloud-sync-admin-stale-labs">Nunca</);
  });

  it('flags an incomplete admission (no cama/cuarto/servicio yet) with no lab activity — age alone decides', () => {
    const html = redCensusHtml([
      {
        sala: 'Sala 1',
        roomId: 'r1',
        code: 'CCCC',
        entries: [{ id: 'p1', fields: { nombre: 'PEREZ' } }],
      },
    ]);
    assert.match(html, /cloud-sync-admin-row--stale-labs/);
  });

  it('flags an archived patient with no lab activity — age alone decides', () => {
    const html = redCensusHtml([
      {
        sala: 'Sala 1',
        roomId: 'r1',
        code: 'CCCC',
        entries: [{ id: 'p1', fields: { nombre: 'PEREZ', archived: true, ...COMPLETE_ADMISSION_FIELDS } }],
      },
    ]);
    assert.match(html, /cloud-sync-admin-row--stale-labs/);
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

  it('the labs filter reads the stale-labs class, same signal as the row highlight', () => {
    if (typeof document === 'undefined') {
      assert.ok(true);
      return;
    }
    document.body.innerHTML =
      '<div id="root"><div data-admin-red>' +
      '<select data-network-filter="sala"><option value="" selected>x</option></select>' +
      '<select data-network-filter="team"><option value="" selected>x</option></select>' +
      '<select data-network-filter="activity"><option value="" selected>x</option></select>' +
      '<select data-network-filter="labs"><option value="" selected>x</option>' +
      '<option value="stale">s</option><option value="fresh">f</option></select>' +
      '<table><tbody>' +
      '<tr data-sala="Eme" data-team-id="__sin_equipo__" data-archived="0" class="cloud-sync-admin-row--stale-labs"><td>A</td></tr>' +
      '<tr data-sala="Eme" data-team-id="__sin_equipo__" data-archived="0"><td>B</td></tr>' +
      '</tbody></table></div></div>';
    const root = /** @type {HTMLElement} */ (document.getElementById('root'));
    const labsSelect = root.querySelector('[data-network-filter="labs"]');
    labsSelect.value = 'stale';
    applyNetworkCensusFilters(root);
    const rows = root.querySelectorAll('tbody tr');
    assert.equal(rows[0].hidden, false);
    assert.equal(rows[1].hidden, true);

    labsSelect.value = 'fresh';
    applyNetworkCensusFilters(root);
    assert.equal(rows[0].hidden, true);
    assert.equal(rows[1].hidden, false);
    document.body.innerHTML = '';
  });
});

describe('verify-red-labs helpers', () => {
  it('listVisibleNetworkRowsWithRegistro skips hidden rows and rows with no registro', () => {
    if (typeof document === 'undefined') {
      assert.ok(true);
      return;
    }
    document.body.innerHTML =
      '<div id="root"><div data-admin-red><table><tbody>' +
      '<tr><td><input data-network-select data-registro="REG-1" /></td></tr>' +
      '<tr hidden><td><input data-network-select data-registro="REG-2" /></td></tr>' +
      '<tr><td><input data-network-select data-registro="" /></td></tr>' +
      '</tbody></table></div></div>';
    const root = /** @type {HTMLElement} */ (document.getElementById('root'));
    const rows = listVisibleNetworkRowsWithRegistro(root);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].registro, 'REG-1');
    document.body.innerHTML = '';
  });

  it('markNetworkRowLabsVerified updates data-no-labs and the labs cell', () => {
    if (typeof document === 'undefined') {
      assert.ok(true);
      return;
    }
    const html = redCensusHtml([
      {
        sala: 'Eme',
        roomId: 'r-eme',
        code: 'EEEE',
        entries: [
          {
            id: 'p1',
            fields: { nombre: 'PEREZ', registro: 'REG-1', cama: '1', cuarto: '1', servicio: 'MI' },
          },
        ],
      },
    ]);
    document.body.innerHTML = '<div id="root"><div data-admin-red>' + html + '</div></div>';
    const root = /** @type {HTMLElement} */ (document.getElementById('root'));
    const tr = root.querySelector('tbody tr');
    assert.equal(tr.classList.contains('cloud-sync-admin-row--stale-labs'), true);

    markNetworkRowLabsVerified(tr, true);
    assert.equal(tr.getAttribute('data-no-labs'), '0');
    assert.match(tr.innerHTML, /Tiene labs \(verificado\)/);
    assert.equal(tr.classList.contains('cloud-sync-admin-row--stale-labs'), false);

    markNetworkRowLabsVerified(tr, true, '2026-09-01 10:00');
    assert.match(tr.innerHTML, /\(verificado\)/);
    assert.doesNotMatch(tr.innerHTML, /Tiene labs \(verificado\)/);

    markNetworkRowLabsVerified(tr, false);
    assert.equal(tr.getAttribute('data-no-labs'), '1');
    assert.match(tr.innerHTML, /Sin labs \(verificado\)/);
    assert.equal(tr.classList.contains('cloud-sync-admin-row--stale-labs'), true);
    document.body.innerHTML = '';
  });

  it('keeps the highlight for a verified patient whose last lab is over 6 days old', () => {
    if (typeof document === 'undefined') {
      assert.ok(true);
      return;
    }
    const html = redCensusHtml([
      {
        sala: 'Eme',
        roomId: 'r-eme',
        code: 'EEEE',
        entries: [
          {
            id: 'p1',
            fields: { nombre: 'PEREZ', registro: 'REG-1', cama: '1', cuarto: '1', servicio: 'MI' },
          },
        ],
      },
    ]);
    document.body.innerHTML = '<div id="root"><div data-admin-red>' + html + '</div></div>';
    const root = /** @type {HTMLElement} */ (document.getElementById('root'));
    const tr = root.querySelector('tbody tr');
    const toFecha = (d) => d.toISOString().slice(0, 16).replace('T', ' ');

    markNetworkRowLabsVerified(tr, true, toFecha(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)));
    assert.equal(tr.classList.contains('cloud-sync-admin-row--stale-labs'), true);

    markNetworkRowLabsVerified(tr, true, toFecha(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)));
    assert.equal(tr.classList.contains('cloud-sync-admin-row--stale-labs'), false);
    document.body.innerHTML = '';
  });

  it('still highlights a verified-no-labs row even if the patient is archived', () => {
    if (typeof document === 'undefined') {
      assert.ok(true);
      return;
    }
    const html = redCensusHtml([
      {
        sala: 'Eme',
        roomId: 'r-eme',
        code: 'EEEE',
        entries: [
          {
            id: 'p1',
            fields: {
              nombre: 'PEREZ',
              registro: 'REG-1',
              cama: '1',
              cuarto: '1',
              servicio: 'MI',
              archived: true,
            },
          },
        ],
      },
    ]);
    document.body.innerHTML = '<div id="root"><div data-admin-red>' + html + '</div></div>';
    const root = /** @type {HTMLElement} */ (document.getElementById('root'));
    const tr = root.querySelector('tbody tr');
    markNetworkRowLabsVerified(tr, false);
    assert.equal(tr.classList.contains('cloud-sync-admin-row--stale-labs'), true);
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
