import { ClassTransformOptions, plainToInstance } from "class-transformer";
import { Document, LeanDocument, Model } from "mongoose";
import { resolvePathFilters } from "./path-resolver";
import { Pagination, SearchResult, TransformedSearchDto } from "..";
import { DiscriminatorDescDto, LookupFlags, PathOptions } from "../definitions";

import { checkPathAndReturnDescriptor } from "./../parsers/path-checker";

interface BaseDocAggregatorOptions {
  ctx?: { user?: any };
}

interface PlainDocAggregatorOptions extends BaseDocAggregatorOptions {}

interface DocAggregatorOptions extends PlainDocAggregatorOptions {
  discriminator?: DiscriminatorDescDto;
  transformOptions?: ClassTransformOptions;
  transformFn?: (item: any, user?: any) => string[];
}

class BaseDocAggregator<T extends Document> {
  protected ctx: { user?: any };
  constructor(protected model: Model<T>, options?: PlainDocAggregatorOptions) {
    this.ctx = options?.ctx;
  }

  protected async _aggregate(
    dto: TransformedSearchDto,
    pathOptions: PathOptions = {}
  ): Promise<{
    data: any[];
    countQuery: any;
  }> {
    const pipeline = [];
    const postPathsFilter = resolvePathFilters(pathOptions, dto.filter ?? {});

    if (dto.filter || pathOptions.$ROOT$?.accessibility) {
      pipeline.push({
        $match: pathOptions.$ROOT$?.accessibility ?? {},
      });
    }

    if (dto.pathProjection) {
      pipeline.push({
        $project: dto.pathProjection.$ROOT$,
      });
    }

    if (!dto.minified) {
      Object.entries(pathOptions)
        .filter(([key]) => key != "$ROOT$")
        .forEach(([path, value]) => {
          const { propertyClass, propertyDescriptor } =
            checkPathAndReturnDescriptor(path, dto.baseClass, "None");
          if (propertyDescriptor.pathClass) {
            const pathClass = propertyDescriptor.pathClass();
            const schemaDetails = global.MongoTypeMetadataStorage.schemas.find(
              ({ target }) => target == pathClass
            );
            if (!schemaDetails)
              throw new Error(`${pathClass} is not registered as a schema`);
            const collectionName = schemaDetails.options?.collection;
            if (!collectionName)
              throw new Error(`${pathClass} is not assigned a collection name`);
            const subpipeline = [
              { $match: value.accessibility ?? {} },
            ] as any[];
            const flags = value.flags ?? 0;
            if (!(flags & LookupFlags.NONSOFTDELETE)) {
              subpipeline.push({
                $match: { isDeleted: value.deleted ?? false },
              });
            }

            if (flags & LookupFlags.SINGLE) subpipeline.push({ $limit: 1 });
            pipeline.push({
              $lookup: {
                from: collectionName,
                localField: path,
                foreignField: value.joinField ?? "_id",
                as: path,
                pipeline: subpipeline,
              },
            });
            if (flags & LookupFlags.SINGLE) {
              pipeline.push({
                $unwind: {
                  path: `$${path}`,
                  preserveNullAndEmptyArrays: !!!(flags & LookupFlags.REQUIRED),
                },
              });
              pipeline.push({
                $addFields: {
                  [path]: {
                    $ifNull: [`$${path}`, null],
                  },
                },
              });
            } else if (flags && LookupFlags.UNWIND) {
              pipeline.push({
                $unwind: {
                  path: `$${path}`,
                  preserveNullAndEmptyArrays: !!!(flags & LookupFlags.REQUIRED),
                },
              });
            } else if (flags && LookupFlags.REQUIRED) {
              pipeline.push({
                $match: {
                  [path]: { $not: { $size: 0 } },
                },
              });
            }
          }
        });

      if (postPathsFilter) {
        pipeline.push({ $match: postPathsFilter });
      }
    }

    if (dto.postFilter)
      pipeline.push({
        $match: dto.postFilter,
      });

    const rawData = await this.model.aggregate([
      ...pipeline,
      { $sort: dto.sort || { _id: 1 } },
      ...(() => {
        const res = [];
        if (dto.limit) {
          res.push({ $skip: dto.page * dto.limit });
          res.push({ $limit: dto.limit });
        }
        return res;
      })(),
    ]);
    const countPipeline = [...pipeline, { $count: "total" }];

    let finalData = rawData;
    return {
      data: finalData,
      countQuery: countPipeline,
    };
  }

