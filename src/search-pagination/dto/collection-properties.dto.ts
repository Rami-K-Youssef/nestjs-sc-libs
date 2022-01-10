import { Expose } from "class-transformer";
import { Types } from "mongoose";
import { CollectionPropertyOptions, ISearchable } from "../definitions";
import { SearchKey } from "../search-key";

export abstract class BaseCollectionProperties implements ISearchable {
  @SearchKey({
    filterable: true,
    includeInMinifed: true,
    isId: true,
    name: "id",
  })
  _id: Types.ObjectId;

  __props?: Record<string, CollectionPropertyOptions>;
}
export abstract class StampedCollectionProperties
  extends BaseCollectionProperties
  implements ISearchable
{
  @Expose()
  @SearchKey({
    defaultSort: true,
    sortable: true,
    filterable: true,
  })
  createdAt: Date;

  @SearchKey({ filterable: true, sortable: true })
  deletedAt: Date;

  @Expose()
  @SearchKey({ filterable: true, sortable: true })
  updatedAt: Date;

  @SearchKey({ filterable: true, sortable: true })
  isDeleted: boolean;

  __props?: Record<string, CollectionPropertyOptions>;
}
