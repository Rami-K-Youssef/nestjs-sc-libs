import {
  Document,
  SaveOptions,
  Schema,
  MongooseQueryMiddleware,
  MongooseDocumentMiddleware,
  Query,
} from "mongoose";
import { getNameByConnection } from "./transactional/connections";
import { getNamespace } from "cls-hooked";
import {
  NAMESPACE_NAME,
  getSessionForConnection,
} from "./transactional/common";
import { ClientSession } from "mongodb";

function patchDocumentMethodMiddleware(this, next) {
  const context = getNamespace(NAMESPACE_NAME);
  let connectionName: string = null;
  let fn: "session" | "$session" = null;
  if (this instanceof Document) {
    if (this.collection == undefined) {
      return next();
    }
    connectionName = getNameByConnection(this.collection.conn);
    fn = "$session";
  } else if (this instanceof Query) {
    connectionName = getNameByConnection(this.model.collection.conn);
    fn = "session";
  }
  const session = getSessionForConnection(connectionName, context);
  if (session) {
    this[fn](session);
  }
  next();
}

const documentMethods = [
  "save",
  "updateOne",
  "remove",
  "deleteOne",
  "updateMany",
] as Array<MongooseDocumentMiddleware | MongooseQueryMiddleware>;

export const mongooseTrxPlugin = (schema: Schema) => {
  documentMethods.forEach((method) =>
    schema.pre(method, patchDocumentMethodMiddleware)
  );
};
