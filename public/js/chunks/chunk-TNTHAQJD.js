// public/js/lan-mutation-registry.mjs
function createMutationRegistry(deps = {}) {
  const handlers = /* @__PURE__ */ new Map();
  const domainKinds = /* @__PURE__ */ new Map();
  let isActiveRef = deps.isActive ?? (() => false);
  let markUntypedDirtyRef = deps.markUntypedDirty ?? (() => {
  });
  let scheduleUntypedSafety = deps.scheduleUntypedSafetyBundle ?? (() => {
  });
  let enqueueOutboxRef = deps.enqueueOutbox ?? (() => {
  });
  let getActiveRoomIdRef = deps.getActiveRoomId ?? (() => "");
  function configure(liveDeps) {
    if (typeof liveDeps.isActive === "function") isActiveRef = liveDeps.isActive;
    if (typeof liveDeps.markUntypedDirty === "function") markUntypedDirtyRef = liveDeps.markUntypedDirty;
    if (typeof liveDeps.scheduleUntypedSafetyBundle === "function") {
      scheduleUntypedSafety = liveDeps.scheduleUntypedSafetyBundle;
    }
    if (typeof liveDeps.enqueueOutbox === "function") enqueueOutboxRef = liveDeps.enqueueOutbox;
    if (typeof liveDeps.getActiveRoomId === "function") getActiveRoomIdRef = liveDeps.getActiveRoomId;
  }
  function registerMutationHandler(domain, handler) {
    handlers.set(String(domain), handler);
  }
  function setDomainOutboxKind(domain, kind) {
    domainKinds.set(String(domain), kind);
  }
  function isTypedDomain(domain) {
    return handlers.has(String(domain));
  }
  async function dispatchLanMutation(domain, patientId, payload) {
    if (!isActiveRef()) return;
    const handler = handlers.get(String(domain));
    if (handler) {
      try {
        await handler(patientId, payload);
      } catch (_err) {
        const kind = domainKinds.get(String(domain));
        if (kind) {
          const roomId = getActiveRoomIdRef();
          if (roomId) enqueueOutboxRef(roomId, { kind, payload: { patientId, data: payload } });
        }
      }
    } else {
      markUntypedDirtyRef(domain, patientId);
      scheduleUntypedSafety();
    }
  }
  return {
    registerMutationHandler,
    setDomainOutboxKind,
    isTypedDomain,
    dispatchLanMutation,
    configure
  };
}
var lanMutationRegistry = createMutationRegistry();

export {
  createMutationRegistry,
  lanMutationRegistry
};
//# sourceMappingURL=/js/chunks/chunk-TNTHAQJD.js.map
