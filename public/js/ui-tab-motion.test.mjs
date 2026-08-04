import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TAB_INDICATOR_BASE_PX,
  tabIndicatorTransform,
  innerTabButtonId,
  runTabPanelEnterAnimation,
} from './ui-tab-motion.mjs';

test('tabIndicatorTransform: translateX + scaleX sobre el ancho base', () => {
  assert.equal(tabIndicatorTransform(120, 80), 'translateX(120px) scaleX(1)');
  assert.equal(tabIndicatorTransform(0, 40), 'translateX(0px) scaleX(0.5)');
  assert.equal(tabIndicatorTransform(24, 112, 80), 'translateX(24px) scaleX(1.4)');
});

test('tabIndicatorTransform: clamp de valores inválidos', () => {
  assert.equal(tabIndicatorTransform(-5, -10), 'translateX(0px) scaleX(0)');
  assert.equal(tabIndicatorTransform(NaN, NaN), 'translateX(0px) scaleX(0)');
});

test('tabIndicatorTransform: base por defecto exportada', () => {
  assert.equal(TAB_INDICATOR_BASE_PX, 80);
  assert.equal(
    tabIndicatorTransform(10, TAB_INDICATOR_BASE_PX),
    'translateX(10px) scaleX(1)'
  );
});

test('innerTabButtonId: consolidado mapea granular → tab contenedor', () => {
  assert.equal(innerTabButtonId('tend', { consolidated: true }), 'itab-resultados');
  assert.equal(innerTabButtonId('recetaHu', { consolidated: true }), 'itab-salida');
  assert.equal(innerTabButtonId('recetaHu'), 'itab-receta-hu');
});

test('runTabPanelEnterAnimation: clears enter class after fallback timeout', async () => {
  var el = {
    classList: {
      _set: new Set(),
      add: function (c) {
        this._set.add(c);
      },
      remove: function () {
        for (var i = 0; i < arguments.length; i++) this._set.delete(arguments[i]);
      },
      contains: function (c) {
        return this._set.has(c);
      },
    },
    offsetWidth: 100,
    addEventListener: function () {},
    removeEventListener: function () {},
  };
  var prevDoc = globalThis.document;
  globalThis.document = {
    documentElement: { classList: { contains: function () { return false; } } },
  };
  try {
    runTabPanelEnterAnimation(el, 'tab-panel-enter');
    assert.equal(el.classList.contains('tab-panel-enter'), true);
    await new Promise(function (resolve) {
      setTimeout(resolve, 500);
    });
    assert.equal(el.classList.contains('tab-panel-enter'), false);
  } finally {
    if (prevDoc === undefined) delete globalThis.document;
    else globalThis.document = prevDoc;
  }
});
