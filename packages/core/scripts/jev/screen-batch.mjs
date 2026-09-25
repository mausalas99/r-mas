#!/usr/bin/env node
// Screen many candidate files against one task question with Jev in one run,
// so an agent reads only the files that pass instead of reading every one to
// decide. Mandatory first step of a thread task per CLAUDE.md.
// Usage: node scripts/jev/screen-batch.mjs "<question>" <file> [<file> ...]
//   Writes jev-screen.tsv (file, probability, verdict, note) ranked high to
//   low, and logs one call per screened file to scripts/jev/.cache/jev-calls.ndjson.
import { readFileSync, writeFileSync } from "node:fs";
import { noul, TypeSafeClient } from "@typesafe-ai/sdk";
import { looksLikePHI } from "../../../../.claude/hooks/lib/phi-guard.mjs";
import { logJevCall, countJevCalls } from "./lib/call-log.mjs";
import { runCapped, buildRows } from "./lib/screen-batch.mjs";

const CONCURRENCY = 8;
const OUT_FILE = "jev-screen.tsv";

const [question, ...files] = process.argv.slice(2);
if (!question || files.length === 0) {
  console.error('Usage: node scripts/jev/screen-batch.mjs "<question>" <file> [<file> ...]');
  process.exit(1);
}

const client = new TypeSafeClient();

async function screenOne(file) {
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch (err) {
    return { file, probability: null, verdict: "error", note: err.message };
  }
  if (looksLikePHI(content)) {
    return { file, probability: null, verdict: "skipped-phi", note: "suspected PHI, not sent to Jev" };
  }
  // ponytail: 50k char cap, no chunking — same convention as screen.mjs
  const response = await client.systemOne({
    state: { file, content: content.slice(0, 50000) },
    questions: { answer: noul(question) },
  });
  logJevCall({ script: "screen-batch.mjs", file, question });
  const p = response.answers.answer.noul;
  const verdict = p >= 0.5 ? "pass" : "skip";
  return { file, probability: p, verdict, note: `${p.toFixed(2)} ${verdict}` };
}

const results = await runCapped(files, screenOne, CONCURRENCY);
writeFileSync(OUT_FILE, buildRows(results));

const passed = results.filter((r) => r.verdict === "pass").length;
const skippedPHI = results.filter((r) => r.verdict === "skipped-phi").length;
console.log(
  `${OUT_FILE}: ${results.length} screened, ${passed} passed, ${skippedPHI} skipped as suspected PHI ` +
    `(${countJevCalls()} Jev calls logged this session)`
);
