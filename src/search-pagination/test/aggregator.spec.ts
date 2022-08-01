import {
  getModelToken,
  MongooseModule,
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { Connection, Document, Model, SchemaTypes, Types } from "mongoose";
import { LookupFlags } from "../definitions";
import { StampedCollectionProperties, TransformedSearchDto } from "../dto";
import { PlainDocAggregator } from "../executor";
import { SearchKey } from "../search-key";

const CAT_SCHEMA = "Cat";
const TOY_SCHEMA = "Toy";

@Schema({
  collection: "toys",
})
class ToyModel extends StampedCollectionProperties {}

const toySchema = SchemaFactory.createForClass(ToyModel);
type ToyDocument = ToyModel & Document;

@Schema({
  collection: "cats",
})
class CatModel extends StampedCollectionProperties {
  @Prop({
    type: SchemaTypes.ObjectId,
  })
  toyId: Types.ObjectId;

  @SearchKey({ pathClass: () => ToyModel, isId: true })
  toy?: ToyDocument;
}

const catSchema = SchemaFactory.createForClass(CatModel);
type CatDocument = CatModel & Document;

describe("PlainDocAggregator", () => {
  describe("lookup", () => {
    let moduleRef: TestingModule;
    let toyModel: Model<any>;
    let catModel: Model<any>;

    beforeAll(async () => {
      moduleRef = await Test.createTestingModule({
        imports: [
          MongooseModule.forRoot(globalThis.__MONGO_URI__, {
            connectionName: "default",
            dbName: globalThis.__MONGO_DB_NAME__,
            connectionFactory: async (connection: Connection) => {
              return connection;
            },
          }),
          MongooseModule.forFeature(
            [
              {
                name: TOY_SCHEMA,
                schema: toySchema,
                collection: "toys",
              },
              {
                name: CAT_SCHEMA,
                schema: catSchema,
                collection: "cats",
              },
            ],
            "default"
          ),
        ],
      }).compile();
      toyModel = await moduleRef.get(getModelToken(TOY_SCHEMA, "default"));
      catModel = await moduleRef.get(getModelToken(CAT_SCHEMA, "default"));
    });

    it("should lookup with default params", async () => {
      // given
      const dto: TransformedSearchDto = new TransformedSearchDto();
      dto.baseClass = CatModel;
      dto.filter = {};
      dto.isNext = false;
      dto.minified = false;
      dto.sort = {};
      dto.pathProjection = {};

      const toyId = new Types.ObjectId();

      await new toyModel({ _id: toyId }).save();
      await new catModel({ toyId }).save();

      // when
      const result = await new PlainDocAggregator(catModel).aggregateAndCount(
        dto,
        {
          $ROOT$: {},
          toy: {
            lookup: {
              as: "toy",
              localField: "toyId",
              foreignField: "_id",
            },
            flags:
              LookupFlags.REQUIRED |
              LookupFlags.NONSOFTDELETE |
              LookupFlags.SINGLE,
          },
        }
      );

      // then
      console.log(result.data[0]);
      expect(result.data[0].toy).toBeTruthy();
      expect(result.data[0].toy._id.toHexString()).toEqual(toyId.toHexString());
    });
    it("should lookup with custom fields", () => {});
  });
});
