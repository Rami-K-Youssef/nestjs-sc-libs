import { SearchDto } from "..";
import { ISearchableClass } from "../definitions";

export class ProjectionParser {
  constructor(private baseClass: ISearchableClass) {}

  parse(dto: SearchDto) {
    if (!dto.minified) {
      return {};
    } else {
      const props = Object.keys(this.baseClass.prototype.__props).filter(
        (prop) =>
          this.baseClass.prototype.__props[prop].includeInMinified == true
      );

      return {
        $ROOT$: props.reduce((acc, value) => {
          acc[value] = 1;
          return acc;
        }, {}),
      };
    }
  }
}
