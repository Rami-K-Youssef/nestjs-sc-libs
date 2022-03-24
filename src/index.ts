import "reflect-metadata";

export * from "./transaction-helper";
export * from "./mongoose-softdelete";
export * from "./search-pagination";
export * from "./backend-helpers";
export * from "./uploader";
export * from "./serve-static";

import { MongooseSoftDeleteModel } from "./mongoose-softdelete";
import {
  AccessibleFieldsDocument,
  AccessibleFieldsModel,
  AccessibleRecordModel,
} from "@casl/mongoose";

export type CompleteModel<T extends AccessibleFieldsDocument> =
  AccessibleRecordModel<T> &
    MongooseSoftDeleteModel<T> &
    AccessibleFieldsModel<T>;

export type AccessibleModel<T extends AccessibleFieldsDocument> =
  AccessibleRecordModel<T> & AccessibleFieldsModel<T>;
