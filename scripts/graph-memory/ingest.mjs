import { planIngest, extractEpisode } from './extract.mjs';
import { validateExtraction } from './validate.mjs';

export function ingestFacts(store, payload) {
  const result = validateExtraction(payload, { existingGraph: store.snapshot() });
  if (!result.ok) {
    return { ok: false, errors: result.errors };
  }
  store.write(result.facts);
  return { ok: true, facts: result.facts, graph: store.snapshot() };
}

export async function ingestEpisode(store, episode, { extractFn, historical = false } = {}) {
  const plan = planIngest([episode], { historical });
  const extract = extractFn || extractEpisode;
  if (plan.mode === 'batch' && !extractFn) {
    return { ok: true, mode: 'batch', deferred: true, request: plan.request };
  }
  const payload = await extract(episode);
  const written = ingestFacts(store, payload);
  return { ...written, mode: plan.mode };
}

export function ingestHistoricalPlan(episodes) {
  return planIngest(episodes, { historical: true });
}
