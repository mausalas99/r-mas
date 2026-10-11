/** Late-bound bridge to break circular imports between patient modules. */
export const patientsBridge = {
  renderPatientList(_opts) {},
  selectPatient(_id, _opts) {},
  deletePatient(_id, _e) {},
};