  protected paginate(query: TransformedSearchDto, count: number): Pagination {
    return {
      total: count,
      page: query.page,
      limit: query.limit,
      next:
        (query.page + 1) * query.limit >= count ? undefined : query.page + 1,
      prev: query.page == 0 ? undefined : query.page - 1,
    };
  }
}

export class PlainDocAggregator<
  T extends Document,
  TLean = LeanDocument<T>
> extends BaseDocAggregator<T> {
  constructor(protected model: Model<T>, options?: PlainDocAggregatorOptions) {
    super(model, options);
  }

  public async aggregate(
    dto: TransformedSearchDto,
    pathOptions: PathOptions = {}
  ) {
    const res = await this._aggregate(dto, pathOptions);
    return res.data;
  }

  public async aggregateAndCount(
    dto: TransformedSearchDto,
    pathOptions: PathOptions = {}
  ): Promise<SearchResult<TLean>> {
    const res = await this._aggregate(dto, pathOptions);
    const that = this;
    const result = {
      pagination: null,
      data: res.data,
      paginate: async function () {
        this.pagination = that.paginate(
          dto,
          (await that.model.aggregate(res.countQuery))[0]?.total || 0
        );
        delete this.paginate;
      },
    };
    return new SearchResult(result);
  }
}

export class DocAggregator<
  T extends Document,
  TResponseDtoClass extends new () => TResponseDto,
  TResponseDto = InstanceType<TResponseDtoClass>
> extends BaseDocAggregator<T> {
  private responseDto: TResponseDtoClass;
  protected responseDiscriminator: DiscriminatorDescDto;
  protected transformOptions: ClassTransformOptions;
  protected transformFn: (item: any, user?: any) => string[];
  constructor(
    protected model: Model<any>,
    baseDto: TResponseDtoClass,
    options?: DocAggregatorOptions
  ) {
    super(model, options);
    this.responseDto = baseDto;
    if (options?.discriminator)
      this.responseDiscriminator = options.discriminator;
    if (options?.transformFn) this.transformFn = options.transformFn;
    if (options?.transformOptions)
      this.transformOptions = options.transformOptions;
  }

  public async aggregate(
    dto: TransformedSearchDto,
    pathOptions: PathOptions = {}
  ): Promise<TResponseDto[]> {
    const res = await super._aggregate(dto, pathOptions);
    return this.transformData(res.data);
  }

  public async aggregateAndCount(
    dto: TransformedSearchDto,
    pathOptions: PathOptions = {}
  ): Promise<SearchResult<TResponseDto>> {
    const res = await this._aggregate(dto, pathOptions);
    const that = this;
    const result = {
      pagination: null,
      data: this.transformData(res.data),
      paginate: async function () {
        this.pagination = that.paginate(
          dto,
          (await that.model.aggregate(res.countQuery))[0]?.total || 0
        );
      },
    };
    return result;
  }

  private transformData(data: any[]): TResponseDto[] {
    let transformationOptions = this.transformOptions ?? {};

    if (this.responseDiscriminator) {
      return data.map((item) => {
        const type = item[this.responseDiscriminator.discriminator.property];
        const subType = this.responseDiscriminator.discriminator.subTypes.find(
          (subType) => subType.name === type
        );
        if (!subType)
          throw new Error(
            `Could not find class constructor for type '${type}'`
          );
        const options = {
          ...transformationOptions,
        };
        if (this.transformFn)
          options.groups = this.transformFn(item, this.ctx.user);
        return plainToInstance(subType.value, item, options) as TResponseDto;
      });
    } else {
      return data.map((item) => {
        const options = {
          ...transformationOptions,
        };
        if (this.transformFn)
          options.groups = this.transformFn(item, this.ctx.user);
        return plainToInstance(this.responseDto, item, options);
      });
    }
  }
}
