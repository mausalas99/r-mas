#!/usr/bin/env node
// Judge "stuck" against the CLAUDE.md threshold with Jev, instead of eyeballing it.
// Advisory only — never auto-escalates, just answers the question.
// Usage: node scripts/jev/stuck.mjs "<problem>" <attempt1> <attempt2> [...]
import { noul, TypeSafeClient } from "@typesafe-ai/sdk";

const [problem, ...attempts] = process.argv.slice(2);

if (!problem || attempts.length < 1) {
  console.error('Usage: node scripts/jev/stuck.mjs "<problem>" <attempt1> <attempt2> [...]');
  process.exit(1);
}

const client = new TypeSafeClient();
const response = await client.systemOne({
  state: { problem, attempts },
  questions: {
    stuck: noul(
      "Per the rule (two failed fix attempts, a spec conflict no doc resolves, " +
        "or a bug that survives three distinct hypotheses), am I stuck on `problem` " +
        "given `attempts`?"
    ),
  },
});

const p = response.answers.stuck.noul;
console.log(`${p.toFixed(2)} ${p >= 0.5 ? "stuck, escalate" : "keep going"}`);
