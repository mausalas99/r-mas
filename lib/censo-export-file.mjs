import fs from 'node:fs';
import path from 'node:path';

/**
 * @param {string} str
 * @returns {string}
 */
export function censoSafeName(str) {
  return String(str || '').replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9]/g, '_');
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
export function censoFileName(servicio, date) {
  return 'Censo_' + censoSafeName(servicio || 'guardia') + '_' + censoDateStamp(date) + '.pdf';
}

/**
 * @param {string} dateStamp YYYY-MM-DD
 * @returns {RegExp}
 */
export function censoDailyFilePattern(dateStamp) {
  var escaped = String(dateStamp).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('^Censo_.*_' + escaped + '\\.pdf$', 'i');
}

/**
 * Nombres de PDF de censo del día (cualquier servicio).
 * @param {string} dir
 * @param {string} dateStamp
 * @returns {string[]}
 */
export function listCensoFilesForDate(dir, dateStamp) {
  var re = censoDailyFilePattern(dateStamp);
  return fs.readdirSync(dir).filter(function (name) {
    return re.test(name);
  });
}

/**
 * Elimina censos previos del mismo día antes de guardar uno nuevo.
 * @param {string} dir
 * @param {string} dateStamp
 * @returns {string[]}
 */
export function removeCensoFilesForDate(dir, dateStamp) {
  var removed = [];
  listCensoFilesForDate(dir, dateStamp).forEach(function (name) {
    fs.unlinkSync(path.join(dir, name));
    removed.push(name);
  });
  return removed;
}

/**
 * @param {string} destDir
 * @param {string} fileName
 * @param {Buffer} buffer
 * @param {Date} [date]
 * @returns {{ fileName: string, replaced: boolean, removedFiles: string[] }}
 */
export function writeCensoPdfForToday(destDir, fileName, buffer, date) {
  var stamp = censoDateStamp(date);
  var removedFiles = removeCensoFilesForDate(destDir, stamp);
  fs.writeFileSync(path.join(destDir, fileName), buffer);
  return {
    fileName: fileName,
    replaced: removedFiles.length > 0,
    removedFiles: removedFiles,
  };
}
