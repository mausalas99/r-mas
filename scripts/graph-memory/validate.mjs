import {
  ALLOWED_ENTITY_TYPES,
  ALLOWED_RELATIONS,
  FORBIDDEN_ENTITY_TYPES,
} from './schema.mjs';

export function normalizeName(name) {
  return String(name || '')
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ');
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function looksLikeRegistro(name) {
  return /^\d{6,10}$/.test(normalizeName(name));
}

function entityKey(entity) {
  return `${entity.type}:${normalizeName(entity.name).toLowerCase()}`;
}

function existingNameSet(graph) {
  const names = new Set();
  const entities = graph?.entities || [];
  for (const entity of entities) {
    const name = normalizeName(entity.name);
    if (name) names.add(name.toLowerCase());
  }
  return names;
}

function pushError(errors, path, message) {
  errors.push({ path, message });
}

function validateEntityShape(entity, index, errors) {
  const path = `entities[${index}]`;
  if (!isPlainObject(entity)) {
    pushError(errors, path, 'must be an object');
    return null;
  }
  const name = normalizeName(entity.name);
  const type = String(entity.type || '')
    .trim()
    .toLowerCase();
  if (!name) pushError(errors, `${path}.name`, 'required');
  if (!type) pushError(errors, `${path}.type`, 'required');
  if (type && FORBIDDEN_ENTITY_TYPES.has(type)) {
    pushError(errors, `${path}.type`, `forbidden clinical type "${type}"`);
  }
  if (type && !ALLOWED_ENTITY_TYPES.has(type) && !FORBIDDEN_ENTITY_TYPES.has(type)) {
    pushError(errors, `${path}.type`, `unsupported type "${type}"`);
  }
  if (looksLikeRegistro(name)) {
    pushError(errors, `${path}.name`, 'looks like a clinical registro');
  }
  return { name, type, description: String(entity.description || '').trim() };
}

function parseTemporal(value) {
  if (value == null || value === '') return null;
  const text = String(value).trim();
  if (/^\d{4}$/.test(text)) return text;
  if (/^\d{4}-\d{2}$/.test(text)) return text;
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  return undefined;
}

function temporalOrder(a, b) {
  if (!a || !b) return 0;
  return a <= b ? 0 : 1;
}

function validateEdgeShape(edge, index, knownNames, errors) {
  const path = `edges[${index}]`;
  if (!isPlainObject(edge)) {
    pushError(errors, path, 'must be an object');
    return null;
  }
  const source = normalizeName(edge.source);
  const target = normalizeName(edge.target);
  const relation = String(edge.relation || '')
    .trim()
    .toLowerCase();
  if (!source) pushError(errors, `${path}.source`, 'required');
  if (!target) pushError(errors, `${path}.target`, 'required');
  if (!relation) pushError(errors, `${path}.relation`, 'required');
  if (relation && !ALLOWED_RELATIONS.has(relation)) {
    pushError(errors, `${path}.relation`, `unsupported relation "${relation}"`);
  }
  if (source && !knownNames.has(source.toLowerCase())) {
    pushError(errors, `${path}.source`, `unknown entity "${source}"`);
  }
  if (target && !knownNames.has(target.toLowerCase())) {
    pushError(errors, `${path}.target`, `unknown entity "${target}"`);
  }
  const validFrom = parseTemporal(edge.valid_from);
  const validUntil = parseTemporal(edge.valid_until);
  if (edge.valid_from && validFrom === undefined) {
    pushError(errors, `${path}.valid_from`, 'use YYYY, YYYY-MM, or YYYY-MM-DD');
  }
  if (edge.valid_until && validUntil === undefined) {
    pushError(errors, `${path}.valid_until`, 'use YYYY, YYYY-MM, or YYYY-MM-DD');
  }
  if (validFrom && validUntil && temporalOrder(validFrom, validUntil) > 0) {
    pushError(errors, path, 'valid_from must be <= valid_until');
  }
  return {
    source,
    target,
    relation,
    valid_from: validFrom || null,
    valid_until: validUntil || null,
  };
}

function dedupeEntities(entities) {
  const byKey = new Map();
  for (const entity of entities) {
    const key = entityKey(entity);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, entity);
      continue;
    }
    if ((entity.description || '').length > (prev.description || '').length) {
      byKey.set(key, entity);
    }
  }
  return [...byKey.values()];
}

function dedupeEdges(edges) {
  const byKey = new Map();
  for (const edge of edges) {
    const key = [
      edge.source.toLowerCase(),
      edge.relation,
      edge.target.toLowerCase(),
      edge.valid_from || '',
    ].join('|');
    byKey.set(key, edge);
  }
  return [...byKey.values()];
}

export function validateExtraction(payload, { existingGraph } = {}) {
  const errors = [];
  if (!isPlainObject(payload)) {
    return { ok: false, errors: [{ path: '$', message: 'payload must be an object' }] };
  }
  if (!Array.isArray(payload.entities)) {
    pushError(errors, 'entities', 'must be an array');
  }
  if (!Array.isArray(payload.edges)) {
    pushError(errors, 'edges', 'must be an array');
  }
  if (errors.length) return { ok: false, errors };

  const entities = [];
  for (let i = 0; i < payload.entities.length; i += 1) {
    const entity = validateEntityShape(payload.entities[i], i, errors);
    if (entity?.name && entity?.type && ALLOWED_ENTITY_TYPES.has(entity.type)) {
      entities.push(entity);
    }
  }

  const knownNames = existingNameSet(existingGraph);
  for (const entity of entities) knownNames.add(entity.name.toLowerCase());

  const edges = [];
  for (let i = 0; i < payload.edges.length; i += 1) {
    const edge = validateEdgeShape(payload.edges[i], i, knownNames, errors);
    if (edge?.source && edge?.target && ALLOWED_RELATIONS.has(edge.relation)) {
      edges.push(edge);
    }
  }

  if (errors.length) return { ok: false, errors, entities, edges };
  return {
    ok: true,
    errors: [],
    facts: {
      entities: dedupeEntities(entities),
      edges: dedupeEdges(edges),
    },
  };
}
