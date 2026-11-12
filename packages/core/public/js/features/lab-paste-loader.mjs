/**
 * Ring loader with step text for «Pegar SOME» (nav redesign, board 7). The
 * ring spins on the compositor, so it keeps turning while the parse blocks the
 * main thread; between steps the page yields one frame so the text repaints.
 * No fixed waits: every step shows only as long as its real work takes.
 */
var STEPS = [
  'Leyendo el texto pegado',
  'Buscando valores de labs',
  'Ordenando por fecha',
  'Listo para el .docx',
];
var DONE_LINGER_MS = 400;

function paint() {
  return new Promise(function (resolve) {
    requestAnimationFrame(function () {
      setTimeout(resolve, 0);
    });
  });
}

function buildLoader() {
  var root = document.createElement('div');
  root.className = 'paste-loader';
  root.setAttribute('role', 'status');
  root.setAttribute('aria-live', 'polite');
  function div(cls, kids) {
    var d = document.createElement('div');
    if (cls) d.className = cls;
    (kids || []).forEach(function (k) { d.appendChild(k); });
    return d;
  }
  var ring = div('paste-loader-ring');
  ring.setAttribute('aria-hidden', 'true');
  root.appendChild(div('paste-loader-card', [
    ring,
    div('', [div('paste-loader-text'), div('paste-loader-step')]),
  ]));
  document.body.appendChild(root);
  return root;
}

/**
 * Run work steps in order under the loader. A step that returns false stops
 * the run and hides the loader at once. Returns a promise for the last step's turn.
 * @param {Array<function(): (boolean|void)>} works one per STEPS entry (the last label is «Listo»)
 */
export async function runWithPasteLoader(works) {
  var root = buildLoader();
  var text = root.querySelector('.paste-loader-text');
  var step = root.querySelector('.paste-loader-step');
  function show(i) {
    text.textContent = STEPS[i];
    step.textContent = 'Paso ' + (i + 1) + ' de ' + STEPS.length;
  }
  try {
    for (var i = 0; i < works.length; i++) {
      show(i);
      await paint();
      if (works[i]() === false) {
        root.remove();
        return;
      }
    }
    show(STEPS.length - 1);
    setTimeout(function () {
      root.remove();
    }, DONE_LINGER_MS);
  } catch (e) {
    root.remove();
    throw e;
  }
}
