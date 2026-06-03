import { execSync } from 'node:child_process';

const TIER1_RE = /^(public\/js\/|lib\/|lan-squad\/)/;

export function filterTier1Paths(paths) {
  return paths.filter((p) => TIER1_RE.test(p.replace(/\\/g, '/')));
}

export function gitChangedFiles(baseRef = 'HEAD') {
  try {
    const out = execSync(`git diff --name-only ${baseRef}`, { encoding: 'utf8' });
    return out.split('\n').map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function gitChangedFilesAgainst(base = 'main') {
  try {
    const out = execSync(`git diff --name-only ${base}...HEAD`, { encoding: 'utf8' });
    return out.split('\n').map((s) => s.trim()).filter(Boolean);
  } catch {
    return gitChangedFiles('HEAD');
  }
}
