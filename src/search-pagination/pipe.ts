import { Injectable, PipeTransform } from "@nestjs/common";
//import { FilterSortDto, FilterableParameters } from '../DTOs';
import { FilterParser, SorterParser, ProjectionParser } from "./parsers";
import { ISearchableClass } from "./definitions";
import { SearchDto, TransformedSearchDto } from "./dto/search.dto";
import { Types } from "mongoose";
export type CollectionPropertyPaths = Record<string, ISearchableClass>;

@Injectable()
export class SearchPipe implements PipeTransform {
  constructor(private searchClass: ISearchableClass) {}

  transform(value: SearchDto): SearchDto {
    const transformedResult = {} as TransformedSearchDto;
    const filterParser = new FilterParser(this.searchClass);
    if (value.filter) {
      transformedResult.filter = filterParser.parse(value.filter);
    } else {
      transformedResult.filter = {};
    }
    if (value.postFilter)
      transformedResult.postFilter = filterParser.parse(value.postFilter);
    else transformedResult.postFilter = {};
    if (value.after) {
      transformedResult.isNext = true;
      transformedResult.afterId = new Types.ObjectId(value.after);
    }

    transformedResult.sort = new SorterParser(this.searchClass).parse(
      value.sort
    );

    transformedResult.pathProjection = new ProjectionParser(
      this.searchClass
    ).parse(value);

    transformedResult.minified = value.minified;
    transformedResult.page = value.page;
    transformedResult.limit = value.limit;

    transformedResult.baseClass = this.searchClass;

    value.transformedResult = transformedResult;
    return value;
  }
}
