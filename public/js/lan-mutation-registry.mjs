/**
 * LAN Mutation Registry — routes domain saves to typed endpoints or
 * the untyped 30-second safety bundle.
 *
 * Usage:
 *   import { lanMutationRegistry } from './lan-mutation-registry.mjs';
 *   lanMutationRegistry.registerMutationHandler('nota', pushNotaToHost);
 *   lanMutationRegistry.dispatchLanMutation('nota', patientId, payload);
 *
 * For testing, use createMutationRegistry(deps) to get an isolated instance.
 */

export function createMutationRegistry(deps = {}) {
  const handlers = new Map();
  const domainKinds = new Map();

  const isActive = deps.isActive ?? (() => false);
  const markUntypedDirty = deps.markUntypedDirty ?? (() => {});
  const scheduleUntypedSafetyBundle = deps.scheduleUntypedSafetyBundle ?? (() => {});
  const enqueueOutbox = deps.enqueueOutbox ?? (() => {});
  const getActiveRoomId = deps.getActiveRoomId ?? (() => '');

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
    if (!isActive()) return;
    const handler = handlers.get(String(domain));
    if (handler) {
      try {
        await handler(patientId, payload);
      } catch (_err) {
        const kind = domainKinds.get(String(domain));
        if (kind) {
          const roomId = getActiveRoomId();
          if (roomId) enqueueOutbox(roomId, { kind, payload: { patientId, data: payload } });
        }
      }
    } else {
      markUntypedDirty(domain, patientId);
      scheduleUntypedSafetyBundle();
    }
  }

  return {
    registerMutationHandler,
    setDomainOutboxKind,
    isTypedDomain,
    dispatchLanMutation,
  };
}

// Singleton for production use; wired in orchestrator.mjs at boot.
export const lanMutationRegistry = createMutationRegistry();
