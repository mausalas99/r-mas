#!/usr/bin/env node
// Pick from a real, code-built list with Jev (TypeSafe System One) — never an invented one.
// Usage: node scripts/jev/choice.mjs "<question>" <label1> <label2> [...] [--state <file>]
import { readFileSync } from "node:fs";
import { choice, TypeSafeClient } from "@typesafe-ai/sdk";

const args = process.argv.slice(2);
const stateIdx = args.indexOf("--state");
const stateFile = stateIdx === -1 ? null : args[stateIdx + 1];
const rest = stateIdx === -1 ? args : args.slice(0, stateIdx).concat(args.slice(stateIdx + 2));
const [question, ...labels] = rest;

if (!question || labels.length < 2) {
  console.error(
    'Usage: node scripts/jev/choice.mjs "<question>" <label1> <label2> [...] [--state <file>]'
  );
  process.exit(1);
}

// ponytail: 50k char cap on state, no chunking — raise if agents hit it on real files
const state = stateFile ? readFileSync(stateFile, "utf8").slice(0, 50000) : "";

const criteria = Object.fromEntries(labels.map((label) => [label, null]));

const client = new TypeSafeClient();
const response = await client.systemOne({
  state,
  questions: {
    answer: choice(question, criteria),
  },
});

const a = response.answers.answer;
console.log(`${a.choice} (confidence ${a.confidence.toFixed(2)})`);
console.log(
  `probabilities: ${Object.entries(a.probabilities)
    .map(([label, p]) => `${label}=${p.toFixed(2)}`)
    .join(", ")}`
);
