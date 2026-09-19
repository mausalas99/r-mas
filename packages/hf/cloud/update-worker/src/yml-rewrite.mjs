/**
 * electron-builder's latest-mac.yml / latest.yml carry a top-level `version:`
 * and one or more `url:` lines (a top-level one and one per `files:` entry),
 * each holding a bare filename. We rewrite every `url:` value to an absolute
 * URL on whichever origin answered — electron-updater then downloads the
 * zip/exe directly from GitHub or GitLab. We never proxy the binary bytes.
 */

const URL_LINE_RE = /^(\s*-?\s*url:\s*)(\S+)\s*$/gm;
const VERSION_RE = /^version:\s*(\S+)\s*$/m;

/** @param {string} text yml body @returns {string|null} */
export function extractYmlVersion(text) {
  const m = VERSION_RE.exec(text);
  return m ? m[1] : null;
}

/**
 * @param {string} text yml body
 * @param {(filename: string) => string} buildUrl
 * @returns {string} yml with every `url:` value replaced by buildUrl(filename)
 */
export function rewriteYmlUrls(text, buildUrl) {
  return text.replace(URL_LINE_RE, (_match, prefix, filename) => `${prefix}${buildUrl(filename)}`);
}
