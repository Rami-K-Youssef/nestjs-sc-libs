import { BadRequestException } from "@nestjs/common";
import { CollectionPropertyOptions, ISearchableClass } from "../definitions";

export type PathCheckMode = "Filtering" | "Sorting" | "Projecting" | "None";

export function checkPathAndReturnDescriptor(
  path: string | string[],
  baseClass: ISearchableClass,
  mode: PathCheckMode,
  ogPath = null
): {
  propertyClass: ISearchableClass;
  propertyDescriptor: CollectionPropertyOptions;
  fullPath: string;
} {
  const parts = Array.isArray(path) ? path : (path as string).split(".");
  if (ogPath == null) ogPath = parts.join(".");
  const key = parts[0];
  if (!baseClass.prototype.__props[key])
    throw new BadRequestException(`Path '${ogPath}' does not exist.`);
  else {
    if (mode == "Filtering" && !baseClass.prototype.__props[key].filterable) {
      throw new BadRequestException(
        `Path '${ogPath}' is not allowed for Filtering.`
      );
    }
    if (mode == "Sorting" && !baseClass.prototype.__props[key].sortable) {
      throw new BadRequestException(
        `Path '${ogPath}' is not allowed for Sorting.`
      );
    }
    if (parts.length == 1) {
      const descriptor = baseClass.prototype.__props[key];
      const ogPathArr = ogPath.split(".");
      ogPathArr[ogPathArr.length - 1] = descriptor.name;
      return {
        propertyClass: baseClass,
        propertyDescriptor: baseClass.prototype.__props[key],
        fullPath:
          (baseClass.prototype.__props[key].prefix
            ? baseClass.prototype.__props[key].prefix + "."
            : "") +
          ogPathArr.join(".") +
          (baseClass.prototype.__props[key].postfix
            ? "." + baseClass.prototype.__props[key].postfix
            : ""),
      };
    } else if (baseClass.prototype.__props[key].pathClass && parts.length > 1) {
      const pathClass = baseClass.prototype.__props[key].pathClass();
      return checkPathAndReturnDescriptor(
        parts.slice(1),
        pathClass,
        mode,
        ogPath
      );
    }
  }

  throw new BadRequestException("Invalid Paths Provided");
}
