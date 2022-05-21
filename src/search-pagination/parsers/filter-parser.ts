import { CollectionPropertyOptions, ISearchableClass } from "../definitions";
import * as lodash from "lodash";
import { Types } from "mongoose";
import { BadRequestException } from "@nestjs/common";
import { checkPathAndReturnDescriptor } from "./path-checker";

const allowedKeys = [
  "$eq",
  "$gt",
  "$gte",
  "$in",
  "$lt",
  "$lte",
  "$ne",
  "$nin",
  "$and",
  "$not",
  "$nor", // flag, handle filtering
  "$or", // flag, handle filtering
  "$regex",
  "$exists",
];

export class FilterParser {
  constructor(private baseClass: ISearchableClass) {}

  private transform(
    value: any,
    currentPathClass: ISearchableClass,
    currentPropertyDescriptor?: CollectionPropertyOptions,
    nestingLevel = 1
  ) {
    if (Array.isArray(value)) {
      return value.map((item) =>
        this.transform(
          item,
          currentPathClass,
          currentPropertyDescriptor,
          nestingLevel
        )
      );
    } else if (value instanceof Object) {
      const result = {} as any;
      for (const key in value) {
        if (/^\$/.test(key)) {
          this.validateAllowedKey(key);
          result[key] = this.transform(
            value[key],
            currentPathClass,
            currentPropertyDescriptor,
            nestingLevel
          );
        } else {
          const res = checkPathAndReturnDescriptor(
            key,
            currentPathClass,
            "Filtering"
          );
          result[res.fullPath] = this.transform(
            value[key],
            res.propertyClass,
            res.propertyDescriptor,
            nestingLevel + 1
          );
        }
      }
      return result;
    } else {
      if (currentPropertyDescriptor?.isId && typeof value == "string") {
        if (!Types.ObjectId.isValid(value))
          throw new BadRequestException("Malformed Object ID");
        return new Types.ObjectId(value);
      }
      if (currentPropertyDescriptor?.isDate) {
        return new Date(value);
      }
      return value;
    }
  }

  private validateAllowedKey(key: string) {
    if (!allowedKeys.includes(key))
      throw new BadRequestException(
        `Key '${key}' is not allowed for filtering.`
      );
  }

  parse(filter: Record<any, any>): Record<any, any> {
    const result = this.transform(
      lodash.cloneDeep(filter),
      this.baseClass
    ) as any as Record<any, any>;
    return result;
  }
}
