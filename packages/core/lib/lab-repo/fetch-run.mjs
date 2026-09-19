import {
  filterRowsByDateRange,
  pageIndicatesNoSearchResults,
  parseFechaSolicitudMs,
} from './portal-html.mjs';
import {
  createTempRunDir,
  writeTempPdf,
  deleteTempFile,
  deleteTempRunDir,
} from './temp-run.mjs';
import {
  looksLikeExtractedSome,
} from './pdf-text.mjs';
import { createLabRepoPortalClient } from './portal-client.mjs';
import { downloadPdfForRow, fetchReportTextForRow } from './portal-select.mjs';

function coerceDate(value) {
  if (value instanceof Date) return value;
  return new Date(value);
}

function buildDefaultDeps() {
  const client = createLabRepoPortalClient({});
  let lastPageHtml = '';

  return {
    searchByRegistro: async (registro) => {
      const { rows, pageHtml } = await client.searchByRegistro(registro);
      lastPageHtml = pageHtml;
      return { rows, pageHtml };
    },
    downloadPdfForRow: (row) => downloadPdfForRow(client, row, lastPageHtml),
    fetchReportTextForRow: (row) => fetchReportTextForRow(client, row, lastPageHtml),
    extractText: async (buf) => String(buf || ''),
    createTempRunDir,
    writeTempPdf,
    deleteTempFile,
    deleteTempRunDir,
  };
}

/**
 * @param {{ registro: string, desde: Date | string, hasta: Date | string }} opts
 * @param {object} [deps]
 * @returns {Promise<{ studies: object[], errors: object[] }>}
 */
export async function runLabRepoFetch(opts, deps) {
  const runDeps = deps || buildDefaultDeps();
  const dir = runDeps.createTempRunDir();
  /** @type {{ folio: string, fechaSolicitud: string, tipo: string, departamento: string, text: string }[]} */
  const studies = [];
  /** @type {{ folio: string, message: string }[]} */
  const errors = [];

  try {
    const searchResult = await runDeps.searchByRegistro(opts.registro);
    const rows = searchResult.rows || searchResult;
    const pageHtml = searchResult.pageHtml || '';

    if (!rows.length) {
      const message = pageIndicatesNoSearchResults(pageHtml)
        ? 'no-search-results'
        : 'no-search-results';
      return { studies: [], errors: [{ folio: '', message }] };
    }

    const filtered = filterRowsByDateRange(
      rows,
      coerceDate(opts.desde),
      coerceDate(opts.hasta)
    );

    if (!filtered.length) {
      return {
        studies: [],
        errors: [{
          folio: '',
          message: 'no-rows-in-range',
          totalRows: rows.length,
        }],
      };
    }

    for (const row of filtered) {
      try {
        const text = runDeps.fetchReportTextForRow
          ? await runDeps.fetchReportTextForRow(row)
          : await runDeps.extractText(
            await runDeps.downloadPdfForRow(row)
          );
        if (!looksLikeExtractedSome(text)) {
          errors.push({ folio: row.folio, message: 'report-not-some' });
          continue;
        }
        studies.push({
          folio: row.folio,
          fechaSolicitud: row.fechaSolicitud,
          tipo: row.tipo,
          departamento: row.departamento || '',
          text,
        });
      } catch (err) {
        errors.push({
          folio: row.folio,
          message: String(err?.message || err),
        });
      }
    }

    return { studies, errors };
  } finally {
    runDeps.deleteTempRunDir(dir);
  }
}

/**
 * Existence-only check: searches the portal by registro and reports whether
 * any study row exists, plus the newest `fechaSolicitud` among them — no PDF
 * download, no text parse. For "does this patient have labs, and since when",
 * not for importing values.
 * @param {{ registro: string }} opts
 * @param {{ searchByRegistro: (registro: string) => Promise<{ rows: object[] }> }} [deps]
 * @returns {Promise<{ hasStudies: boolean, lastFechaSolicitud: string|null }>}
 */
export async function runLabRepoCheck(opts, deps) {
  const client = deps || createLabRepoPortalClient({});
  const { rows } = await client.searchByRegistro(opts.registro);
  let lastFechaSolicitud = null;
  let lastMs = -Infinity;
  for (const row of rows || []) {
    const ms = parseFechaSolicitudMs(row.fechaSolicitud);
    if (Number.isFinite(ms) && ms > lastMs) {
      lastMs = ms;
      lastFechaSolicitud = row.fechaSolicitud;
    }
  }
  return { hasStudies: (rows || []).length > 0, lastFechaSolicitud };
}
