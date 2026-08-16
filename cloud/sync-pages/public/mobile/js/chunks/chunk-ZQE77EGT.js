// public/js/todos-priority.mjs
var TODO_PRIORITY_CYCLE = ["alta", "media", "baja"];
function normalizeTodoPriority(priority) {
  return priority === "alta" || priority === "baja" ? priority : "media";
}
function nextTodoPriority(priority) {
  var current = normalizeTodoPriority(priority);
  var idx = TODO_PRIORITY_CYCLE.indexOf(current);
  return TODO_PRIORITY_CYCLE[(idx + 1) % TODO_PRIORITY_CYCLE.length];
}
function todoPriorityLabel(priority) {
  if (priority === "alta") return "Alta";
  if (priority === "baja") return "Baja";
  return "Media";
}

export {
  normalizeTodoPriority,
  nextTodoPriority,
  todoPriorityLabel
};
//# sourceMappingURL=/js/chunks/chunk-ZQE77EGT.js.map
