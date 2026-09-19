import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  patientCardDisplayKey,
  buildPatientListZones,
  buildInterconsultaZones,
  trySilentPatientListPatch,
  updatePatientListDomIncremental,
} from './patient-list-incremental.mjs';

describe('patient-list-incremental', () => {
  it('patientCardDisplayKey changes when visible fields change', () => {
    const ctx = { activeId: 'p1', isRonda: false, showServicioInCard: true };
    const a = patientCardDisplayKey({ id: 'p1', nombre: 'A', cuarto: '1', cama: '2', servicio: 'S' }, ctx);
    const b = patientCardDisplayKey({ id: 'p1', nombre: 'B', cuarto: '1', cama: '2', servicio: 'S' }, ctx);
    assert.notEqual(a, b);
  });

  it('patientCardDisplayKey changes when servicio visibility toggles', () => {
    const p = { id: 'p1', nombre: 'A', cuarto: '1', cama: '2', servicio: 'Medicina Interna' };
    const sala = patientCardDisplayKey(p, { showServicioInCard: false });
    const inter = patientCardDisplayKey(p, { showServicioInCard: true });
    assert.notEqual(sala, inter);
  });

  it('buildPatientListZones buckets pinned, active, archived', () => {
    const zones = buildPatientListZones([
      { id: 'a', pinned: true, archived: false },
      { id: 'b', pinned: false, archived: false },
      { id: 'c', pinned: false, archived: true },
    ]);
    assert.equal(zones.pinned.length, 1);
    assert.equal(zones.active.length, 1);
    assert.equal(zones.archived.length, 1);
  });

  it('buildPatientListZones sortByBed orders active patients by cuarto/cama', () => {
    const zones = buildPatientListZones(
      [
        { id: 'b', nombre: 'B', pinned: false, archived: false, cuarto: '305', cama: '1' },
        { id: 'a', nombre: 'A', pinned: false, archived: false, cuarto: '201', cama: '2' },
      ],
      { sortByBed: true }
    );
    assert.deepEqual(
      zones.active.map((p) => p.id),
      ['a', 'b']
    );
  });

  it('buildInterconsultaZones buckets nuevas (no/pendiente status) vs en seguimiento', () => {
    const zones = buildInterconsultaZones([
      { id: 'a', pinned: false, archived: false, consultInfo: { followUpStatus: 'pendiente' } },
      { id: 'b', pinned: false, archived: false }, // no consultInfo at all -> nuevas
      { id: 'c', pinned: false, archived: false, consultInfo: { followUpStatus: 'en_curso' } },
      { id: 'd', pinned: false, archived: false, consultInfo: { followUpStatus: 'resuelta' } },
      { id: 'e', pinned: true, archived: false, consultInfo: { followUpStatus: 'pendiente' } },
      { id: 'f', pinned: false, archived: true, consultInfo: { followUpStatus: 'pendiente' } },
    ]);
    assert.deepEqual(zones.nuevas.map((p) => p.id), ['a', 'b']);
    assert.deepEqual(zones.enSeguimiento.map((p) => p.id), ['c', 'd']);
    assert.deepEqual(zones.pinned.map((p) => p.id), ['e']);
    assert.deepEqual(zones.archived.map((p) => p.id), ['f']);
  });

  it('trySilentPatientListPatch updates only changed card text', () => {
    if (typeof document === 'undefined') return;
    const list = document.createElement('div');
    list.innerHTML =
      '<div class="patient-list-section-label patient-list-section-label--pinned" role="group"><span class="patient-list-section-count">1</span></div>' +
      '<div class="patient-sort-zone" data-patient-zone="pinned">' +
      '<div class="patient-card" data-patient-id="p1" data-display-key="old"><div class="p-name">Old</div></div>' +
      '</div>';

    const zones = buildPatientListZones([
      { id: 'p1', nombre: 'New', pinned: true, archived: false, cuarto: '1', cama: '2', servicio: 'S' },
    ]);
    const renderCard = (p) =>
      `<div class="patient-card" data-patient-id="${p.id}"><div class="p-name">${p.nombre}</div></div>`;

    const ok = trySilentPatientListPatch(list, {
      zones,
      archivedCollapsed: true,
      renderCard,
      ctx: { activeId: null, isRonda: false },
    });
    assert.equal(ok, true);
    assert.match(list.textContent || '', /New/);
    assert.doesNotMatch(list.textContent || '', /Old/);
  });

  it('updatePatientListDomIncremental adds a card without wiping unrelated zones', () => {
    if (typeof document === 'undefined') return;
    const list = document.createElement('div');
    list.innerHTML =
      '<div class="patient-list-section-label" role="group">Pacientes <span class="patient-list-section-count">1</span></div>' +
      '<div class="patient-sort-zone" data-patient-zone="active">' +
      '<div class="patient-card" data-patient-id="p1" data-display-key="k1"><div class="p-name">One</div></div>' +
      '</div>';

    const zones = buildPatientListZones([
      { id: 'p1', nombre: 'One', pinned: false, archived: false, cuarto: '1', cama: '1', servicio: 'S' },
      { id: 'p2', nombre: 'Two', pinned: false, archived: false, cuarto: '2', cama: '2', servicio: 'S' },
    ]);

    const ok = updatePatientListDomIncremental(list, {
      zones,
      archivedCollapsed: true,
      isRonda: false,
      renderCard: (p) =>
        `<div class="patient-card" data-patient-id="${p.id}"><div class="p-name">${p.nombre}</div></div>`,
      renderPinnedLabel: () => '<div class="patient-list-section-label patient-list-section-label--pinned"></div>',
      renderActiveLabel: () =>
        '<div class="patient-list-section-label" role="group">Pacientes <span class="patient-list-section-count">2</span></div>',
      renderArchivedToggle: () => '<button type="button" class="patient-list-section-toggle"></button>',
      ctx: { activeId: null, isRonda: false },
    });

    assert.equal(ok, true);
    assert.equal(list.querySelectorAll('.patient-card').length, 2);
    assert.match(list.textContent || '', /Two/);
  });
});
