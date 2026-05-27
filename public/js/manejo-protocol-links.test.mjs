import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  enrichProtocolEntry,
  pathologiesLinkedToProtocol,
  protocolIdsInPathologySections,
  protocolsLinkedToPathology,
} from './manejo-protocol-links.mjs';
import { MANEJO_PROTOCOLS } from './manejo-protocols-catalog.mjs';
import {
  findPathologyById,
  pathologyMatchesSearch,
  pathologyStepCount,
  MANEJO_PATHOLOGIES,
} from './manejo-pathology-catalog.mjs';

test('enrichProtocolEntry agrega metadatos de enlace', () => {
  var entry = enrichProtocolEntry(MANEJO_PROTOCOLS.find(function (p) {
    return p.id === 'nore-standard';
  }));
  assert.ok((entry.useCategories || []).indexOf('vasopresor') >= 0);
  assert.ok((entry.linkedPathologyIds || []).indexOf('septic-shock') >= 0);
});

test('enrichProtocolEntry prioriza linkedPathologyIds custom', () => {
  var entry = enrichProtocolEntry({
    id: 'nore-standard',
    linkedPathologyIds: ['anaphylaxis'],
  });
  assert.deepEqual(entry.linkedPathologyIds, ['anaphylaxis']);
});

test('todas las infusiones enriquecidas siguen en catálogo', () => {
  var bic = enrichProtocolEntry(
    MANEJO_PROTOCOLS.find(function (p) {
      return p.id === 'bicarb-hyperkalemia';
    })
  );
  assert.ok(bic && bic.id === 'bicarb-hyperkalemia');
  assert.ok((bic.linkedPathologyIds || []).indexOf('hyperkalemia-acute') >= 0);
});

test('protocolsLinkedToPathology encuentra infusiones por patología', () => {
  var all = MANEJO_PROTOCOLS.map(enrichProtocolEntry);
  var linked = protocolsLinkedToPathology(all, 'hyperkalemia-acute');
  assert.ok(linked.some(function (p) { return p.id === 'ca-gluconate-bolus'; }));
  assert.ok(linked.some(function (p) { return p.id === 'bicarb-hyperkalemia'; }));
});

test('pathologiesLinkedToProtocol usa entry enriquecido', () => {
  var proto = enrichProtocolEntry(
    MANEJO_PROTOCOLS.find(function (p) {
      return p.id === 'nore-standard';
    })
  );
  var linked = pathologiesLinkedToProtocol(MANEJO_PATHOLOGIES, proto);
  assert.ok(linked.some(function (p) { return p.id === 'septic-shock'; }));
});

test('protocolIdsInPathologySections deduplica ids embebidos', () => {
  var entry = findPathologyById('septic-shock');
  assert.ok(entry);
  var ids = protocolIdsInPathologySections(entry);
  assert.ok(ids.indexOf('nore-standard') >= 0);
  assert.equal(ids.length, new Set(ids).size);
});

test('pathologyMatchesSearch encuentra por rama y título', () => {
  var entry = findPathologyById('status-epilepticus');
  assert.ok(entry);
  assert.ok(pathologyMatchesSearch(entry, 'epil'));
  assert.ok(pathologyMatchesSearch(entry, 'neurolog'));
});

test('catálogo incluye patologías clave del machote', () => {
  var ids = MANEJO_PATHOLOGIES.map(function (p) { return p.id; });
  assert.ok(ids.indexOf('hyperkalemia-acute') >= 0);
  assert.ok(ids.indexOf('pulmonary-embolism') >= 0);
  assert.ok(ids.indexOf('febrile-neutropenia') >= 0);
  assert.ok(ids.indexOf('thyroid-storm') >= 0);
});

test('CAD y EHH migrados a Endocrinología con cadEhhMode', () => {
  var cad = findPathologyById('diabetic-ketoacidosis');
  var ehh = findPathologyById('hyperosmolar-state');
  assert.equal(cad.cadEhhMode, 'cad');
  assert.equal(ehh.cadEhhMode, 'ehh');
  assert.equal(cad.externalTab, undefined);
});

test('pathologyStepCount cuenta pasos clínicos en secciones', () => {
  var entry = findPathologyById('thyroid-storm');
  assert.ok(entry);
  assert.equal(pathologyStepCount(entry), 8);
});
