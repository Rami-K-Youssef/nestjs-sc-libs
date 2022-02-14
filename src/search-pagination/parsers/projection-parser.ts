import { SearchDto } from "..";
import { ISearchableClass } from "../definitions";

export class ProjectionParser {
  constructor(private baseClass: ISearchableClass) {}

  parse(dto: SearchDto) {
    if (!dto.minified) {
      return null;
    } else {
      const props = Object.keys(this.baseClass.prototype.__props).filter(
        (prop) =>
          this.baseClass.prototype.__props[prop].includeInMinifed == true
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
