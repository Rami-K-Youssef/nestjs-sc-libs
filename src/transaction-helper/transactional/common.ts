import { createNamespace, getNamespace, Namespace } from "cls-hooked";
import { EventEmitter } from "events";
import { ClientSession } from "mongodb";
import { debugLog } from "./DebugLog";

export const NAMESPACE_NAME = "__mongoose___cls_hooked_tx_namespace";

const MONGOOSE_KEY_PREFIX = "__mongoose__transactionalEntityManager_";
const MONGOOSE_HOOK_KEY = "__mongoose__transactionalCommitHooks";

export const initializeTransactionalContext = () => {
  debugLog(`Transactional@initializeTransactionalContext`);
  return getNamespace(NAMESPACE_NAME) || createNamespace(NAMESPACE_NAME);
};

export const setSessionForConnection = (
  connectionName: string,
  context: Namespace,
  session: ClientSession | null
) => context.set(`${MONGOOSE_KEY_PREFIX}${connectionName}`, session);

export const getSessionForConnection = (
  connectionName: string,
  context: Namespace
): ClientSession => context.get(`${MONGOOSE_KEY_PREFIX}${connectionName}`);

export const getHookInContext = (
  context: Namespace | undefined
): EventEmitter | null => {
  return context?.get(MONGOOSE_HOOK_KEY);
};

export const setHookInContext = (
  context: Namespace,
  emitter: EventEmitter | null
) => {
  return context.set(MONGOOSE_HOOK_KEY, emitter);
};
