import {
  getModelToken,
  MongooseModule,
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { Connection, Model, SchemaTypes, Types } from "mongoose";
import { StampedCollectionProperties } from "../dto";
import { PlainDocAggregator } from "../executor";

const CAT_SCHEMA = "Cat";
const TOY_SCHEMA = "Toy";

@Schema()
class ToyModel extends StampedCollectionProperties {}

const toySchema = SchemaFactory.createForClass(ToyModel);
type ToyDocument = ToyModel & Document;

@Schema()
class CatModel {
  @Prop({
    ref: TOY_SCHEMA,
    type: SchemaTypes.ObjectId,
  })
  toy: Types.ObjectId | ToyDocument;
}

const catSchema = SchemaFactory.createForClass(CatModel);
type CatDocument = CatModel & Document;

describe("PlainDocAggregator", () => {
  describe("lookup", () => {
    let moduleRef: TestingModule;
    let toyModel: Model<ToyDocument>;
    let catModel: Model<CatDocument>;

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
              },
              {
                name: CAT_SCHEMA,
                schema: catSchema,
              },
            ],
            "default"
          ),
        ],
      }).compile();
      toyModel = await moduleRef.resolve(getModelToken(TOY_SCHEMA));
      catModel = await moduleRef.resolve(getModelToken(CAT_SCHEMA));
    });

    it("should lookup with default params", () => {
      // given
      // when
      new PlainDocAggregator();

      // then
    });
    it("should lookup with custom fields", () => {});
  });
});
