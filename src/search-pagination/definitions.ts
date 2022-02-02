import { SearchKey } from "./search-key";
export interface ISearchable {
  __props?: Record<string, CollectionPropertyOptions>;
}

export type ISearchableClass = new () => ISearchable;

import { Types } from "mongoose";
import { Expose, Transform } from "class-transformer";
import { ApiHideProperty } from "@nestjs/swagger";

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
  @SearchKey({
    defaultSort: true,
    sortable: true,
    filterable: true,
  })
  createdAt: Date;

  @SearchKey({ filterable: true, sortable: true })
  deletedAt: Date;

  @SearchKey({ filterable: true, sortable: true })
  updatedAt: Date;

  @SearchKey({ filterable: true, sortable: true })
  isDeleted: boolean;

  __props?: Record<string, CollectionPropertyOptions>;
}

export interface CollectionPropertyOptions {
  readonly name?: string;
  readonly sortable?: boolean;
  readonly filterable?: boolean;
  readonly defaultSort?: boolean;
  readonly pathClass?: () => ISearchableClass;
  readonly isId?: boolean;
  readonly isDate?: boolean;
  readonly isArray?: boolean;
  readonly includeInMinifed?: boolean;
}

export class BaseResponseDto {
  @Expose({ toClassOnly: true, name: "_id" })
  @ApiHideProperty()
  @Transform(
    ({ obj }) => {
      return obj._id?.toString();
    },
    { toClassOnly: true }
  )
  _id: string;

  @Expose()
  @Transform(
    ({ value, obj }) => {
      return (
        value ?? (typeof obj?._id == "string" ? obj?._id : obj?._id?.toString())
      );
    },
    { toPlainOnly: true }
  )
  id: string;
  @Expose()
  createdAt: Date;
  @Expose()
  updatedAt: Date;
}

export interface DiscriminatorDescDto {
  keepDiscriminatorProperty: boolean;
  discriminator: {
    property: string;
    subTypes: Array<{
      name: string;
      value: new (...args: any[]) => unknown;
    }>;
  };
}

export type PathOptions = Record<
  string,
  {
    accessibility?: Record<string, any>;
    projection?: string[];
    flags?: number;
    deleted?: boolean;
    joinField?: string;
  }
>;

export enum LookupFlags {
  REQUIRED = 1,
  SINGLE = 2,
  UNWIND = 4,
  NONSOFTDELETE = 8,
}
