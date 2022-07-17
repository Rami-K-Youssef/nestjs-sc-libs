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

function isObjectEmpty(value) {
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      return false;
    }
  }
  return true;
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
    total: number;
    after?: string;
  }> {
    const sortObj = { ...dto.sort, _id: 1 } || { _id: 1 };
    if (dto.afterId) {
      let after = {};
      const lastItem = await this.model.findById(dto.afterId);
      if (lastItem) {
        await Promise.all(
          Object.keys(pathOptions)
            .filter((key) => key != "$ROOT$")
            .map(async (key) => {
              await lastItem.populate({
                path: key,
                justOne: true,
              });
            })
        );
        after = {
          $or: Object.entries(sortObj).map(([key, value], index, entries) => {
            const res = {};
            for (let i = 0; i < index; i++) {
              const key = entries[i][0];
              let val = lastItem[key];
              res[entries[i][0]] = val ?? null;
            }
            let val = lastItem[key];
            if (val != null) res[key] = { [value == 1 ? "$gt" : "$lt"]: val };
            return res;
          }),
        };
      }
      dto.filter = {
        ...(dto.filter ?? {}),
        ...after,
      };
    }

    const pipeline = [];
    const lookedUpPaths = [] as string[];
    let postPathsFilter = resolvePathFilters(pathOptions, dto.filter ?? {});

    function getAndRemoveReadyOrFilters(): { or: any; paths: string[] }[] {
      const res = [] as any[];
      postPathsFilter = postPathsFilter.filter((item) => {
        if (item.paths.every((path) => lookedUpPaths.includes(path))) {
          res.push(item.or);
          return false;
        }
        return true;
      });
      return res;
    }

    if (dto.filter || pathOptions.$ROOT$?.accessibility) {
      const res = getAndRemoveReadyOrFilters();
      const filter = pathOptions.$ROOT$?.accessibility ?? {};
      if (res.length > 0) {
        const $and = filter.$and ?? [];
        $and.push(...res);
        filter.$and = $and;
      }

      if (!isObjectEmpty(filter))
        pipeline.push({
          $match: filter,
        });
    }

    if (pathOptions.$ROOT$.projection) {
      pipeline.push({
        $project: pathOptions.$ROOT$.projection,
      });
    } else if (dto?.pathProjection?.$ROOT$) {
      pipeline.push({
        $project: dto.pathProjection.$ROOT$,
      });
    }

    Object.entries(pathOptions)
      .filter(([key]) => key != "$ROOT$")
      .forEach(([path, value]) => {
        const { propertyClass, propertyDescriptor } =
          checkPathAndReturnDescriptor(path, dto.baseClass, "None");
        if (
          propertyDescriptor.pathClass &&
          (!dto.minified || propertyDescriptor.includeInMinified)
        ) {
          const pathClass = propertyDescriptor.pathClass();
          const schemaDetails = global.MongoTypeMetadataStorage.schemas.find(
            ({ target }) => target == pathClass
          );
          if (!schemaDetails)
            throw new Error(`${pathClass} is not registered as a schema`);
          const collectionName =
            value.collection ?? schemaDetails.options?.collection;
          if (!collectionName)
            throw new Error(`${pathClass} is not assigned a collection name`);

          const subPipeline = [] as any[];
          if (!isObjectEmpty(value.accessibility ?? {}))
            subPipeline.push({ $match: value.accessibility ?? {} });

          if (dto.pathProjection[path]) {
            subPipeline.push({ $project: dto.pathProjection[path] });
          } else if (value.projection) {
            subPipeline.push({
              $project: value.projection,
            });
          } else if (dto.minified) {
            const props = Object.keys(propertyClass.prototype.__props).filter(
              (prop) =>
                propertyClass.prototype.__props[prop].includeInMinified == true
            );
            const projection = props.reduce((acc, value) => {
              acc[value] = 1;
              return acc;
            }, {});
            subPipeline.push({ $project: projection });
          }

          const flags = value.flags ?? 0;
          if (!(flags & LookupFlags.NONSOFTDELETE)) {
            subPipeline.push({
              $match: { isDeleted: value.deleted ?? false },
            });
          }

          if (flags & LookupFlags.SINGLE) subPipeline.push({ $limit: 1 });
          pipeline.push({
            $lookup: {
              from: collectionName,
              localField: path,
              foreignField: value.joinField ?? "_id",
              as: path,
              pipeline: subPipeline,
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
          } else if (flags & LookupFlags.UNWIND) {
            pipeline.push({
              $unwind: {
                path: `$${path}`,
                preserveNullAndEmptyArrays: !!!(flags & LookupFlags.REQUIRED),
              },
            });
          } else if (flags & LookupFlags.REQUIRED) {
            pipeline.push({
              $match: {
                [path]: { $not: { $size: 0 } },
              },
            });
          }

          const res = getAndRemoveReadyOrFilters();
          if (res.length > 0) {
            pipeline.push({ $match: { $and: res } });
          }
        }
      });

    if (postPathsFilter.length) {
      pipeline.push({
        $match: { $and: postPathsFilter.map((item) => item.or) },
      });
    }

    if (!isObjectEmpty(dto.postFilter ?? {}))
      pipeline.push({
        $match: dto.postFilter,
      });

    pipeline.push({
      $facet: {
        data: [
          { $sort: sortObj },
          ...(() => {
            const res = [];
            if (dto.limit) {
              if (!dto.isNext) res.push({ $skip: dto.page * dto.limit });
              res.push({ $limit: dto.limit });
            }
            return res;
          })(),
        ],
        total: [{ $count: "total" }],
      },
    });

    const [{ data, total }] = await this.model.aggregate(pipeline);

    return {
      data,
      total:
        ((dto.isNext ? dto.limit * dto.page : 0) ?? 0) + (total[0]?.total ?? 0),
      after: data[0]?._id?.toHexString?.(),
    };
  }

  protected paginate(
    query: TransformedSearchDto,
    count: number,
    after: string | null
  ): Pagination {
    return {
      total: count,
      page: query.page,
      limit: query.limit,
      next:
        (query.page + 1) * query.limit >= count ? undefined : query.page + 1,
      prev: query.page == 0 ? undefined : query.page - 1,
      after,
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
      pagination: this.paginate(dto, res.total, res.after),
      data: res.data,
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
      pagination: this.paginate(dto, res.total, res.after),
      data: this.transformData(res.data),
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
