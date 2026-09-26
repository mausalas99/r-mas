#!/usr/bin/env node
// Rank candidate files against a question with Jev (TypeSafe System One), instead
// of reading every grep/search hit into agent context to see which one matters.
// choice() already returns a probability per candidate — this just previews each
// file into state and sorts the same probabilities choice.mjs prints unsorted.
// Usage: node scripts/jev/rank.mjs "<question>" <file1> <file2> [...] [--chars N]
import { readFileSync } from "node:fs";
import { choice, TypeSafeClient } from "@typesafe-ai/sdk";

const args = process.argv.slice(2);
const charsIdx = args.indexOf("--chars");
const chars = charsIdx === -1 ? 500 : Number(args[charsIdx + 1]);
const rest = charsIdx === -1 ? args : args.slice(0, charsIdx).concat(args.slice(charsIdx + 2));
const [question, ...files] = rest;

if (!question || files.length < 2) {
  console.error('Usage: node scripts/jev/rank.mjs "<question>" <file1> <file2> [...] [--chars N]');
  process.exit(1);
}

const previews = Object.fromEntries(
  files.map((f) => [f, readFileSync(f, "utf8").slice(0, chars)])
);

const criteria = Object.fromEntries(files.map((f) => [f, null]));

const client = new TypeSafeClient();
const response = await client.systemOne({
  state: { question, previews },
  questions: {
    pick: choice(question, criteria),
  },
});

const { probabilities } = response.answers.pick;
const ranked = Object.entries(probabilities).sort(([, a], [, b]) => b - a);
for (const [file, p] of ranked) {
  console.log(`${p.toFixed(2)}  ${file}`);
}
