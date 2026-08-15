import fs from 'node:fs';
import path from 'node:path';

const target = process.argv[2];
if (!target) {
  console.error('Usage: node why-eager.mjs <module-path>');
  process.exit(1);
}

const metaPath = path.join(process.cwd(), 'public/js/app.bundle.meta.json');
if (!fs.existsSync(metaPath)) {
  console.error('metafile missing — run: npm run build:ui');
  process.exit(1);
}

const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
const outputs = meta.outputs || {};

// Build reverse edge map: module → modules that import it statically
const reverseEdges = new Map();
for (const [file, info] of Object.entries(outputs)) {
  for (const imp of (info.imports || [])) {
    if (imp.kind !== 'import-statement') continue;
    const from = imp.path;
    if (!reverseEdges.has(from)) reverseEdges.set(from, []);
    reverseEdges.get(from).push(file);
  }
}

// BFS from target backwards to app.bundle entry
const entry = Object.keys(outputs).find(k => k.endsWith('app.bundle.js') || k.endsWith('app.bundle.mjs'));
const queue = [[target, []]];
const visited = new Set([target]);
let found = false;

while (queue.length && !found) {
  const [cur, path_] = queue.shift();
  const importers = reverseEdges.get(cur) || [];
  
  for (const importer of importers) {
    if (visited.has(importer)) continue;
    visited.add(importer);
    const newPath = [...path_, cur];
    
    if (importer === entry) {
      console.log('Shortest path from app.bundle entry:');
      console.log(entry);
      newPath.forEach(p => console.log('  ← ' + p));
      found = true;
      break;
    }
    queue.push([importer, newPath]);
  }
}

if (!found) console.log('Module not in eager set or path not found');
