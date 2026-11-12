/** Synthetic inputs for the manual lab entry view test (expected HTML: lab-manual-entry-view.old.json). */
export const TYPES = {
  empty: [],
  real_catalog_shape: [
    { sectionKey: 'BH', label: 'Biometría (BH)' },
    { sectionKey: 'QS', label: 'Química sanguínea' },
    { sectionKey: 'TP', label: '' },
  ],
  special_chars: [{ sectionKey: 'A<"1">&', label: 'Tipo <x> & "y"' }, { sectionKey: "K'2", label: "it's" }],
  no_key: [{ label: 'Sin clave' }],
};
export const FIELDS = {
  empty: [],
  num_and_qual: [
    { key: 'Hb', label: 'Hb', mode: 'num' },
    { key: 'Aspecto', label: 'Aspecto', mode: 'qual' },
  ],
  special_chars: [{ key: 'k"<1>"&', label: 'Etiqueta <b> & "x"', mode: 'num' }],
  long: Array.from({ length: 23 }, (_, i) => ({ key: 'F' + i, label: 'Campo ' + i + ' %', mode: i % 3 ? 'num' : 'qual' })),
};
