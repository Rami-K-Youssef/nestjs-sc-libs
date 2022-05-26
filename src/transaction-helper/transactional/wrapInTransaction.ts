import { getNamespace } from "cls-hooked";
import {
  NAMESPACE_NAME,
  setSessionForConnection,
  getSessionForConnection,
} from "./common";
import { runInNewHookContext } from "./hook";
import { Propagation } from "./Propagation";
import { TransactionalError } from "./TransactionalError";
import * as mongoose from "mongoose";
import { ClientSession } from "mongodb";
import { getConnection } from "./connections";

export type Options = {
  connectionName?: string | (() => string | undefined);
  propagation?: Propagation;
};

export function wrapInTransaction<
  Func extends (this: any, ...args: any[]) => ReturnType<Func>
>(fn: Func, options?: Options & { name?: string | symbol }) {
  function wrapped(this: unknown, ...newArgs: unknown[]): ReturnType<Func> {
    const context = getNamespace(NAMESPACE_NAME);
    if (!context) {
      throw new Error(
        "No CLS namespace defined in your app ... please call initializeTransactionalContext() before application start."
      );
    }
    let tempConnectionName =
      options && options.connectionName ? options.connectionName : "default";
    if (typeof tempConnectionName == "function") {
      tempConnectionName = tempConnectionName() || "default";
    }
    const connectionName: string = tempConnectionName;
    const connection = getConnection(connectionName);
    if (!connection) throw new Error("Connection not found");
    const methodNameStr = String(options?.name);
    const propagation: Propagation =
      options && options.propagation
        ? options.propagation
        : Propagation.REQUIRED;

    const operationId = String(new Date().getTime());
    const log = (message: string) => {};

    const runOriginal = async () => fn.apply(this, [...newArgs]);
    const runWithNewHook = async () =>
      runInNewHookContext(context, runOriginal);
    const runWithNewTransaction = async () => {
      const transactionCallback = async (session: ClientSession) => {
        log(
          `runWithNewTransaction - set entityManager in context: isCurrentTransactionActive: ${
            session?.inTransaction() ?? false
          }`
        );
        setSessionForConnection(connectionName, context, session);
        try {
          const result = await fn.apply(this, [...newArgs]);
          log(`runWithNewTransaction - Success`);
          return result;
        } catch (e) {
          log(`runWithNewTransaction - ERROR|${e}`);
          throw e;
        } finally {
          log(`runWithNewTransaction - reset entityManager in context`);
          setSessionForConnection(connectionName, context, null);
        }
      };
      return await runInNewHookContext(context, async () => {
        const session = await connection.startSession();
        session.startTransaction();
        try {
          const res = await transactionCallback(session);
          await session.commitTransaction();
          return res;
        } catch (err) {
          await session.abortTransaction();
          throw err;
        } finally {
          await session.endSession();
        }
      });
    };
    return context.runAndReturn(async () => {
      const currentTransaction = getSessionForConnection(
        connectionName,
        context
      );
      switch (propagation) {
        case Propagation.MANDATORY:
          if (!currentTransaction) {
            throw new TransactionalError(
              "No existing transaction found for transaction marked with propagation 'MANDATORY'"
            );
          }
          return runOriginal();
        case Propagation.NEVER:
          if (currentTransaction) {
            throw new TransactionalError(
              "Found an existing transaction, transaction marked with propagation 'NEVER'"
            );
          }
          return runWithNewHook();
        case Propagation.NOT_SUPPORTED:
          if (currentTransaction) {
            setSessionForConnection(connectionName, context, null);
            const result = await runWithNewHook();
            setSessionForConnection(
              connectionName,
              context,
              currentTransaction
            );
            return result;
          }
          return runOriginal();
        case Propagation.REQUIRED:
          if (currentTransaction) {
            return runOriginal();
          }
          return runWithNewTransaction();
        case Propagation.SUPPORTS:
          if (currentTransaction) {
            return runOriginal();
          } else {
            return runWithNewHook();
          }
      }
    }) as unknown as ReturnType<Func>;
  }
  return wrapped as Func;
}
