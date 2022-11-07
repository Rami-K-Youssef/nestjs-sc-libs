import { SearchKey } from "./search-key";
export interface ISearchable {
  __props?: Record<string, CollectionPropertyOptions>;
}

export type ISearchableClass = new () => ISearchable;

import { Types } from "mongoose";
import { Expose, Transform, Type } from "class-transformer";
import { ApiHideProperty } from "@nestjs/swagger";

export interface CollectionPropertyOptions {
  readonly name?: string;
  readonly sortable?: boolean;
  readonly filterable?: boolean;
  readonly defaultSort?: boolean;
  readonly pathClass?: () => ISearchableClass;
  readonly isId?: boolean;
  readonly isDate?: boolean;
  readonly isArray?: boolean;
  readonly includeInMinified?: boolean;
  readonly prefix?: string;
  readonly postfix?: string;
}

export class BaseResponseDto {
  @Expose()
  @Transform(({ value, obj }) => {
    return (
      value ?? (typeof obj?._id == "string" ? obj?._id : obj?._id?.toString?.())
    );
  })
  id: string;
  @Expose()
  createdAt: Date;
  @Expose()
  updatedAt: Date;
  @Expose()
  @Type(() => String)
  __afterId: string;
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
    projection?: any;
    flags?: number;
    deleted?: boolean;
    joinField?: string;
    collection?: string;
  }
>;

export enum LookupFlags {
  REQUIRED = 1,
  SINGLE = 2,
  UNWIND = 4,
  NONSOFTDELETE = 8,
}
