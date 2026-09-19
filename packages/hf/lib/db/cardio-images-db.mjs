/**
 * Reads/writes for the `cardio_images` table (schema v26) — Rx tórax,
 * POCUS, and EKG attachments. Same style as `clinical-blobs.mjs`, but a
 * dedicated table (not the `clinical_blob` KV store) so listing/loading is
 * scoped per patient instead of pulling every attachment into memory on
 * every `dbClinicalLoadAll` boot call.
 */

/** @param {import('better-sqlite3').Database} db */
export function insertCardioImage(db, record) {
  db.prepare(
    `INSERT INTO cardio_images
       (image_id, patient_id, kind, visit_module, visit_date, mime_type, base64, size_bytes, width, height, created_at)
     VALUES (@imageId, @patientId, @kind, @visitModule, @visitDate, @mimeType, @base64, @sizeBytes, @width, @height, @createdAt)`
  ).run(record);
}

/** @param {import('better-sqlite3').Database} db @param {string} patientId */
export function listCardioImages(db, patientId) {
  return db
    .prepare(
      `SELECT image_id AS imageId, patient_id AS patientId, kind, visit_module AS visitModule,
              visit_date AS visitDate, mime_type AS mimeType, size_bytes AS sizeBytes,
              width, height, created_at AS createdAt
       FROM cardio_images WHERE patient_id = ? ORDER BY created_at DESC`
    )
    .all(patientId);
}

/**
 * Same as `listCardioImages` but scoped to one visit AND includes the
 * base64 pixel data — used by the small per-visit attach widget for
 * thumbnails, where the result set is a handful of images, not a patient's
 * whole history.
 * @param {import('better-sqlite3').Database} db
 */
export function listCardioImagesForVisit(db, patientId, visitModule, visitDate) {
  return db
    .prepare(
      `SELECT image_id AS imageId, patient_id AS patientId, kind, visit_module AS visitModule,
              visit_date AS visitDate, mime_type AS mimeType, base64, size_bytes AS sizeBytes,
              width, height, created_at AS createdAt
       FROM cardio_images WHERE patient_id = ? AND visit_module = ? AND visit_date = ?
       ORDER BY created_at DESC`
    )
    .all(patientId, visitModule, visitDate);
}

/** @param {import('better-sqlite3').Database} db @param {string} imageId */
export function getCardioImage(db, imageId) {
  var row = db
    .prepare(
      `SELECT image_id AS imageId, patient_id AS patientId, kind, visit_module AS visitModule,
              visit_date AS visitDate, mime_type AS mimeType, base64, size_bytes AS sizeBytes,
              width, height, created_at AS createdAt
       FROM cardio_images WHERE image_id = ?`
    )
    .get(imageId);
  return row || null;
}

/** @param {import('better-sqlite3').Database} db @param {string} imageId */
export function deleteCardioImage(db, imageId) {
  return db.prepare('DELETE FROM cardio_images WHERE image_id = ?').run(imageId).changes > 0;
}

/** @param {import('better-sqlite3').Database} db @param {string} patientId */
export function sumCardioImageBytes(db, patientId) {
  var row = db
    .prepare('SELECT COALESCE(SUM(size_bytes), 0) AS total FROM cardio_images WHERE patient_id = ?')
    .get(patientId);
  return row ? row.total : 0;
}
