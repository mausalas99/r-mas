import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const {
  resolveBulkPreviewConfirmState,
  shouldOfferBulkPreviewAddPatient,
  hasPendingBulkLabPreviewSession,
  shouldAutoConfirmAfterPatientSave,
  renderBlockExpedientes,
  renderBlockRawText,
  openLabBulkPreviewModal,
  closeLabBulkPreviewModal,
} = await import('./lab-bulk-preview-modal.mjs');

describe('resolveBulkPreviewConfirmState', () => {
  it('permite confirmar cuando hay reportes válidos sin paciente en lista', () => {
    var state = resolveBulkPreviewConfirmState([
      { status: 'no-patient', okReportCount: 2, canProcess: false },
    ]);
    assert.equal(state.processable, false);
    assert.equal(state.displayable, true);
    assert.equal(state.canConfirm, true);
  });

  it('permite confirmar con varios bloques sin pacientes registrados', () => {
    var state = resolveBulkPreviewConfirmState([
      { status: 'no-patient', okReportCount: 1, canProcess: false },
      { status: 'no-patient', okReportCount: 1, canProcess: false },
    ]);
    assert.equal(state.canConfirm, true);
  });

  it('bloquea confirmar cuando no hay reportes parseables', () => {
    var state = resolveBulkPreviewConfirmState([
      { status: 'parse-errors', okReportCount: 0, canProcess: false },
    ]);
    assert.equal(state.displayable, false);
    assert.equal(state.canConfirm, false);
  });

  it('marca processable cuando el expediente está en la lista', () => {
    var state = resolveBulkPreviewConfirmState([
      {
        status: 'ok',
        okReportCount: 2,
        canProcess: true,
        patient: { id: 'p1' },
      },
    ]);
    assert.equal(state.processable, true);
    assert.equal(state.canConfirm, true);
  });
});

describe('shouldOfferBulkPreviewAddPatient', () => {
  it('ofrece alta cuando el bloque parseó labs pero no hay paciente', () => {
    assert.equal(
      shouldOfferBulkPreviewAddPatient({ status: 'no-patient', okReportCount: 2 }),
      true
    );
  });

  it('no ofrece alta cuando el paciente ya está en lista', () => {
    assert.equal(
      shouldOfferBulkPreviewAddPatient({ status: 'ok', okReportCount: 2, canProcess: true }),
      false
    );
  });

  it('no ofrece alta sin reportes válidos', () => {
    assert.equal(
      shouldOfferBulkPreviewAddPatient({ status: 'no-patient', okReportCount: 0 }),
      false
    );
  });
});

describe('hasPendingBulkLabPreviewSession', () => {
  it('is false without an open modal session', () => {
    assert.equal(hasPendingBulkLabPreviewSession(), false);
  });
});

describe('closeLabBulkPreviewModal (Cancelar/X no debe reabrir el modal)', () => {
  function fakeEl() {
    var classes = [];
    var attrs = Object.create(null);
    return {
      classList: {
        add: function (c) {
          if (classes.indexOf(c) === -1) classes.push(c);
        },
        remove: function (c) {
          classes = classes.filter(function (x) {
            return x !== c;
          });
        },
        contains: function (c) {
          return classes.indexOf(c) !== -1;
        },
      },
      setAttribute: function (k, v) {
        attrs[k] = String(v);
      },
      getAttribute: function (k) {
        return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null;
      },
      textContent: '',
      innerHTML: '',
      onclick: null,
      disabled: false,
      title: '',
    };
  }

  it('descarta la sesión pendiente al cerrar, aunque haya onConfirm', () => {
    var ids = {
      'lab-bulk-preview-backdrop': fakeEl(),
      'lab-bulk-preview-summary': fakeEl(),
      'lab-bulk-preview-body': fakeEl(),
      'lab-bulk-preview-confirm': fakeEl(),
    };
    var prevDocument = globalThis.document;
    globalThis.document = {
      documentElement: fakeEl(),
      getElementById: function (id) {
        return ids[id] || null;
      },
    };
    try {
      openLabBulkPreviewModal({
        blocks: [{ status: 'mixed-expediente', okReportCount: 1, canProcess: false, reports: [], expedientes: ['2020511-9', '2239216-8'] }],
        sourceText: 'Expediente: 2020511-9',
        onConfirm: () => {},
      });
      assert.equal(hasPendingBulkLabPreviewSession(), true);
      assert.equal(ids['lab-bulk-preview-backdrop'].classList.contains('open'), true);

      closeLabBulkPreviewModal();

      assert.equal(hasPendingBulkLabPreviewSession(), false);
      assert.equal(ids['lab-bulk-preview-backdrop'].classList.contains('open'), false);
    } finally {
      globalThis.document = prevDocument;
    }
  });
});

describe('renderBlockExpedientes (mezcla de pacientes: revisar cuáles expedientes)', () => {
  it('muestra ambos expedientes cuando hay 2+', () => {
    var html = renderBlockExpedientes({ expedientes: ['0008421-7', '1111111-1'] });
    assert.match(html, /0008421-7/);
    assert.match(html, /1111111-1/);
    assert.match(html, / y /);
  });

  it('vacío con menos de 2 expedientes (no hay mezcla que mostrar)', () => {
    assert.equal(renderBlockExpedientes({ expedientes: ['0008421-7'] }), '');
    assert.equal(renderBlockExpedientes({ expedientes: [] }), '');
    assert.equal(renderBlockExpedientes({}), '');
  });
});

describe('renderBlockRawText (inspeccionar el texto pegado/descargado)', () => {
  it('arma un <details> con el texto crudo escapado', () => {
    var html = renderBlockRawText({ rawText: 'Expediente:\t0008421-7\n<script>' });
    assert.match(html, /<details/);
    assert.match(html, /Ver texto/);
    assert.match(html, /Expediente:/);
    assert.doesNotMatch(html, /<script>/);
  });

  it('vacío sin rawText', () => {
    assert.equal(renderBlockRawText({}), '');
    assert.equal(renderBlockRawText({ rawText: '   ' }), '');
  });
});

describe('shouldAutoConfirmAfterPatientSave', () => {
  it('confirma cuando el bloque quedó listo y no faltan altas', () => {
    assert.equal(
      shouldAutoConfirmAfterPatientSave([
        { status: 'ok', okReportCount: 1, canProcess: true, patient: { id: 'p1' } },
      ]),
      true
    );
  });

  it('no confirma si aún hay pacientes sin registrar', () => {
    assert.equal(
      shouldAutoConfirmAfterPatientSave([
        { status: 'ok', okReportCount: 1, canProcess: true, patient: { id: 'p1' } },
        { status: 'no-patient', okReportCount: 1, canProcess: false },
      ]),
      false
    );
  });
});
