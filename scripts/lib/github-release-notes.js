'use strict';

const REPO_DEFAULT = 'mausalas99/r-mas';

/**
 * Giant download CTA for GitHub release notes (markdown).
 * Injected at publish so every future release has it, even if the txt changelog
 * does not repeat the banner.
 */
function githubDownloadBanner(version, opts) {
  const v = String(version || '').replace(/^v/, '');
  const repo = (opts && opts.repo) || REPO_DEFAULT;
  const base = `https://github.com/${repo}/releases/download/v${v}`;
  return [
    `# Descargar R+ ${v}`,
    '',
    `## [⬇ Mac Apple Silicon (M1 · M2 · M3 · M4)](${base}/R+-${v}-Mac-Apple-Silicon.dmg)`,
    '',
    `## [⬇ Mac Intel](${base}/R+-${v}-Mac-Intel.dmg)`,
    '',
    `## [⬇ Windows](${base}/R+-${v}-Windows.exe)`,
    '',
    '---',
    '',
  ].join('\n');
}

function composeGithubReleaseNotes(docText, version, opts) {
  const body = String(docText || '').trim();
  return githubDownloadBanner(version, opts) + (body ? body + '\n' : '');
}

module.exports = {
  githubDownloadBanner,
  composeGithubReleaseNotes,
};
