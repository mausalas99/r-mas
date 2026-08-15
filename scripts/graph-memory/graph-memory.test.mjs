import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  EXTRACTION_SYSTEM,
  buildExtractionRequest,
  buildBatchRequest,
  planIngest,
  shouldBatch,
  validateExtraction,
  createGraphStore,
  ingestFacts,
  ingestEpisode,
  ingestHistoricalPlan,
  hybridRetrieve,
  temporalFilter,
  relevantSubgraph,
  extractEpisode,
} from './index.mjs';

const EPISODE = 'Ajay worked on Project X with Alice starting 2026-04. Project X depends on Service Y.';

describe('extraction request shape', () => {
  it('puts the stable schema in a cached system prefix and the episode last', () => {
    const a = buildExtractionRequest({
      episodeText: EPISODE,
      occurredAt: '2026-04-01',
    });
    const b = buildExtractionRequest({
      episodeText: 'Sam joined the Nube worker in 2025.',
      occurredAt: '2025-11-02',
    });
    assert.equal(a.system[0].text, EXTRACTION_SYSTEM);
    assert.equal(a.system[0].text, b.system[0].text);
    assert.deepEqual(a.system[0].cache_control, { type: 'ephemeral' });
    assert.equal(a.max_tokens, 2000);
    assert.match(a.messages[0].content, /Ajay worked on Project X/);
    assert.equal(a.system[0].text.includes('Ajay'), false);
    assert.equal(a.system[0].text.includes('Sam joined'), false);
    assert.equal(a.model, 'claude-opus-4-8');
  });

  it('builds a Message Batches payload for historical ingest', () => {
    const plan = planIngest(
      [
        { id: 'e1', episodeText: EPISODE, occurredAt: '2026-04-01' },
        { id: 'e2', episodeText: 'Release 8.1.3 published.', occurredAt: '2026-08-14' },
      ],
      { historical: true }
    );
    assert.equal(plan.mode, 'batch');
    assert.equal(plan.request.requests.length, 2);
    assert.equal(plan.request.requests[0].custom_id, 'e1');
    assert.equal(
      plan.request.requests[0].params.system[0].text,
      plan.request.requests[1].params.system[0].text
    );
    assert.equal(shouldBatch({ historical: true }), true);
    assert.equal(shouldBatch({ episodeCount: 21 }), true);
    assert.equal(shouldBatch({ episodeCount: 2 }), false);
  });

  it('keeps live requests off the batch path', () => {
    const plan = planIngest(
      [{ episodeText: EPISODE, occurredAt: '2026-04-01' }],
      { historical: false }
    );
    assert.equal(plan.mode, 'live');
    assert.equal(plan.requests.length, 1);
  });
});

