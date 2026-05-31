'use strict';
const { logDocExport } = require('./doc-export-audit.js');

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function sendDocxBuffer(res, { buf, fileName, type, patient }) {
  let tmpPath = null;
  try {
    const safeFileName = String(fileName || 'document.docx').replace(/"/g, '');
    res.setHeader('Content-Type', DOCX_MIME);
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
    res.send(buf);
    logDocExport({ type, patient, status: 200, bytes: buf.length });
  } catch (e) {
    if (!res.headersSent) {
      res.status(500).json({ error: 'No se pudo generar el documento. Intenta de nuevo.' });
    }
    logDocExport({
      type,
      patient,
      status: 500,
      error: e && e.message ? e.message : String(e),
    });
    throw e;
  } finally {
    if (tmpPath) {
      const fs = require('fs');
      fs.promises.unlink(tmpPath).catch(() => {});
    }
  }
}

module.exports = { sendDocxBuffer, DOCX_MIME };
