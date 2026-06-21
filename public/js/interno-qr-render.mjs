/**
 * Client-side QR for interno panel (no LAN fetch; works in Electron file://).
 */
import qrcode from 'qrcode-generator';

/**
 * @param {HTMLCanvasElement} canvas
 * @param {string} text
 * @param {{ cellPx?: number, margin?: number }} [opts]
 */
export function drawInternoQrCanvas(canvas, text, opts = {}) {
  const cellPx = opts.cellPx ?? 4;
  const margin = opts.margin ?? 16;
  const qr = qrcode(0, 'M');
  qr.addData(String(text || ''));
  qr.make();

  const n = qr.getModuleCount();
  const size = n * cellPx + margin * 2;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_context');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#000000';
  for (let row = 0; row < n; row += 1) {
    for (let col = 0; col < n; col += 1) {
      if (!qr.isDark(row, col)) continue;
      ctx.fillRect(margin + col * cellPx, margin + row * cellPx, cellPx, cellPx);
    }
  }
  return canvas;
}

/** @param {string} text @param {number} [cellSize] */
export function renderInternoQrSvg(text, cellSize = 4) {
  const qr = qrcode(0, 'M');
  qr.addData(String(text || ''));
  qr.make();
  const n = qr.getModuleCount();
  const size = n * cellSize;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`;
  svg += '<rect width="100%" height="100%" fill="#fff"/>';
  for (let row = 0; row < n; row += 1) {
    for (let col = 0; col < n; col += 1) {
      if (!qr.isDark(row, col)) continue;
      svg += `<rect x="${col * cellSize}" y="${row * cellSize}" width="${cellSize}" height="${cellSize}" fill="#000"/>`;
    }
  }
  svg += '</svg>';
  return svg;
}

/**
 * @param {string} url
 * @param {(msg: string, kind?: string) => void} [showToast]
 */
export async function copyInternoQrImage(url, showToast) {
  const toast =
    typeof showToast === 'function'
      ? showToast
      : (msg, kind) => {
          if (typeof window.showToast === 'function') window.showToast(msg, kind);
        };

  try {
    const canvas = document.createElement('canvas');
    drawInternoQrCanvas(canvas, url);
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('blob_failed'))), 'image/png');
    });

    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast('QR copiado — pégalo en WhatsApp o imprime', 'success');
      return;
    }

    const dataUrl = canvas.toDataURL('image/png');
    await navigator.clipboard.writeText(dataUrl);
    toast('QR copiado como imagen (data URL)', 'info');
  } catch {
    toast('No se pudo copiar el QR', 'error');
  }
}
