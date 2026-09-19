import { resolveYmlFeed, resolveJsonFeed, probeHealth } from './feed.mjs';

const YML_FILES = new Set(['latest-mac.yml', 'latest.yml']);
const JSON_FILES = new Set(['min-version.json', 'stable-versions.json']);
const CACHE_CONTROL = 's-maxage=60';

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** @param {Request} request */
export async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/+/, '');

  if (path === 'health') {
    return jsonResponse(await probeHealth(fetch));
  }

  if (YML_FILES.has(path)) {
    const result = await resolveYmlFeed(fetch, path);
    if (!result) {
      return new Response('update feed unavailable: GitHub and GitLab both failed', { status: 502 });
    }
    return new Response(result.body, {
      status: 200,
      headers: { 'Content-Type': 'text/yaml; charset=utf-8', 'Cache-Control': CACHE_CONTROL },
    });
  }

  if (JSON_FILES.has(path)) {
    const result = await resolveJsonFeed(fetch, path);
    if (!result) {
      return new Response('feed unavailable: GitHub and GitLab both failed', { status: 502 });
    }
    return new Response(result.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': CACHE_CONTROL,
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  return new Response('not found', { status: 404 });
}

export default {
  /** @param {Request} request */
  async fetch(request) {
    return handleRequest(request);
  },
};
