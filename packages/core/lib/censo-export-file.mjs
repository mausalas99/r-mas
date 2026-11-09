import fs from 'node:fs';
import path from 'node:path';

/**
 * @param {string} str
 * @returns {string}
 */
export function censoSafeName(str) {
  return String(str || '').normalize('NFC').replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9]/g, '_').slice(0, 80);
}

/**
 * @param {Date} [date]
 * @returns {string} YYYY-MM-DD
 */
export function censoDateStamp(date) {
  var d = date || new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

/**
 * @param {string} servicio
 * @param {Date} [date]
 * @returns {string}
 */
export function censoTimeStamp(date) {
  var d = date || new Date();
  return [
    String(d.getHours()).padStart(2, '0'),
    String(d.getMinutes()).padStart(2, '0'),
    String(d.getSeconds()).padStart(2, '0'),
  ].join('-');
}

/**
 * Nombre único por exportación (fecha + hora); no reemplaza censos de otros usuarios.
 * @param {string} servicio
 * @param {Date} [date]
 * @returns {string}
 */
export function censoFileName(servicio, date) {
  var d = date || new Date();
  return (
    'Censo_' +
    censoSafeName(servicio || 'guardia') +
    '_' +
    censoDateStamp(d) +
    '_' +
    censoTimeStamp(d) +
    '.pdf'
  );
}

/**
 * Escribe un PDF de censo sin borrar otros archivos del mismo día.
 * @param {string} destDir
 * @param {string} fileName
 * @param {Buffer} buffer
 * @returns {{ fileName: string }}
 */
export function writeCensoPdf(destDir, fileName, buffer) {
  fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(path.join(destDir, fileName), buffer);
  return { fileName: fileName };
}
