import { plainToInstance } from "class-transformer";
import { Document, LeanDocument, Model } from "mongoose";
import { resolvePathFilters } from "./path-resolver";
import { Pagination, TransformedSearchDto } from "..";
import {
  BaseResponseDto,
  DiscriminatorDescDto,
  LookupFlags,
  PathOptions,
} from "../definitions";

import * as lodash from "lodash";

import { checkPathAndReturnDescriptor } from "./../parsers/path-checker";

export class DocAggregator<
  TDocument extends Document,
  TResponseDto = LeanDocument<TDocument>
> {
  private responseDto: typeof BaseResponseDto;
  private responseDescriminator: DiscriminatorDescDto;

  constructor(
    private model: Model<any>,
    baseDto: typeof BaseResponseDto,
    descriminator?: DiscriminatorDescDto
  ) {
    this.responseDto = baseDto;
    this.responseDescriminator = descriminator;
  }

  private async _aggregate(
    dto: TransformedSearchDto,
    pathOptions: PathOptions = {}
  ): Promise<{
    data: TResponseDto[];
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

    //console.log(JSON.stringify(pipeline, null, 4));
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

    if (this.responseDto) {
      finalData = finalData.map((item) =>
        plainToInstance(this.responseDto, item)
      );
    } else if (this.responseDescriminator) {
      finalData = finalData.map((item) => {
        const type = item[this.responseDescriminator.discriminator.property];
        const subType = this.responseDescriminator.discriminator.subTypes.find(
          (subType) => subType.name === type
        );
        if (!subType)
          throw new Error(
            `Could not find class constructor for type '${type}'`
          );
        return plainToInstance(subType.value, item);
      });
    }
    return {
      data: finalData,
      countQuery: countPipeline,
    };
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
  ) {
    const res = await this._aggregate(dto, pathOptions);
    const totalCount =
      (await this.model.aggregate(res.countQuery))[0]?.total || 0;
    return {
      pagination: this.paginate(dto, totalCount),
      data: res.data,
    };
  }

  private paginate(query: TransformedSearchDto, count: number): Pagination {
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
