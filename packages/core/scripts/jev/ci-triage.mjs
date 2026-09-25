#!/usr/bin/env node
// Triage one failing CI check with Jev instead of eyeballing the log: this PR's
// fault, or not (base branch already broken, flake, unrelated infra). One
// pairwise choice.mjs call, grounded on the check's own log.
// Usage: node scripts/jev/ci-triage.mjs "<check name>" <log-file>
import { readFileSync } from "node:fs";
import { choice, TypeSafeClient } from "@typesafe-ai/sdk";

const [checkName, logFile] = process.argv.slice(2);
if (!checkName || !logFile) {
  console.error('Usage: node scripts/jev/ci-triage.mjs "<check name>" <log-file>');
  process.exit(1);
}

// ponytail: 50k char cap, no chunking — same convention as screen.mjs/choice.mjs
const log = readFileSync(logFile, "utf8").slice(0, 50000);

const client = new TypeSafeClient();
const response = await client.systemOne({
  state: { checkName, log },
  questions: {
    answer: choice(
      `Is the failure in the CI check "${checkName}" caused by this PR's own changes, or is it not this PR's fault (base branch already broken, a flake, unrelated infra)?`,
      { this_pr_fault: null, not_this_pr_fault: null }
    ),
  },
});

const a = response.answers.answer;
console.log(`${a.choice} (confidence ${a.confidence.toFixed(2)})`);
console.log(
  `probabilities: ${Object.entries(a.probabilities)
    .map(([label, p]) => `${label}=${p.toFixed(2)}`)
    .join(", ")}`
);
