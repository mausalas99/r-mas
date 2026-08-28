// public/js/listado-problemas-core.mjs
var SECCIONES = ["activos", "inactivos"];
function nuevoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function emptyListado(fecha, hora) {
  return {
    fecha: String(fecha || ""),
    hora: String(hora || ""),
    activos: [],
    inactivos: []
  };
}
function ensureSeccion(seccion) {
  if (!SECCIONES.includes(seccion)) {
    throw new Error("secci\xF3n inv\xE1lida: " + seccion);
  }
}
function addProblema(listado, seccion, datos) {
  ensureSeccion(seccion);
  const item = {
    id: nuevoId(),
    fecha: String(datos && datos.fecha || ""),
    descripcion: String(datos && datos.descripcion || "")
  };
  return Object.assign({}, listado, {
    [seccion]: (listado[seccion] || []).concat([item])
  });
}
function removeProblema(listado, seccion, id) {
  ensureSeccion(seccion);
  const arr = listado[seccion] || [];
  const filtered = arr.filter((p) => p.id !== id);
  if (filtered.length === arr.length) return listado;
  return Object.assign({}, listado, { [seccion]: filtered });
}

export {
  emptyListado,
  addProblema,
  removeProblema
};
//# sourceMappingURL=/js/chunks/chunk-MZJL4LWP.js.map
