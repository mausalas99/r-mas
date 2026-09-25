import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  mergeCloudUsersForEquipos,
  filterTeamsBySala,
  applyEquiposClientFilters,
  sortEquiposRowsForAdmin,
} from './panel-admin-equipos-data.mjs';

const _equiposDir = dirname(fileURLToPath(import.meta.url));
const assignSrc = readFileSync(join(_equiposDir, 'panel-admin-equipos-actions.mjs'), 'utf8');
const bulkSrc = readFileSync(join(_equiposDir, 'panel-admin-equipos-bulk.mjs'), 'utf8');
import {
  cycleOptionsForTeam,
  equiposListHtml,
  equiposShellHtml,
  renderEquiposAssignTeamOptionsHtml,
  userSalaSelectOptionsHtml,
} from './panel-admin-equipos-html.mjs';
import { formatCycleOptionLabel } from '../clinical-teams/teams-roster-directory-render.mjs';
import {
  equiposPurgeConfirmMessage,
  resolveEquiposTeamSalaScope,
} from './panel-admin-equipos-actions.mjs';

describe('mergeCloudUsersForEquipos', () => {
  it('merges cloud users with local clinical profiles by username', () => {
    const rows = mergeCloudUsersForEquipos(
      [
        { id: 'c1', username: 'r2garcia', display_name: 'García', disabled: false },
        { id: 'c2', username: 'disabled', display_name: 'X', disabled: true },
      ],
      [{ user_id: 'u1', username: 'r2garcia', clinical_name: 'Ana García', rank: 'R2', sala: 'Sala 1' }]
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].user_id, 'u1');
    assert.equal(rows[0].rank, 'R2');
    assert.equal(rows[0].hasLocalProfile, true);
  });

  it('marks cloud-only users without local profile', () => {
    const rows = mergeCloudUsersForEquipos(
      [{ id: 'c3', username: 'newuser', display_name: 'Nuevo', disabled: false }],
      []
    );
    assert.equal(rows[0].hasLocalProfile, false);
    assert.equal(rows[0].clinical_name, 'Nuevo');
    assert.equal(rows[0].rank, 'R1');
  });

  it('includes clinical-only users that have no Nube account', () => {
    const rows = mergeCloudUsersForEquipos(
      [{ id: 'c1', username: 'drmauricios', display_name: 'Mauricio', disabled: false }],
      [
        {
          user_id: 'u-cloud',
          username: 'drmauricios',
          clinical_name: 'Dr. Mauricio',
          rank: 'R1',
          sala: 'Sala 2',
        },
        {
          user_id: 'u-test',
          username: 'teasteagtag',
          clinical_name: 'TEASTEATA',
          rank: 'R1',
          sala: 'Sala 2',
        },
      ]
    );
    assert.equal(rows.length, 2);
    const testRow = rows.find((r) => r.username === 'teasteagtag');
    assert.ok(testRow);
    assert.equal(testRow.clinicalOnly, true);
    assert.equal(testRow.hasLocalProfile, true);
    assert.equal(testRow.user_id, 'u-test');
  });
});

describe('filterTeamsBySala', () => {
  it('filters teams by sala when set', () => {
    const teams = [
      { team_id: 't1', sala: 'Sala 1' },
      { team_id: 't2', sala: 'Sala 2' },
    ];
    assert.equal(filterTeamsBySala(teams, 'Sala 1').length, 1);
    assert.equal(filterTeamsBySala(teams, '').length, 2);
  });
});

describe('sortEquiposRowsForAdmin', () => {
  it('puts unassigned and unused users first', () => {
    const teams = [
      {
        team_id: 't1',
        name: 'A',
        sala: 'Sala 1',
        members: [{ user_id: 'u-assigned' }],
      },
    ];
    const sorted = sortEquiposRowsForAdmin(
      [
        {
          user_id: 'u-assigned',
          username: 'zzz',
          last_activity_at: new Date().toISOString(),
        },
        { user_id: 'u-idle', username: 'aaa', last_activity_at: '' },
        {
          user_id: 'u-active-free',
          username: 'mmm',
          last_activity_at: new Date().toISOString(),
        },
      ],
      teams
    );
    assert.equal(sorted[0].username, 'aaa');
    assert.equal(sorted[1].username, 'mmm');
    assert.equal(sorted[2].username, 'zzz');
  });
});

