#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createGraphStore } from './store.mjs';
import { ingestFacts, ingestHistoricalPlan } from './ingest.mjs';
import { hybridRetrieve } from './retrieve.mjs';
import { buildExtractionRequest, extractEpisode } from './extract.mjs';

function arg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] || '';
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function defaultStorePath() {
  return path.join(process.cwd(), '.graph-memory', 'graph.json');
}

function help() {
  process.stdout.write(`graph-memory

  node scripts/graph-memory/cli.mjs request --text FILE --occurred-at ISO
  node scripts/graph-memory/cli.mjs extract [--write] --text FILE --occurred-at ISO
  node scripts/graph-memory/cli.mjs ingest-facts --json FILE
  node scripts/graph-memory/cli.mjs query "question" [--at YYYY-MM]
  node scripts/graph-memory/cli.mjs batch-plan --json FILE

Store: ${defaultStorePath()}
`);
}

function writeJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function runExtract(store) {
  const text = fs.readFileSync(arg('--text'), 'utf8');
  const payload = await extractEpisode({
    episodeText: text,
    occurredAt: arg('--occurred-at') || new Date().toISOString().slice(0, 10),
  });
  if (!hasFlag('--write')) {
    writeJson(payload);
    return;
  }
  const result = ingestFacts(store, payload);
  writeJson(result);
  if (!result.ok) process.exitCode = 1;
}

async function main() {
  const cmd = process.argv[2];
  if (!cmd || cmd === '--help') {
    help();
    return;
  }
  const store = createGraphStore(arg('--store') || defaultStorePath());
  if (cmd === 'request') {
    writeJson(
      buildExtractionRequest({
        episodeText: fs.readFileSync(arg('--text'), 'utf8'),
        occurredAt: arg('--occurred-at') || new Date().toISOString().slice(0, 10),
      })
    );
    return;
  }
  if (cmd === 'extract') {
    await runExtract(store);
    return;
  }
  if (cmd === 'ingest-facts') {
    const result = ingestFacts(store, JSON.parse(fs.readFileSync(arg('--json'), 'utf8')));
    writeJson(result);
    if (!result.ok) process.exitCode = 1;
    return;
  }
  if (cmd === 'query') {
    writeJson(hybridRetrieve(process.argv[3] || '', store.snapshot(), { at: arg('--at') || null }));
    return;
  }
  if (cmd === 'batch-plan') {
    writeJson(ingestHistoricalPlan(JSON.parse(fs.readFileSync(arg('--json'), 'utf8'))));
    return;
  }
  help();
  process.exitCode = 1;
}

main().catch((err) => {
  process.stderr.write(`${err.message}\n`);
  process.exitCode = 1;
});
