import { isNotEmpty } from "class-validator";
import {
  SearchDto,
  SortableParameters,
  StampedCollectionProperties,
} from "./../dto";
import { BadRequestException } from "@nestjs/common";
import { ISearchableClass } from "./../definitions";
import { checkPathAndReturnDescriptor } from "./path-checker";

export class SorterParser {
  constructor(private baseClass: ISearchableClass) {}

  parse(sortProp: string): SortableParameters {
    const sortableParameters: SortableParameters = {};
    const props = sortProp !== undefined ? sortProp.split(";") : [];

    props
      .filter((v) => isNotEmpty(v))
      .forEach((name: string) => {
        const desc = name[0] === "-";
        const prop = desc ? name.slice(1) : name;

        const res = checkPathAndReturnDescriptor(
          prop,
          this.baseClass,
          "Sorting"
        );

        sortableParameters[res.fullPath] = desc ? -1 : 1;
      });

    if (Object.keys(sortableParameters).length === 0) {
      sortableParameters[this.defaultSort] = -1;
    }

    return sortableParameters;
  }

  private get defaultSort(): string {
    const props = this.baseClass.prototype.__props;
    return (
      Object.keys(props).filter((key) => props[key].defaultSort)[0] ??
      (this.baseClass.prototype instanceof StampedCollectionProperties
        ? "createdAt"
        : "_id")
    );
  }
}
