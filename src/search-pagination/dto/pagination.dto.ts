import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";

export class PaginationDataDto {
  @ApiProperty({}) readonly total: number;
  @ApiProperty({}) readonly page: number;
  @ApiProperty({}) readonly limit: number;
  @ApiPropertyOptional({}) readonly next?: number;
  @ApiPropertyOptional({}) readonly prev?: number;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  next?: number;
  prev?: number;
}

export class SearchResult<T> {
  data: T[];

  pagination?: Pagination;
  paginate?: () => Promise<void>;

  constructor(data: SearchResult<T>) {
    this.data = data.data;
    this.pagination = data.pagination;
    this.paginate = data.paginate;
  }
}
