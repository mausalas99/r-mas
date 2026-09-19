import { normalizeName } from './validate.mjs';

function tokens(text) {
  return String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9áéíóúñü+]+/i)
    .filter((part) => part.length > 1);
}

function scoreEntity(entity, queryTokens) {
  const hay = tokens(`${entity.name} ${entity.description || ''} ${entity.type}`);
  let hits = 0;
  for (const token of queryTokens) {
    if (hay.includes(token)) hits += 1;
  }
  return hits;
}

export function resolveEntities(query, graph, { limit = 8 } = {}) {
  const queryTokens = tokens(query);
  if (!queryTokens.length) return [];
  const ranked = (graph.entities || [])
    .map((entity) => ({ entity, score: scoreEntity(entity, queryTokens) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.entity.name.localeCompare(b.entity.name));
  return ranked.slice(0, limit).map((row) => row.entity);
}

function nameKey(name) {
  return normalizeName(name).toLowerCase();
}

function expandBound(value, bound) {
  if (!value) return bound === 'start' ? '0000-01-01' : '9999-12-31';
  if (/^\d{4}$/.test(value)) {
    return bound === 'start' ? `${value}-01-01` : `${value}-12-31`;
  }
  if (/^\d{4}-\d{2}$/.test(value)) {
    return bound === 'start' ? `${value}-01` : `${value}-31`;
  }
  return value.slice(0, 10);
}

function edgeActiveAt(edge, at) {
  if (!at) return true;
  const atStart = expandBound(at, 'start');
  const atEnd = expandBound(at, 'end');
  const from = expandBound(edge.valid_from, 'start');
  const until = expandBound(edge.valid_until, 'end');
  return from <= atEnd && until >= atStart;
}

export function temporalFilter(edges, at) {
  return (edges || []).filter((edge) => edgeActiveAt(edge, at));
}

export function relevantSubgraph(seeds, graph, { hops = 1, at } = {}) {
  const seedNames = new Set((seeds || []).map((entity) => nameKey(entity.name)));
  const allowedEdges = temporalFilter(graph.edges || [], at);
  const keptEdges = [];
  const frontier = new Set(seedNames);
  for (let hop = 0; hop < hops; hop += 1) {
    const next = new Set();
    for (const edge of allowedEdges) {
      const src = nameKey(edge.source);
      const tgt = nameKey(edge.target);
      if (frontier.has(src) || frontier.has(tgt)) {
        keptEdges.push(edge);
        next.add(src);
        next.add(tgt);
      }
    }
    for (const name of next) frontier.add(name);
  }
  const entities = (graph.entities || []).filter((entity) =>
    frontier.has(nameKey(entity.name))
  );
  return { entities, edges: uniqueEdges(keptEdges) };
}

function uniqueEdges(edges) {
  const seen = new Set();
  const out = [];
  for (const edge of edges) {
    const key = `${edge.source}|${edge.relation}|${edge.target}|${edge.valid_from || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(edge);
  }
  return out;
}

export function assembleEvidence(subgraph) {
  const entities = subgraph.entities || [];
  const edges = subgraph.edges || [];
  return {
    entityCount: entities.length,
    edgeCount: edges.length,
    entities,
    edges,
    citations: edges.map(
      (edge) =>
        `${edge.source} -[${edge.relation}]-> ${edge.target}` +
        (edge.valid_from ? ` (${edge.valid_from}${edge.valid_until ? `–${edge.valid_until}` : ''})` : '')
    ),
  };
}

/**
 * Vector-ish lexical neighborhood + graph structure. Never returns the full graph
 * unless the graph itself is already that small.
 */
export function hybridRetrieve(question, graph, { at, hops = 1, limit = 8 } = {}) {
  const seeds = resolveEntities(question, graph, { limit });
  const subgraph = relevantSubgraph(seeds, graph, { hops, at });
  return {
    seeds,
    evidence: assembleEvidence(subgraph),
  };
}
