#!/usr/bin/env node
// Pick the next computer-use action in one Jev call: operation + target together,
// like jev-ultrafast does for browser DOM tables — one TypeSafe request per step,
// not one call per decision. Caller builds the indexed element table (e.g. from
// mcp__computer-use__control's 'inspect') and passes it as --elements.
// Usage: node scripts/jev/act.mjs "<goal>" --elements <file.json> [--state <file>]
import { readFileSync } from "node:fs";
import { pickAction } from "./lib/jev-act.mjs";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1];
};
const elementsFile = flag("--elements");
const stateFile = flag("--state");
const goal = args[0];

if (!goal || !elementsFile) {
  console.error('Usage: node scripts/jev/act.mjs "<goal>" --elements <file.json> [--state <file>]');
  process.exit(1);
}

const state = stateFile ? readFileSync(stateFile, "utf8") : goal;
const elements = JSON.parse(readFileSync(elementsFile, "utf8"));

const { operation, target } = await pickAction(goal, elements, state);
console.log(`operation: ${operation.choice} (confidence ${operation.confidence.toFixed(2)})`);
console.log(`target: ${target.choice} (confidence ${target.confidence.toFixed(2)})`);
