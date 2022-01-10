import { Document, FilterQuery, SaveOptions, Model } from "mongoose";

export interface MongooseSoftDeleteModel<T extends Document> extends Model<T> {
  // findDeleted(): T[];
  restore(query: FilterQuery<T>): Promise<{ restored: number }>;
  softDelete(
    query: FilterQuery<T>,
    options?: SaveOptions
  ): Promise<{ deleted: number }>;
}
