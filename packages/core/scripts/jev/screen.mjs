#!/usr/bin/env node
// Screen a file with Jev (TypeSafe System One) instead of reading it into agent context.
// Usage: node scripts/jev/screen.mjs <file> "<yes/no question about the file>"
import { readFileSync } from "node:fs";
import { noul, TypeSafeClient } from "@typesafe-ai/sdk";

const [file, question] = process.argv.slice(2);
if (!file || !question) {
  console.error('Usage: node scripts/jev/screen.mjs <file> "<yes/no question>"');
  process.exit(1);
}

// ponytail: 50k char cap, no chunking — raise if agents hit it on real files
const content = readFileSync(file, "utf8").slice(0, 50000);

const client = new TypeSafeClient();
const response = await client.systemOne({
  state: { file, content },
  questions: {
    answer: noul(question),
  },
});

const p = response.answers.answer.noul;
console.log(`${p.toFixed(2)} ${p >= 0.5 ? "yes" : "no"}`);
