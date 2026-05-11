export function isOutputDirError(message) {
  var text = String(message || '').toLowerCase();
  return text.indexOf('carpeta seleccionada') !== -1
    || text.indexOf('no se puede escribir') !== -1;
}

export async function handleOutputDirFallback(opts) {
  var response = opts && opts.response;
  if (response && response.ok) {
    if (typeof opts.onSuccess === 'function') opts.onSuccess(response);
    return { status: 'ok' };
  }

  var error = response && response.error ? response.error : 'No se pudo generar el documento.';
  if (!isOutputDirError(error) || typeof opts.selectOutputDir !== 'function') {
    if (typeof opts.onError === 'function') opts.onError(error);
    return { status: 'error' };
  }

  if (typeof opts.onPrompt === 'function') opts.onPrompt(error);
  var dir = await opts.selectOutputDir();
  if (!dir) {
    if (typeof opts.onCancel === 'function') opts.onCancel(error);
    return { status: 'cancelled' };
  }

  if (typeof opts.saveOutputDir === 'function') opts.saveOutputDir(dir);
  var retryResponse = await opts.retry(dir);
  if (retryResponse && retryResponse.ok) {
    if (typeof opts.onSuccess === 'function') opts.onSuccess(retryResponse);
    return { status: 'retried' };
  }

  var retryError = retryResponse && retryResponse.error ? retryResponse.error : error;
  if (typeof opts.onError === 'function') opts.onError(retryError);
  return { status: 'retry_error' };
}
