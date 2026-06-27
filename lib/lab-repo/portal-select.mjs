import {
  LAB_REPO_BASE_URL,
  LAB_REPO_SEARCH_MODE_REGISTRO,
} from './constants.mjs';
import {
  parseAspNetHiddenFields,
  parseSearchFormControls,
} from './portal-html.mjs';

function pickHiddenFieldValue(html, name) {
  const re = new RegExp(`name="${name}"[^>]*value="([^"]*)"`, 'i');
  const match = String(html || '').match(re);
  return match ? match[1] : null;
}

function pickFormFieldValue(html, name) {
  const re = new RegExp(`name="${name}"[^>]*value="([^"]*)"`, 'i');
  const match = String(html || '').match(re);
  return match ? match[1] : '';
}

function buildAspNetHiddenFields(html) {
  const hidden = { ...parseAspNetHiddenFields(html) };
  const encrypted = pickHiddenFieldValue(html, '__VIEWSTATEENCRYPTED');
  if (encrypted !== null) {
    hidden.__VIEWSTATEENCRYPTED = encrypted;
  }
  return hidden;
}

function isPdfBuffer(buffer) {
  return Buffer.isBuffer(buffer)
    && buffer.length >= 4
    && buffer.slice(0, 4).toString() === '%PDF';
}

function resolvePortalUrl(relativeUrl) {
  return new URL(relativeUrl, LAB_REPO_BASE_URL).href;
}

/**
 * Live discovery: ASP.NET GridView Select may return raw PDF bytes, an HTML
 * viewer shell, or a redirect. Known patterns (best-effort, not guaranteed):
 * - Content-Type application/pdf
 * - iframe/embed/object pointing at .pdf or report handler
 * - meta refresh or JS location to a PDF URL
 * - anchor href ending in .pdf
 * If none match, throws lab-repo-pdf-not-found.
 */
function parsePdfUrlFromHtml(html) {
  const source = String(html || '');
  const patterns = [
    /<iframe[^>]+src=["']([^"']+)["']/i,
    /<embed[^>]+src=["']([^"']+)["']/i,
    /<object[^>]+data=["']([^"']+)["']/i,
    /content=["']0;\s*url=([^"']+)["']/i,
    /location\.(?:href|replace)\s*=\s*['"]([^'"]+)['"]/i,
    /href=["']([^"']+\.pdf(?:\?[^"']*)?)["']/i,
    /href=["']([^"']*(?:reporte|Reporte|pdf|PDF)[^"']*)["']/i,
  ];

  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match?.[1]) {
      return resolvePortalUrl(match[1]);
    }
  }
  return null;
}

function buildSelectPostFields(pageHtml, row) {
  const hidden = buildAspNetHiddenFields(pageHtml);
  const controls = parseSearchFormControls(pageHtml);
  return {
    ...hidden,
    __EVENTTARGET: row.selectEventTarget,
    __EVENTARGUMENT: row.selectEventArgument,
    [controls.modeFieldName]:
      controls.currentMode || LAB_REPO_SEARCH_MODE_REGISTRO,
    [controls.searchFieldName]: pickFormFieldValue(
      pageHtml,
      controls.searchFieldName
    ),
  };
}

async function fetchPdfFromUrl(client, url) {
  const { contentType, body } = await client.getBinary(url);
  if (contentType.includes('application/pdf') || isPdfBuffer(body)) {
    return body;
  }

  const html = body.toString('utf8');
  const nestedUrl = parsePdfUrlFromHtml(html);
  if (nestedUrl && nestedUrl !== url) {
    return fetchPdfFromUrl(client, nestedUrl);
  }
  throw new Error('lab-repo-pdf-not-found');
}

/** @returns {Promise<Buffer>} PDF bytes for one GridView row. */
export async function downloadPdfForRow(client, row, pageHtml) {
  if (!row?.selectEventTarget) {
    throw new Error('lab-repo-missing-select-target');
  }

  const fields = buildSelectPostFields(pageHtml, row);
  const { contentType, body } = await client.postBinary(LAB_REPO_BASE_URL, fields);

  if (contentType.includes('application/pdf') || isPdfBuffer(body)) {
    return body;
  }

  const html = body.toString('utf8');
  const pdfUrl = parsePdfUrlFromHtml(html);
  if (pdfUrl) {
    return fetchPdfFromUrl(client, pdfUrl);
  }

  throw new Error('lab-repo-pdf-not-found');
}
