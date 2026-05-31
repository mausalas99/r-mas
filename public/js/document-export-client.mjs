import { isOutputDirError } from './output-dir-fallback.mjs';

export function parseContentDispositionFilename(header) {
  if (!header) return null;
  const m = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(header);
  return m ? m[1].replace(/"/g, '').trim() : null;
}

export async function exportGeneratedDocument({ url, buildPayload, defaultFileName }) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildPayload()),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'No se pudo generar el documento.');
  }
  const blob = await res.blob();
  const fileName =
    parseContentDispositionFilename(res.headers.get('Content-Disposition')) ||
    defaultFileName;

  if (window.electronAPI?.saveExportedDocument) {
    const arrayBuffer = await blob.arrayBuffer();
    return window.electronAPI.saveExportedDocument({ fileName, buffer: arrayBuffer });
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = fileName;
    a.click();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
  return { success: true, fileName };
}

export async function exportWithOutputDirFallback(opts) {
  try {
    const result = await exportGeneratedDocument(opts);
    if (typeof opts.onSuccess === 'function') opts.onSuccess(result);
    return result;
  } catch (e) {
    const message = e && e.message ? e.message : String(e);
    if (typeof opts.selectOutputDir === 'function' && isOutputDirError(message)) {
      if (typeof opts.onPrompt === 'function') opts.onPrompt(message);
      const dir = await opts.selectOutputDir();
      if (!dir) {
        if (typeof opts.onCancel === 'function') opts.onCancel(message);
        return { status: 'cancelled' };
      }
      if (typeof opts.saveOutputDir === 'function') opts.saveOutputDir(dir);
      if (window.electronAPI?.setApprovedOutputDir) {
        await window.electronAPI.setApprovedOutputDir(dir);
      }
      return exportWithOutputDirFallback(opts);
    }
    if (typeof opts.onError === 'function') opts.onError(message);
    throw e;
  }
}

export function syncApprovedOutputDir(dir) {
  if (window.electronAPI?.setApprovedOutputDir) {
    return window.electronAPI.setApprovedOutputDir(dir || '');
  }
  return Promise.resolve({ ok: false });
}
