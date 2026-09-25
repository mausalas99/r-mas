import fs from 'node:fs';
import path from 'node:path';
import { normalizeName } from './validate.mjs';

const EMPTY_GRAPH = { entities: [], edges: [] };

export function emptyGraph() {
  return { entities: [], edges: [] };
}

export function createGraphStore(filePath) {
  let graph = emptyGraph();

  function load() {
    if (!filePath || !fs.existsSync(filePath)) {
      graph = emptyGraph();
      return graph;
    }
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    graph = {
      entities: Array.isArray(parsed.entities) ? parsed.entities : [],
      edges: Array.isArray(parsed.edges) ? parsed.edges : [],
    };
    return graph;
  }

  function persist() {
    if (!filePath) return;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(graph, null, 2)}\n`);
  }

  function snapshot() {
    return {
      entities: graph.entities.map((entity) => ({ ...entity })),
      edges: graph.edges.map((edge) => ({ ...edge })),
    };
  }

  function write(facts) {
    const incoming = facts || EMPTY_GRAPH;
    const byKey = new Map(
      graph.entities.map((entity) => [
        `${entity.type}:${normalizeName(entity.name).toLowerCase()}`,
        entity,
      ])
    );
    for (const entity of incoming.entities || []) {
      const key = `${entity.type}:${normalizeName(entity.name).toLowerCase()}`;
      const prev = byKey.get(key);
      if (!prev || (entity.description || '').length > (prev.description || '').length) {
        byKey.set(key, { ...entity, name: normalizeName(entity.name) });
      }
    }
    graph.entities = [...byKey.values()];

    const edgeKeys = new Set(
      graph.edges.map(
        (edge) =>
          `${edge.source.toLowerCase()}|${edge.relation}|${edge.target.toLowerCase()}|${edge.valid_from || ''}`
      )
    );
    for (const edge of incoming.edges || []) {
      const key = `${edge.source.toLowerCase()}|${edge.relation}|${edge.target.toLowerCase()}|${edge.valid_from || ''}`;
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);
      graph.edges.push({ ...edge });
    }
    persist();
    return snapshot();
  }

  load();
  return { load, write, snapshot };
}
