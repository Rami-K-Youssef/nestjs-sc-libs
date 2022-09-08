import { Exclude, Expose } from "class-transformer";

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  next?: number;
  prev?: number;
  after?: string;
}

@Exclude()
export class SearchResult<T> {
  @Expose()
  data: T[];

  @Expose()
  pagination?: Pagination;

  constructor(data: SearchResult<T>) {
    this.data = data?.data;
    this.pagination = data?.pagination;
  }
}
