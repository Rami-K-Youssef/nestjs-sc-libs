import { Transform, TransformFnParams, Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, Min } from "class-validator";
import { BadRequestException } from "@nestjs/common";
import { ISearchableClass } from "../definitions";

export type SortableParameters = Record<string, -1 | 1>;
export type FilterableParameters = Record<string, unknown>;
export type ProjectionParameters = Record<string, 0 | 1>;

export class TransformedSearchDto {
  filter: FilterableParameters;
  postFilter?: FilterableParameters;
  sort: SortableParameters;
  pathProjection?: Record<string, ProjectionParameters>;

  page?: number;
  limit?: number;
  minified = false;
  isNext = false;

  baseClass: ISearchableClass;
}

export class SearchDto {
  @ApiPropertyOptional({
    type: String,
    description:
      "Filter query string, path filters apply at lookups, see documentation for its schema",
  })
  @Transform((v: TransformFnParams) => filterQueryToObject(v.value))
  @IsOptional()
  filter?: FilterableParameters;

  @ApiPropertyOptional({
    type: String,
    description:
      "After query string, path filters apply at lookups, see documentation for its schema",
  })
  @Transform((v: TransformFnParams) => filterQueryToObject(v.value))
  @IsOptional()
  after?: FilterableParameters;

  @ApiPropertyOptional({
    type: String,
    description:
      "Filter query string, to be applied post data fetching, see documentation for its schema",
  })
  @Transform((v: TransformFnParams) => filterQueryToObject(v.value))
  @IsOptional()
  postFilter?: FilterableParameters;

  @ApiPropertyOptional({
    example: "-createdAt",
    description:
      "Use only allowed properties separated by semicolon; default is ascending createdAt; prefix name with hyphen/minus sign to get descending order",
    type: String,
  })
  @IsOptional()
  sort?: string;

  @Type(() => Number)
  @Min(0)
  @IsInt()
  @ApiPropertyOptional({ example: "0", description: "" })
  @IsOptional()
  page?: number = 0;

  @Type(() => Number)
  @Min(0)
  @IsInt()
  @ApiPropertyOptional({ example: "10", description: "" })
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({ default: false })
  @Transform(({ value }) => (value == "true" ? true : false))
  @IsBoolean()
  minified = false;

  transformedResult: TransformedSearchDto;
}

function filterQueryToObject(v: string): Record<string, unknown> {
  try {
    const res = JSON.parse(v);
    if (Array.isArray(res)) throw new Error("Not an object");
    return res;
  } catch (err) {
    throw new BadRequestException("MALFORMED_JSON_FILTER");
  }
}
