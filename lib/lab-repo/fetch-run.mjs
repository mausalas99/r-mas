import { filterRowsByDateRange } from './portal-html.mjs';
import {
  createTempRunDir,
  writeTempPdf,
  deleteTempFile,
  deleteTempRunDir,
} from './temp-run.mjs';
import {
  extractSomeTextFromPdfBuffer,
  looksLikeExtractedSome,
} from './pdf-text.mjs';
import { createLabRepoPortalClient } from './portal-client.mjs';
import { downloadPdfForRow } from './portal-select.mjs';

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
      return rows;
    },
    downloadPdfForRow: (row) => downloadPdfForRow(client, row, lastPageHtml),
    extractText: extractSomeTextFromPdfBuffer,
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
    const rows = await runDeps.searchByRegistro(opts.registro);
    const filtered = filterRowsByDateRange(
      rows,
      coerceDate(opts.desde),
      coerceDate(opts.hasta)
    );

    if (!filtered.length) {
      return { studies: [], errors: [{ folio: '', message: 'no-rows-in-range' }] };
    }

    for (const row of filtered) {
      let tempPath = '';
      try {
        const pdfBuf = await runDeps.downloadPdfForRow(row);
        tempPath = runDeps.writeTempPdf(dir, row.folio, pdfBuf);
        const text = await runDeps.extractText(pdfBuf);
        if (!looksLikeExtractedSome(text)) {
          errors.push({ folio: row.folio, message: 'pdf-not-some' });
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
      } finally {
        if (tempPath) runDeps.deleteTempFile(tempPath);
      }
    }

    return { studies, errors };
  } finally {
    runDeps.deleteTempRunDir(dir);
  }
}
