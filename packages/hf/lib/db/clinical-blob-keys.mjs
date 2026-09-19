/** @type {Record<string, string>} localStorage rpc-* key → clinical_blob.blob_key */
export const LS_KEY_TO_BLOB = {
  'rpc-patients': 'patients',
  'rpc-notes': 'notes',
  'rpc-indicaciones': 'indicaciones',
  'rpc-labHistory': 'labHistory',
  'rpc-medRecetaByPatient': 'medRecetaByPatient',
  'rpc-listado-problemas': 'listadoProblemas',
  'rpc-recetaHuByPatient': 'recetaHuByPatient',
  'rpc-vpoByPatient': 'vpoByPatient',
  'rpc-medPharmProfileByPatient': 'medPharmProfileByPatient',
  'rpc-medCatalog': 'medCatalog',
  'rpc-todos': 'todos',
  'rpc-scheduled-procedures': 'scheduledProcedures',
};
