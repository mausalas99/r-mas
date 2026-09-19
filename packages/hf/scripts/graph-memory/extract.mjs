import {
  EXTRACTION_SYSTEM,
  EXTRACTION_MODEL_DEFAULT,
  EXTRACTION_MAX_TOKENS,
  BATCH_SIZE_HINT,
} from './schema.mjs';

export { EXTRACTION_SYSTEM, EXTRACTION_MODEL_DEFAULT, EXTRACTION_MAX_TOKENS };

function extractionModel() {
  return process.env.GRAPH_MEMORY_EXTRACT_MODEL || EXTRACTION_MODEL_DEFAULT;
}

/**
 * Schema first, variable episode last. The system block is the cacheable prefix.
 */
export function buildExtractionRequest({
  episodeText,
  occurredAt,
  model = extractionModel(),
}) {
  if (!episodeText || typeof episodeText !== 'string') {
    throw new Error('episodeText is required');
  }
  const referenceTime = occurredAt || 'unknown';
  return {
    model,
    max_tokens: EXTRACTION_MAX_TOKENS,
    system: [
      {
        type: 'text',
        text: EXTRACTION_SYSTEM,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `reference_time: ${referenceTime}\n\n${episodeText}`,
      },
    ],
  };
}

export function buildBatchRequest(episodes) {
  if (!Array.isArray(episodes) || episodes.length === 0) {
    throw new Error('episodes must be a non-empty array');
  }
  return {
    requests: episodes.map((episode, index) => ({
      custom_id: episode.id || `episode-${index}`,
      params: buildExtractionRequest(episode),
    })),
  };
}

export function shouldBatch({ historical = false, episodeCount = 1 } = {}) {
  return Boolean(historical) || episodeCount > BATCH_SIZE_HINT;
}

export function planIngest(episodes, { historical = false } = {}) {
  const list = Array.isArray(episodes) ? episodes : [episodes];
  if (shouldBatch({ historical, episodeCount: list.length })) {
    return { mode: 'batch', request: buildBatchRequest(list) };
  }
  return {
    mode: 'live',
    requests: list.map((episode) => buildExtractionRequest(episode)),
  };
}

function assistantText(message) {
  const blocks = message?.content;
  if (!Array.isArray(blocks)) return '';
  return blocks
    .filter((block) => block?.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

function parseJsonPayload(text) {
  const trimmed = String(text || '').trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(raw);
}

export async function extractEpisode(episode, { fetchImpl, apiKey, endpoint } = {}) {
  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error('ANTHROPIC_API_KEY is required for live extraction');
  }
  const body = buildExtractionRequest(episode);
  const url = endpoint || 'https://api.anthropic.com/v1/messages';
  const fetchFn = fetchImpl || globalThis.fetch;
  const response = await fetchFn(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-31',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`extraction failed: ${response.status} ${detail}`);
  }
  const message = await response.json();
  return parseJsonPayload(assistantText(message));
}
