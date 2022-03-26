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
  property: string;
  path: string;
  pathLength: number;
  value: any;
};

function handleFilter(filter: Record<string, any>) {
  let operatorKeys = [];
  const pathKeys = [] as ParsedKeyFilter[];

  function runSubfilter(subfilter, operatorKeys, pathKeys) {
    Object.keys(subfilter).forEach((key) => {
      if (key.startsWith("$")) {
        operatorKeys.push({ [key]: subfilter[key] });
      } else {
        const path = key.split(".");
        pathKeys.push({
          originalKey: key,
          property: path[path.length - 1],
          path: path.slice(0, path.length - 1).join("."),
          pathLength: path.length - 1,
          value: subfilter[key],
        });
      }
    });
  }

  runSubfilter(filter, operatorKeys, pathKeys);
  let itemIndex = null;
  while ((itemIndex = operatorKeys.findIndex((obj) => "$and" in obj)) > -1) {
    const $and = operatorKeys[itemIndex]["$and"];
    operatorKeys.splice(itemIndex, 1);
    $and.forEach((item) => runSubfilter(item, operatorKeys, pathKeys));
  }
  pathKeys.forEach((item) => {
    if (item.path == "") item.path = "$ROOT$";
  });
  const groupedPathKeys = lodash.groupBy(pathKeys, "path"); // pathKeys.sort((a, b) => a.pathLength - b.pathLength);

  operatorKeys = operatorKeys.filter((item) => "$or" in item);
  operatorKeys = operatorKeys.map((opKey) => {
    const $or = opKey["$or"];
    let operatorKeys = [];
    const pathKeys = [] as ParsedKeyFilter[];
    $or.forEach((item) => runSubfilter(item, operatorKeys, pathKeys));
    if (operatorKeys.length > 0)
      return {
        or: opKey,
        paths: ["$$$"],
      };
    else {
      return {
        or: opKey,
        paths: pathKeys
          .map((item) => item.path)
          .filter(
            (item, index, arr) => item != "" && arr.indexOf(item) == index
          ),
      };
    }
  });
  return {
    groupedPathKeys,
    postFilter: operatorKeys,
  };
}

export function resolvePathFilters(
  paths: PathOptions,
  filter: Record<string, any>
) {
  const { groupedPathKeys, postFilter } = handleFilter(filter);
  const sortedKeysDescending = Object.keys(paths).sort(
    (a, b) => b.length - a.length
  );
  let match: string;
  Object.entries<ParsedKeyFilter[]>(groupedPathKeys).forEach(
    ([filterPath, filterValues]) => {
      if (filterPath in paths) {
        paths[filterPath].accessibility ??= {};
        const $and = paths[filterPath].accessibility?.$and ?? [];
        $and.push(
          ...filterValues.map((item) => ({
            [item.property]: item.value,
          }))
        );
        paths[filterPath].accessibility.$and = $and;
      } else if (
        (match = sortedKeysDescending.find((key) => filterPath.startsWith(key)))
      ) {
        const newFilterPath = filterPath.substring(match.length + 1);
        paths[match].accessibility ??= {};
        const $and = paths[match].accessibility?.$and ?? [];
        $and.push(
          ...filterValues.map((item) => ({
            [newFilterPath == ""
              ? item.property
              : newFilterPath + "." + item.property]: item.value,
          }))
        );
        paths[match].accessibility.$and = $and;
      } else {
        paths["$ROOT$"].accessibility ??= {};
        const $and = paths["$ROOT$"].accessibility?.$and ?? [];
        $and.push(
          ...filterValues.map((item) => ({
            [item.originalKey]: item.value,
          }))
        );
        paths["$ROOT$"].accessibility.$and = $and;
      }
    }
  );

  postFilter.forEach((orFilter: { or: any; paths: string[] }) => {
    orFilter.paths = orFilter.paths.map((path) => {
      match = sortedKeysDescending.find((key) => path.startsWith(key));
      if (match) return path.substring(match.length + 1);
      return path;
    });
  });

  const filters = [...postFilter /*...otherFilters*/];
  return filters;
}