describe('equiposShellHtml', () => {
  it('includes search, sala filter and assign hint', () => {
    const html = equiposShellHtml();
    assert.match(html, /data-admin-equipos-search/);
    assert.match(html, /data-admin-equipos-sala/);
    assert.match(html, /Guardar seleccionados/);
    assert.match(html, /no quitan las marcas/i);
    assert.match(html, /cuenta Nube/i);
    assert.match(html, /Restablecer clave/i);
    assert.match(html, /data-admin-equipos-activity/);
    assert.match(html, /data-admin-equipos-team-status/);
    assert.match(html, /refresh-equipos/);
    assert.match(html, /save-equipos-bulk/);
    assert.match(html, /purge-equipos-bulk/);
    assert.match(html, /Quitar seleccionados/);
    assert.match(html, /data-admin-equipos-select-all/);
  });
});

describe('userSalaSelectOptionsHtml', () => {
  it('lists clinical salas with selected value', () => {
    const html = userSalaSelectOptionsHtml('Interconsultas');
    assert.match(html, /option value=""/);
    assert.match(html, /Interconsultas" selected/);
    assert.match(html, /Área A\/Pensionistas/);
  });
});

describe('formatCycleOptionLabel rank labels', () => {
  it('labels Interconsultas R3 as Ciclo R3, not R2', () => {
    assert.equal(formatCycleOptionLabel('A', 'R3'), 'Ciclo R3 · A');
    assert.equal(formatCycleOptionLabel('B', 'R2'), 'Ciclo R2 · B');
    assert.equal(formatCycleOptionLabel('A1', 'R1'), 'Subciclo R1 · A1');
  });

  it('cycleOptionsForTeam for Interconsultas R3 offers A–D as Ciclo R3', () => {
    const html = cycleOptionsForTeam(
      { service: 'Interconsultas', sala: 'Interconsultas', members: [] },
      'u-axel',
      'R3',
      'A'
    );
    assert.match(html, /Ciclo R3 · A/);
    assert.doesNotMatch(html, /Ciclo R2 ·/);
  });
});

describe('renderEquiposAssignTeamOptionsHtml', () => {
  const sampleTeams = [
    { team_id: 's1', name: 'Dr. Adrián', sala: 'Sala 1', sub_area_fraction: 'A', members: [] },
    {
      team_id: 'i1',
      name: 'Dra. Astrid/Arturo',
      sala: 'Interconsultas',
      sub_area_fraction: 'A',
      members: [],
    },
    { team_id: 'ux1', name: 'Dra. Laura', sala: 'UX', sub_area_fraction: 'A', members: [] },
    { team_id: 'e1', name: 'Dr. Manuel', sala: 'Eme', sub_area_fraction: 'A', members: [] },
    {
      team_id: 'a1',
      name: 'Dra. Katia',
      sala: 'Área A/Pensionistas',
      sub_area_fraction: 'A',
      members: [],
    },
  ];

  it('groups teams by sala so Inters/UX appear even with Sala teams present', () => {
    const html = renderEquiposAssignTeamOptionsHtml(sampleTeams, '');
    assert.match(html, /optgroup label="Sala 1"/);
    assert.match(html, /optgroup label="Interconsultas"/);
    assert.match(html, /optgroup label="UX"/);
    assert.match(html, /optgroup label="Eme"/);
    assert.match(html, /optgroup label="Área A\/Pensionistas"/);
    assert.match(html, /Dra\. Astrid\/Arturo/);
  });

  it('filters Equipo options to one sala when salaFilter is set', () => {
    const html = renderEquiposAssignTeamOptionsHtml(sampleTeams, '', 'Sala 1');
    assert.match(html, /Dr\. Adrián/);
    assert.match(html, /optgroup label="Sala 1"/);
    assert.doesNotMatch(html, /optgroup label="UX"/);
    assert.doesNotMatch(html, /Dra\. Laura/);
    assert.doesNotMatch(html, /Interconsultas/);
  });

  it('keeps selected team even if outside salaFilter', () => {
    const html = renderEquiposAssignTeamOptionsHtml(sampleTeams, 'ux1', 'Sala 1');
    assert.match(html, /value="ux1"/);
    assert.match(html, /Dr\. Adrián/);
  });
});

describe('equiposListHtml', () => {
  it('renders assign controls per user row', () => {
    const html = equiposListHtml(
      [
        {
          user_id: 'u1',
          username: 'r2test',
          clinical_name: 'Test',
          rank: 'R2',
          sala: 'Sala 1',
          hasLocalProfile: true,
        },
      ],
      [{ team_id: 't1', name: 'Equipo A', sala: 'Sala 1', service: 'Sala', members: [] }]
    );
    assert.match(html, /cloud-sync-admin-equipos-row/);
    assert.match(html, /data-admin-equipos-select/);
    assert.match(html, /cloud-sync-admin-equipos-user-sala/);
    assert.match(html, /cloud-sync-admin-equipos-activity/);
    assert.match(html, /Sin actividad registrada/);
    assert.match(html, /data-activity="none"/);
    assert.doesNotMatch(html, /data-admin-action="assign-equipo"/);
    assert.doesNotMatch(html, /Guardar perfil/);
    assert.match(html, /purge-equipo-user/);
    assert.match(html, /cloud-sync-admin-equipos-rank/);
    assert.match(html, /cloud-sync-admin-equipos-field-label">Sala</);
    assert.match(html, /cloud-sync-admin-equipos-field-label">Rango</);
    assert.match(html, /cloud-sync-admin-equipos-field-label">Equipo</);
    assert.match(html, /cloud-sync-admin-equipos-field-label">Ciclo</);
    assert.match(html, /Sin asignar/);
    assert.doesNotMatch(html, /title="Sala clínica"/);
    assert.match(html, /@r2test/);
  });

  it('shows última actividad relative and absolute on the badge', () => {
    const html = equiposListHtml(
      [
        {
          user_id: 'u-cindy',
          username: 'cindy',
          clinical_name: 'Cindy',
          rank: 'R1',
          sala: 'Sala 1',
          last_activity_at: new Date().toISOString(),
          hasLocalProfile: true,
        },
      ],
      []
    );
    assert.match(html, /Última:/);
    assert.match(html, /data-activity="has"/);
    assert.doesNotMatch(html, />Activo</);
  });

  it('renders activity history line when present', () => {
    const html = equiposListHtml(
      [
        {
          user_id: 'u-cindy',
          username: 'cindypsc',
          clinical_name: 'Cindy',
          rank: 'R1',
          sala: 'Sala E',
          last_activity_at: '2026-08-07T16:00:00.000Z',
          activity_history: [
            { at: '2026-08-07T16:00:00.000Z', source: 'session' },
            { at: '2026-06-10T08:00:00.000Z', source: 'seed_created' },
          ],
          hasLocalProfile: true,
          clinicalOnly: true,
        },
      ],
      []
    );
    assert.match(html, /cloud-sync-admin-equipos-history-btn/);
    assert.match(html, /data-admin-action="equipos-activity-history"/);
    assert.match(html, /data-equipos-history=/);
    assert.match(html, /session/);
    assert.match(html, /seed_created/);
  });

  it('scopes Equipo options to the row sala', () => {
    const html = equiposListHtml(
      [
        {
          user_id: 'u1',
          username: 'r1test',
          clinical_name: 'Test',
          rank: 'R1',
          sala: 'Sala 1',
          hasLocalProfile: true,
        },
      ],
      [
        { team_id: 's1', name: 'Dr. Adrián', sala: 'Sala 1', members: [] },
        { team_id: 'ux1', name: 'Dra. Laura', sala: 'UX', members: [] },
      ]
    );
    assert.match(html, /Dr\. Adrián/);
    assert.doesNotMatch(html, /Dra\. Laura/);
  });

  it('shows Quitar for cloud-only Nuevo rows (no local user_id)', () => {
    const html = equiposListHtml(
      [
        {
          user_id: '',
          username: 'local_6128e5c0db',
          clinical_name: 'Hector Guerra',
          rank: 'R1',
          sala: '',
          cloudId: 'cloud-hector-1',
          hasLocalProfile: false,
          clinicalOnly: false,
        },
      ],
      []
    );
    assert.match(html, /Nuevo/);
    assert.match(html, /purge-equipo-user/);
    assert.match(html, /data-cloud-id="cloud-hector-1"/);
    assert.match(html, />Quitar</);
    assert.match(html, /cloud-sync-admin-equipos-nube/);
    assert.match(html, /delete-user/);
  });

  it('shows Restablecer clave for rows with cuenta Nube', () => {
    const html = equiposListHtml(
      [
        {
          user_id: 'u-cindy',
          username: 'cindy',
          clinical_name: 'Cindy',
          rank: 'R2',
          sala: 'Sala 1',
          cloudId: 'cloud-cindy-1',
          hasLocalProfile: true,
          clinicalOnly: false,
        },
        {
          user_id: 'u-solo',
          username: 'r1solo',
          clinical_name: 'Solo clínico',
          rank: 'R1',
          sala: 'Sala 1',
          cloudId: '',
          hasLocalProfile: true,
          clinicalOnly: true,
        },
      ],
      []
    );
    assert.match(html, /data-admin-action="reset-password"/);
    assert.match(html, /data-user-id="cloud-cindy-1"/);
    assert.match(html, /Restablecer clave/);
    // Clinical-only row has no cloud password to reset.
    const soloIdx = html.indexOf('r1solo');
    const cindyIdx = html.indexOf('cindy');
    assert.ok(cindyIdx >= 0 && soloIdx >= 0);
    const cindyBlock = html.slice(cindyIdx, soloIdx > cindyIdx ? soloIdx : html.length);
    assert.match(cindyBlock, /reset-password/);
    assert.doesNotMatch(html.slice(soloIdx), /reset-password/);
  });
});

describe('admin Equipos publish after reassignment', () => {
  it('single Assign publishes clinicalOps to all team salas', () => {
    assert.match(assignSrc, /publishClinicalTeamsAfterChange\(\)/);
    assert.match(assignSrc, /admin-equipos-assign/);
  });

  it('bulk Guardar publishes clinicalOps to all team salas', () => {
    const start = bulkSrc.indexOf('export async function handleCloudEquiposBulkSave');
    assert.ok(start >= 0);
    const body = bulkSrc.slice(start, start + 2200);
    assert.match(body, /publishAfterBulkSave\(/);
    assert.match(body, /admin-equipos-bulk/);
    assert.match(bulkSrc, /publishClinicalTeamsAfterChange\(\)/);
  });
});

describe('equiposPurgeConfirmMessage', () => {
  it('describes cloud-only vs local purge', () => {
    assert.match(
      equiposPurgeConfirmMessage('local_abc', { hasCloud: true, hasLocal: false }),
      /nube/i
    );
    assert.match(
      equiposPurgeConfirmMessage('cindy', { hasCloud: true, hasLocal: true }),
      /nube y de la base clínica/i
    );
    assert.match(
      equiposPurgeConfirmMessage('r1solo', { hasCloud: false, hasLocal: true }),
      /No hay cuenta Nube/i
    );
  });
});

describe('resolveEquiposTeamSalaScope', () => {
  it('prefers row sala over toolbar sala', () => {
    if (typeof document === 'undefined') return;
    document.body.innerHTML =
      '<div id="root"><select data-admin-equipos-sala><option value="Sala 2" selected>Sala 2</option></select>' +
      '<article class="cloud-sync-admin-equipos-row">' +
      '<select class="cloud-sync-admin-equipos-user-sala"><option value="Sala 1" selected>Sala 1</option></select>' +
      '</article></div>';
    const root = /** @type {HTMLElement} */ (document.getElementById('root'));
    const row = /** @type {HTMLElement} */ (root.querySelector('.cloud-sync-admin-equipos-row'));
    assert.equal(resolveEquiposTeamSalaScope(row, root), 'Sala 1');
    const salaSel = row.querySelector('.cloud-sync-admin-equipos-user-sala');
    if (salaSel instanceof HTMLSelectElement) salaSel.value = '';
    assert.equal(resolveEquiposTeamSalaScope(row, root), 'Sala 2');
    document.body.innerHTML = '';
  });
});

describe('applyEquiposClientFilters', () => {
  it('hides non-matching sala rows but leaves checkbox state alone', () => {
    if (typeof document === 'undefined') return;
    document.body.innerHTML =
      '<div data-admin-equipos-list>' +
      '<article class="cloud-sync-admin-equipos-row" data-sala="Sala 1" data-search="a" data-activity="none" data-has-team="0">' +
      '<input type="checkbox" data-admin-equipos-select checked />' +
      '<select class="cloud-sync-admin-equipos-user-sala"><option value="Sala 1" selected>Sala 1</option></select>' +
      '</article>' +
      '<article class="cloud-sync-admin-equipos-row" data-sala="UX" data-search="b" data-activity="has" data-has-team="1">' +
      '<input type="checkbox" data-admin-equipos-select checked />' +
      '<select class="cloud-sync-admin-equipos-user-sala"><option value="UX" selected>UX</option></select>' +
      '</article></div>';
    const host = /** @type {HTMLElement} */ (document.querySelector('[data-admin-equipos-list]'));
    applyEquiposClientFilters(host, { q: '', sala: 'Sala 1' });
    const rows = [...host.querySelectorAll('.cloud-sync-admin-equipos-row')];
    assert.equal(rows[0].hidden, false);
    assert.equal(rows[1].hidden, true);
    assert.equal(/** @type {HTMLInputElement} */ (rows[1].querySelector('input')).checked, true);
    document.body.innerHTML = '';
  });

  it('hides rows without sala when a sala filter is active', () => {
    if (typeof document === 'undefined') return;
    document.body.innerHTML =
      '<div data-admin-equipos-list>' +
      '<article class="cloud-sync-admin-equipos-row" data-sala="" data-search="nuevo" data-activity="none" data-has-team="0">' +
      '<select class="cloud-sync-admin-equipos-user-sala"><option value="" selected>— Elegir —</option></select>' +
      '</article>' +
      '<article class="cloud-sync-admin-equipos-row" data-sala="Sala 2" data-search="ana" data-activity="none" data-has-team="0">' +
      '<select class="cloud-sync-admin-equipos-user-sala"><option value="Sala 2" selected>Sala 2</option></select>' +
      '</article></div>';
    const host = /** @type {HTMLElement} */ (document.querySelector('[data-admin-equipos-list]'));
    applyEquiposClientFilters(host, { q: '', sala: 'Sala 2' });
    const rows = [...host.querySelectorAll('.cloud-sync-admin-equipos-row')];
    assert.equal(rows[0].hidden, true);
    assert.equal(rows[1].hidden, false);
    document.body.innerHTML = '';
  });

  it('filters sin última actividad / unassigned without clearing checks', () => {
    if (typeof document === 'undefined') return;
    document.body.innerHTML =
      '<div data-admin-equipos-list>' +
      '<article class="cloud-sync-admin-equipos-row" data-activity="none" data-has-team="0" data-search="a">' +
      '<input type="checkbox" data-admin-equipos-select checked /></article>' +
      '<article class="cloud-sync-admin-equipos-row" data-activity="has" data-has-team="0" data-search="b">' +
      '<input type="checkbox" data-admin-equipos-select checked /></article>' +
      '<article class="cloud-sync-admin-equipos-row" data-activity="none" data-has-team="1" data-search="c">' +
      '<input type="checkbox" data-admin-equipos-select checked /></article></div>';
    const host = /** @type {HTMLElement} */ (document.querySelector('[data-admin-equipos-list]'));
    applyEquiposClientFilters(host, { activity: 'none', teamStatus: 'unassigned' });
    const rows = [...host.querySelectorAll('.cloud-sync-admin-equipos-row')];
    assert.equal(rows[0].hidden, false);
    assert.equal(rows[1].hidden, true);
    assert.equal(rows[2].hidden, true);
    assert.ok(rows.every((r) => /** @type {HTMLInputElement} */ (r.querySelector('input')).checked));
    document.body.innerHTML = '';
  });
});
