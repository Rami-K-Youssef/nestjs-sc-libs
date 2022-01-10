import { TransformedSearchDto } from "./../dto";
import { PathOptions } from "./../definitions";
import * as lodash from "lodash";

const operators = [
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

type ParsedKeyFilter = {
  originalKey: string;
  isOperator: boolean;
  property: string;
  path: string;
  pathLength: number;
  value: any;
};

function handleFilter(filter: Record<string, any>) {
  const operatorKeys = [];
  const pathKeys = [] as ParsedKeyFilter[];

  function runSubfilter(subfilter) {
    Object.keys(subfilter).forEach((key) => {
      if (key.startsWith("$")) {
        operatorKeys.push({ [key]: subfilter[key] });
      } else {
        const path = key.split(".");
        pathKeys.push({
          originalKey: key,
          isOperator: false,
          property: path[path.length - 1],
          path: path.slice(0, path.length - 1).join("."),
          pathLength: path.length - 1,
          value: subfilter[key],
        });
      }
    });
  }

  runSubfilter(filter);
  let itemIndex = null;
  while ((itemIndex = operatorKeys.findIndex((obj) => "$and" in obj)) > -1) {
    const $and = operatorKeys[itemIndex]["$and"];
    operatorKeys.splice(itemIndex, 1);
    $and.forEach((item) => runSubfilter(item));
  }
  pathKeys.forEach((item) => {
    if (item.path == "") item.path = "$ROOT$";
  });
  const groupedPathKeys = lodash.groupBy(pathKeys, "path"); // pathKeys.sort((a, b) => a.pathLength - b.pathLength);
  return { groupedPathKeys, postFilter: operatorKeys };
}

export function resolvePathFilters(
  paths: PathOptions,
  filter: Record<string, any>
) {
  const { groupedPathKeys, postFilter } = handleFilter(filter);
  Object.entries<ParsedKeyFilter[]>(groupedPathKeys).forEach(
    ([filterPath, filterValues]) => {
      if (filterPath in paths) {
        delete groupedPathKeys[filterPath];
        paths[filterPath].accessibility = paths[filterPath].accessibility ?? {};
        const $and = paths[filterPath].accessibility?.$and ?? [];
        $and.push(
          ...filterValues.map((item) => ({
            [item.property]: item.value,
          }))
        );
        paths[filterPath].accessibility.$and = $and;
      }
    }
  );
  // fix postfilter to include all paths
  const otherFilters = Object.values(groupedPathKeys)
    .flatMap((item) => item)
    .reduce<any[]>((acc, value: any) => {
      acc.push({ [value.originalKey]: value.value });
      return acc;
    }, []) as [];
  const filters = [...postFilter, ...otherFilters];
  if (filters.length == 0) return null;
  else return { $and: filters };
}
