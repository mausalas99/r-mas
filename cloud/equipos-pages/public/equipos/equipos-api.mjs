/** API client for equipos micro-app. */

const TARGET_DATA_URL_LEN = 480_000;

/**
 * @param {string} apiBase
 * @param {string} token
 * @param {string} path
 * @param {RequestInit} [opts]
 */
export async function equiposFetch(apiBase, token, path, opts = {}) {
  const sep = path.includes('?') ? '&' : '?';
  const url = `${apiBase}/api/equipos/v1${path}${sep}t=${encodeURIComponent(token)}`;
  const headers = {
    ...(opts.headers || {}),
    'X-Equipos-Token': token,
  };
  const res = await fetch(url, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Error de red.');
    err.code = data.error;
    throw err;
  }
  return data;
}

/**
 * Resize + JPEG compress for upload (target well under 2 MB server cap).
 * @param {File} file
 * @param {number} [maxDim]
 */
export function resizeImageFile(file, maxDim = 960) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let dim = maxDim;
      let quality = 0.78;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('canvas'));

      const encode = () => {
        let { width, height } = img;
        const scale = Math.min(1, dim / Math.max(width, height));
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        if (dataUrl.length > TARGET_DATA_URL_LEN && quality > 0.42) {
          quality -= 0.1;
          return encode();
        }
        if (dataUrl.length > TARGET_DATA_URL_LEN && dim > 560) {
          dim = Math.round(dim * 0.82);
          quality = 0.78;
          return encode();
        }
        resolve(dataUrl);
      };
      encode();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('imagen'));
    };
    img.src = url;
  });
}