describe('validation pipeline', () => {
  it('accepts grounded entities and temporal edges', () => {
    const result = validateExtraction({
      entities: [
        { name: 'Ajay', type: 'person', description: 'Engineer' },
        { name: 'Project X', type: 'feature', description: 'Migration' },
        { name: 'Alice', type: 'person', description: 'Collaborator' },
        { name: 'Service Y', type: 'service', description: 'Dependency' },
      ],
      edges: [
        {
          source: 'Ajay',
          target: 'Project X',
          relation: 'worked_on',
          valid_from: '2026-04',
        },
        { source: 'Project X', target: 'Alice', relation: 'involved' },
        { source: 'Project X', target: 'Service Y', relation: 'depends_on' },
      ],
    });
    assert.equal(result.ok, true);
    assert.equal(result.facts.edges[0].valid_from, '2026-04');
  });

  it('rejects invented relationships and clinical identifiers', () => {
    const missingTarget = validateExtraction({
      entities: [{ name: 'Ajay', type: 'person', description: 'Engineer' }],
      edges: [{ source: 'Ajay', target: 'Project X', relation: 'worked_on' }],
    });
    assert.equal(missingTarget.ok, false);
    assert.ok(missingTarget.errors.some((err) => /unknown entity/.test(err.message)));

    const clinical = validateExtraction({
      entities: [{ name: '48151623', type: 'patient', description: 'chart' }],
      edges: [],
    });
    assert.equal(clinical.ok, false);
    assert.ok(clinical.errors.some((err) => /forbidden clinical type/.test(err.message)));
  });

  it('rejects inverted temporal windows', () => {
    const result = validateExtraction({
      entities: [
        { name: 'Alice', type: 'person', description: 'Engineer' },
        { name: 'Company X', type: 'organization', description: 'Employer' },
      ],
      edges: [
        {
          source: 'Alice',
          target: 'Company X',
          relation: 'worked_on',
          valid_from: '2026',
          valid_until: '2024',
        },
      ],
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((err) => /valid_from must be <= valid_until/.test(err.message)));
  });
});

describe('store + ingest', () => {
  let dir;
  let store;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'graph-memory-'));
    store = createGraphStore(path.join(dir, 'graph.json'));
  });

  it('refuses to write invalid extraction', () => {
    const result = ingestFacts(store, {
      entities: [{ name: 'Ajay', type: 'person', description: 'Engineer' }],
      edges: [{ source: 'Ajay', target: 'Missing', relation: 'worked_on' }],
    });
    assert.equal(result.ok, false);
    assert.equal(store.snapshot().edges.length, 0);
  });

  it('writes validated facts and merges duplicates', () => {
    const first = ingestFacts(store, {
      entities: [
        { name: 'Ajay', type: 'person', description: 'Engineer' },
        { name: 'Project X', type: 'feature', description: 'Migration' },
      ],
      edges: [{ source: 'Ajay', target: 'Project X', relation: 'worked_on', valid_from: '2026-04' }],
    });
    const second = ingestFacts(store, {
      entities: [
        { name: 'Ajay', type: 'person', description: 'Engineer on Nube' },
        { name: 'Project X', type: 'feature', description: 'Migration' },
      ],
      edges: [{ source: 'Ajay', target: 'Project X', relation: 'worked_on', valid_from: '2026-04' }],
    });
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    assert.equal(store.snapshot().entities.length, 2);
    assert.equal(store.snapshot().edges.length, 1);
    assert.equal(
      store.snapshot().entities.find((entity) => entity.name === 'Ajay').description,
      'Engineer on Nube'
    );
  });

  it('defers historical episodes to the batch path instead of live extract', async () => {
    const result = await ingestEpisode(
      store,
      { episodeText: EPISODE, occurredAt: '2026-04-01' },
      { historical: true }
    );
    assert.equal(result.mode, 'batch');
    assert.equal(result.deferred, true);
    assert.equal(ingestHistoricalPlan([{ episodeText: EPISODE, occurredAt: '2026-04-01' }]).mode, 'batch');
  });

  it('uses a provided extractFn for live ingest', async () => {
    const result = await ingestEpisode(
      store,
      { episodeText: EPISODE, occurredAt: '2026-04-01' },
      {
        extractFn: async () => ({
          entities: [
            { name: 'Ajay', type: 'person', description: 'Engineer' },
            { name: 'Project X', type: 'feature', description: 'Migration' },
          ],
          edges: [{ source: 'Ajay', target: 'Project X', relation: 'worked_on', valid_from: '2026-04' }],
        }),
      }
    );
    assert.equal(result.ok, true);
    assert.equal(result.mode, 'live');
    assert.equal(store.snapshot().edges.length, 1);
  });
});

