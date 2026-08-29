import {
  computeReminderAt
} from "/mobile/js/chunks/chunk-2SJQGKPU.js";
import {
  storage
} from "/mobile/js/chunks/chunk-EZ7GA6IL.js";

// public/js/todos-reminder-scheduler.mjs
var deps = {
  getPatientLabel(pid) {
    return String(pid || "");
  },
  showToast(_msg, _type) {
  },
  onNotify(_payload) {
  }
};
var timeouts = /* @__PURE__ */ new Map();
function scheduleKey(patientId, todoId) {
  return String(patientId) + ":" + String(todoId);
}
function clearTimeoutForKey(key) {
  var id = timeouts.get(key);
  if (id != null) {
    clearTimeout(id);
    timeouts.delete(key);
  }
}
function fireReminder(patientId, todo) {
  if (typeof deps.isKnownPatient === "function" && !deps.isKnownPatient(patientId)) {
    return;
  }
  var label = deps.getPatientLabel(patientId);
  var text = String(todo && todo.text != null ? todo.text : "").trim();
  var msg = text ? "Pendiente \xB7 " + label + " \u2014 " + text : "Pendiente \xB7 " + label;
  deps.showToast(msg, "warn");
  var title = "Pendiente";
  var body = text ? label + " \u2014 " + text : label;
  if (typeof Notification !== "undefined") {
    new Notification(title, { body });
  }
  if (typeof deps.onNotify === "function") {
    deps.onNotify({ patientId, todo, message: msg });
  }
}
function isLivePatient(patientId) {
  return typeof deps.isKnownPatient !== "function" || deps.isKnownPatient(patientId);
}
function scheduleTodoReminder(patientId, todo) {
  if (!todo || !todo.id) return;
  var key = scheduleKey(patientId, todo.id);
  clearTimeoutForKey(key);
  if (!isLivePatient(patientId)) return;
  if (todo.completed) return;
  var reminderAt = computeReminderAt(todo);
  if (!reminderAt) return;
  var targetMs = new Date(reminderAt).getTime();
  if (Number.isNaN(targetMs)) return;
  var delay = Math.max(0, targetMs - Date.now());
  if (delay === 0) {
    fireReminder(patientId, todo);
    return;
  }
  var timeoutId = setTimeout(function() {
    timeouts.delete(key);
    fireReminder(patientId, todo);
  }, delay);
  timeouts.set(key, timeoutId);
}
function cancelStaleKeys(activeKeys) {
  Array.from(timeouts.keys()).forEach(function(key) {
    if (!activeKeys.has(key)) {
      clearTimeoutForKey(key);
    }
  });
}
function collectActiveKeysForPatient(patientId, activeKeys) {
  storage.getTodos(patientId).forEach(function(t) {
    if (!t.completed && computeReminderAt(t)) {
      activeKeys.add(scheduleKey(patientId, t.id));
    }
  });
}
function configureTodoReminderScheduler(newDeps) {
  if (newDeps && typeof newDeps === "object") {
    if (typeof newDeps.getPatientLabel === "function") {
      deps.getPatientLabel = newDeps.getPatientLabel;
    }
    if (typeof newDeps.showToast === "function") {
      deps.showToast = newDeps.showToast;
    }
    if (typeof newDeps.onNotify === "function") {
      deps.onNotify = newDeps.onNotify;
    }
    if (typeof newDeps.isKnownPatient === "function") {
      deps.isKnownPatient = newDeps.isKnownPatient;
    }
  }
}
function rescheduleAllTodos(patientId) {
  if (patientId != null && patientId !== "") {
    var pid = String(patientId);
    var activeKeys = /* @__PURE__ */ new Set();
    collectActiveKeysForPatient(pid, activeKeys);
    Array.from(timeouts.keys()).forEach(function(key) {
      if (key.indexOf(pid + ":") === 0 && !activeKeys.has(key)) {
        clearTimeoutForKey(key);
      }
    });
    storage.getTodos(pid).forEach(function(t) {
      scheduleTodoReminder(pid, t);
    });
    return;
  }
  var patientIds = storage.listTodoPatientIds();
  var allActive = /* @__PURE__ */ new Set();
  patientIds.forEach(function(id) {
    if (!isLivePatient(id)) return;
    collectActiveKeysForPatient(id, allActive);
  });
  cancelStaleKeys(allActive);
  patientIds.forEach(function(id) {
    if (!isLivePatient(id)) return;
    storage.getTodos(id).forEach(function(t) {
      scheduleTodoReminder(id, t);
    });
  });
}
function cancelTodoReminder(todoId, patientId) {
  if (patientId != null && patientId !== "") {
    clearTimeoutForKey(scheduleKey(patientId, todoId));
    return;
  }
  var suffix = ":" + String(todoId);
  Array.from(timeouts.keys()).forEach(function(key) {
    if (key.slice(-suffix.length) === suffix) {
      clearTimeoutForKey(key);
    }
  });
}
function resetTodoReminderSchedulerForTests() {
  Array.from(timeouts.keys()).forEach(function(key) {
    clearTimeoutForKey(key);
  });
  deps = {
    getPatientLabel(pid) {
      return String(pid || "");
    },
    showToast(_msg, _type) {
    },
    onNotify(_payload) {
    }
  };
}

export {
  configureTodoReminderScheduler,
  rescheduleAllTodos,
  cancelTodoReminder,
  resetTodoReminderSchedulerForTests
};
//# sourceMappingURL=/js/chunks/chunk-SHV4FR3K.js.map
