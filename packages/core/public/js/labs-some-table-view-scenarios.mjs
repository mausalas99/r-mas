/** Synthetic SOME reports for the SOME tables view tests (inputs only; fresh objects each call, the renderer normalises in place). */
export function makeParsed() {
  return {
    departments: [
      {
        key: 'HEMATOLOGIA',
        label: 'HEMATOLOGIA',
        groups: [
          {
            title: 'BIOMETRIA',
            tableVariant: 'standard',
            rows: [
              { estudio: 'HGB', resultado: '8.56', unidades: 'g/dL', ref: '12-15', flag: 'B', abnormal: true },
              { estudio: 'WBC <x> & "y"', resultado: '10', unidades: '', ref: '4-11', flag: '*' },
            ],
          },
          { title: 'INDICES', tableVariant: 'standard', rows: [{ estudio: 'MCV', resultado: '98', unidades: 'fL', ref: '80-98' }] },
          { title: 'VACIO', tableVariant: 'standard', rows: [] },
        ],
      },
      {
        key: 'BACTERIOLOGIA',
        label: 'BACTERIOLOGIA',
        groups: [
          {
            title: 'CITOQUIMICO DE LIQUIDOS CORPORALES',
            tableVariant: 'cito',
            fluidSource: 'PERITONEAL',
            rows: [{ estudio: 'RECUENTO', resultado: '10', unidades: '/mm3', ref: '', abnormal: true, flag: 'A' }],
          },
          { title: 'GRAM', tableVariant: 'standard', rows: [{ estudio: 'GRAM', resultado: '', unidades: '', ref: '' }] },
        ],
      },
    ],
  };
}
export const CASES = {
  plain: { opts: undefined },
  modal: { opts: { modalLayout: true } },
  modalHideTitles: { opts: { hideGroupTitles: true, modalLayout: true } },
};