describe('traversal', () => {
  const graph = {
    entities: [
      { name: 'Ajay', type: 'person', description: 'Engineer' },
      { name: 'Alice', type: 'person', description: 'Collaborator' },
      { name: 'Project X', type: 'feature', description: 'Migration' },
      { name: 'Service Y', type: 'service', description: 'Dependency' },
      { name: 'Bob', type: 'person', description: 'Other team' },
      { name: 'Unrelated Z', type: 'module', description: 'Noise' },
    ],
    edges: [
      { source: 'Ajay', target: 'Project X', relation: 'worked_on', valid_from: '2026-04', valid_until: null },
      { source: 'Project X', target: 'Alice', relation: 'involved', valid_from: '2026-04', valid_until: null },
      { source: 'Project X', target: 'Service Y', relation: 'depends_on', valid_from: '2026-04', valid_until: null },
      { source: 'Alice', target: 'Unrelated Z', relation: 'worked_on', valid_from: '2024', valid_until: '2025' },
      { source: 'Bob', target: 'Unrelated Z', relation: 'worked_on', valid_from: '2024', valid_until: null },
    ],
  };

  it('returns a relevant subgraph, not the whole graph', () => {
    const result = hybridRetrieve('What was Ajay working on in Project X?', graph);
    const names = result.evidence.entities.map((entity) => entity.name).sort();
    assert.ok(names.includes('Ajay'));
    assert.ok(names.includes('Project X'));
    assert.equal(names.includes('Unrelated Z'), false);
    assert.ok(result.evidence.entityCount < graph.entities.length);
    assert.ok(result.evidence.citations.some((line) => /Ajay -\[worked_on\]-> Project X/.test(line)));
  });

  it('applies temporal filters before reasoning context is assembled', () => {
    const at2026 = temporalFilter(graph.edges, '2026-06');
    assert.equal(
      at2026.some((edge) => edge.source === 'Alice' && edge.target === 'Unrelated Z'),
      false
    );
    const subgraph = relevantSubgraph(
      [{ name: 'Alice', type: 'person' }],
      graph,
      { hops: 1, at: '2026-06' }
    );
    assert.equal(subgraph.edges.some((edge) => edge.target === 'Unrelated Z'), false);
    const earlier = relevantSubgraph(
      [{ name: 'Alice', type: 'person' }],
      graph,
      { hops: 1, at: '2024-06' }
    );
    assert.ok(earlier.edges.some((edge) => edge.target === 'Unrelated Z'));
  });
});

describe('batch request cache prefix', () => {
  it('reuses one extraction schema across the batch', () => {
    const batch = buildBatchRequest([
      { episodeText: 'one', occurredAt: '2026-01-01' },
      { episodeText: 'two', occurredAt: '2026-02-01' },
    ]);
    assert.equal(batch.requests[0].params.system[0].text, EXTRACTION_SYSTEM);
    assert.equal(
      batch.requests[0].params.system[0].cache_control.type,
      'ephemeral'
    );
  });
});

describe('live extract client', () => {
  it('sends the cached system prefix and parses JSON from the assistant', async () => {
    const facts = {
      entities: [
        { name: 'clinicalOps LWW', type: 'decision', description: 'union-on-join' },
        { name: 'Nube sync worker', type: 'service', description: 'CF Worker' },
      ],
      edges: [
        {
          source: 'clinicalOps LWW',
          target: 'Nube sync worker',
          relation: 'located_in',
          valid_from: '2026-08-14',
        },
      ],
    };
    let captured;
    const payload = await extractEpisode(
      { episodeText: 'clinicalOps LWW lives in the Nube worker.', occurredAt: '2026-08-14' },
      {
        apiKey: 'test-key',
        fetchImpl: async (url, init) => {
          captured = { url, init };
          return {
            ok: true,
            json: async () => ({ content: [{ type: 'text', text: JSON.stringify(facts) }] }),
          };
        },
      }
    );
    assert.equal(captured.url, 'https://api.anthropic.com/v1/messages');
    const body = JSON.parse(captured.init.body);
    assert.equal(body.system[0].cache_control.type, 'ephemeral');
    assert.equal(body.system[0].text.includes('clinicalOps LWW lives'), false);
    assert.deepEqual(payload.entities[0].name, 'clinicalOps LWW');
  });
});

describe('fixture facts', () => {
  it('validates and retrieves the Nube LWW fixture', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'graph-memory-'));
    const store = createGraphStore(path.join(dir, 'graph.json'));
    const facts = JSON.parse(
      fs.readFileSync(new URL('./fixtures/facts-nube-lww.json', import.meta.url), 'utf8')
    );
    const written = ingestFacts(store, facts);
    assert.equal(written.ok, true);
    const result = hybridRetrieve('clinicalOps LWW August 2026', store.snapshot(), {
      at: '2026-08',
    });
    assert.ok(result.evidence.citations.some((line) => /clinicalOps LWW/.test(line)));
    assert.ok(result.evidence.entityCount < 20);
  });
});
