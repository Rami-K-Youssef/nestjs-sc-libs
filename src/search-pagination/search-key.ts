import "reflect-metadata";
import { ISearchable, CollectionPropertyOptions } from "./definitions";
import * as lodash from "lodash";

export const SearchKey = (options?: CollectionPropertyOptions) => {
  return (target: ISearchable, propertyName: string) => {
    target.__props = target.__props ? lodash.cloneDeep(target.__props) : {};
    const propName = options?.name ?? propertyName;
    const sortable = options?.sortable ?? false;
    const filterable = options?.filterable ?? false;
    const def = options?.defaultSort ?? false;
    const isId = options?.isId ?? false;
    const isDate = options?.isDate ?? false;
    const includeInMinifed = options?.includeInMinifed ?? false;
    const isArray = options?.isArray ?? false;
    target.__props[propName] = {
      name: propertyName,
      sortable,
      filterable,
      defaultSort: def,
      isId,
      isDate,
      includeInMinifed,
      pathClass: options?.pathClass,
      isArray,
    };
  };
};
