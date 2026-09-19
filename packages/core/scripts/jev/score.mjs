#!/usr/bin/env node
// Grade something with Jev (TypeSafe System One) on a named rubric, instead of eyeballing it.
// Usage: node scripts/jev/score.mjs "<question>" <level0> <level1> [level2 ...] [--state <file>]
import { readFileSync } from "node:fs";
import { score, TypeSafeClient } from "@typesafe-ai/sdk";

const args = process.argv.slice(2);
const stateIdx = args.indexOf("--state");
const stateFile = stateIdx === -1 ? null : args[stateIdx + 1];
const rest = stateIdx === -1 ? args : args.slice(0, stateIdx).concat(args.slice(stateIdx + 2));
const [question, ...levels] = rest;

if (!question || levels.length < 2) {
  console.error(
    'Usage: node scripts/jev/score.mjs "<question>" <level0> <level1> [level2 ...] [--state <file>]'
  );
  process.exit(1);
}

// ponytail: 50k char cap on state, no chunking — raise if agents hit it on real files
const state = stateFile ? readFileSync(stateFile, "utf8").slice(0, 50000) : "";

const client = new TypeSafeClient();
const response = await client.systemOne({
  state,
  questions: {
    answer: score(question, levels),
  },
});

const a = response.answers.answer;
console.log(`${a.score.toFixed(2)}/${levels.length - 1} (confidence ${a.confidence.toFixed(2)})`);
console.log(`legend: ${levels.map((l, i) => `${i}=${l}`).join(", ")}`);
