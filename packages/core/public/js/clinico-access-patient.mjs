export {
  extractSalaLetter,
  salaLetterForTeamOrArea,
  resolvePatientSala,
  patientInUserSala,
  stampPatientClinicalSala,
  migratePatientsClinicalSala,
} from '../../lib/clinical-scope/patient-sala.mjs';

export {
  isInterconsultasPatient,
  userOffCallFromInterconsultasRotationServices,
  userOnCallForInterconsultasTeam,
} from '../../lib/clinical-scope/interconsultas.mjs';
