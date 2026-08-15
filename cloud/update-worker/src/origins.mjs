/**
 * Origin URL builders — GitHub first, GitLab fallback.
 * Both `mausalas99/r-mas` (GitHub) and `rmas-group1/rmas` (GitLab) are public
 * repos, so no auth header or token is ever needed here.
 */

export const GITHUB_OWNER = 'mausalas99';
export const GITHUB_REPO = 'r-mas';

// Resolves the *current* latest tag's asset without hardcoding a version —
// GitHub 302-redirects this to the signed download URL of the newest release.
export const GITHUB_LATEST_DOWNLOAD_BASE = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest/download`;
export const GITHUB_RELEASES_TAG_BASE = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download`;
export const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main`;

export const GITLAB_NAMESPACE = 'rmas-group1';
export const GITLAB_PROJECT = 'rmas';
// Uses GitLab's permalink/latest form so this never needs a hardcoded tag —
// mirrors the GitHub releases/latest/download path above.
export const GITLAB_RELEASES_BASE = `https://gitlab.com/${GITLAB_NAMESPACE}/${GITLAB_PROJECT}/-/releases`;
export const GITLAB_RAW_BASE = `https://gitlab.com/${GITLAB_NAMESPACE}/${GITLAB_PROJECT}/-/raw/main`;

/** @param {string} filename e.g. "latest-mac.yml" */
export function githubLatestYmlUrl(filename) {
  return `${GITHUB_LATEST_DOWNLOAD_BASE}/${filename}`;
}

/** @param {string} version e.g. "8.1.4" or "v8.1.4" @param {string} filename */
export function githubReleaseAssetUrl(version, filename) {
  const v = String(version || '').replace(/^v/, '');
  return `${GITHUB_RELEASES_TAG_BASE}/v${v}/${filename}`;
}

/** @param {string} filename */
export function githubRawUrl(filename) {
  return `${GITHUB_RAW_BASE}/${filename}`;
}

/** @param {string} filename */
export function gitlabReleaseAssetUrl(filename) {
  return `${GITLAB_RELEASES_BASE}/permalink/latest/downloads/${filename}`;
}

/** @param {string} filename */
export function gitlabRawUrl(filename) {
  return `${GITLAB_RAW_BASE}/${filename}`;
}
