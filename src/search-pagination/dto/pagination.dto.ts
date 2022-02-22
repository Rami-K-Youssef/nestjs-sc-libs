import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
export interface Pagination {
  total: number;
  page: number;
  limit: number;
  next?: number;
  prev?: number;
  after?: string;
}

export class SearchResult<T> {
  data: T[];

  pagination?: Pagination;

  constructor(data: SearchResult<T>) {
    this.data = data.data;
    this.pagination = data.pagination;
  }
}
