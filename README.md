# nestjs-sc-libs

## What does this package do?

This package is a collection of many utilities that help building REST applications rapidly.

## What does this package contain?

- MongoDb
  - Transaction Helper
  - Exception Filter
  - Search Extension
  - Softdelete Plugin
- JWT Exception Filter
- Coded Exception
- CASL Foribdden Exception Filter
- MongoId Parse Pipes
- File Uploader

## **_Transaction Helper_**

This plugin helper in managing transactions using **cls-hooked** and using decorators for transactional methods.

For usage, first intialize before anything else in your main.ts file:

```ts
import { initi alizeTransactionalContext } from "@scandinavia/nestjs-libs";
initializeTransactionalContext();
```

Then when intializing MongooseModule, remember to use attach these plugins as global plugins, and to set a connectionName

```ts
MongooseModule.forRootAsync({
    inject: [ConfigService],
    connectionName: 'default',
    useFactory: async (
        configService: ConfigService,
    ): Promise<MongooseModuleOptions> => ({
        uri: configService.get('MONGO_URI'),
        replicaSet: configService.get('REPLICA_SET'),
        connectionFactory: (connection: Connection) => {
          connection.plugin(mongooseTrxPlugin);
          connection.plugin(accessibleRecordsPlugin);
          return connection;
        },
    }),
}),
```

Remember then to setup the connection hooks for that TransactionHelper, the quickest way is to do it in the module constructor:

```ts
import { TransactionConnectionManager } from "@scandinavia/nestjs-libs";

export class AppModule {
  constructor(@InjectConnection("default") private appConnection: Connection) {
    appConnection.name = "default";
    TransactionConnectionManager.setConnection(
      this.appConnection,
      this.appConnection.name
    );
  }
}
```

In order to use transactions, do the following in a service method:

```ts
import { Transactional, Propagation } from "@scandinavia/nestjs-libs";

export class Service {
  @Transactional({ propagation: Propagation.Mandatory })
  save() {
    // code that uses any mongoose model
  }
}
```

There are many Propagation types for configuring transactions, these are:

MANDATORY: Support a current transaction, throw an exception if none exists.

NEVER: Execute non-transactionally, throw an exception if a transaction exists.

NOT_SUPPORTED: Execute non-transactionally, suspend the current transaction if one exists.

REQUIRED: Support a current transaction, create a new one if none exists.

SUPPORTS: Support a current transaction, execute non-transactionally if none exists.

## **_Coded Exceptions_**

Provide functions to quickly generate Exception classes for usage within the app.

```ts
export class AccountDisabledException extends GenCodedException(
  HttpStatus.BAD_REQUEST,
  "ACCOUNT_DISABLED"
) {}

export class AdminNotFoundException extends ResourceNotFoundException(
  "ADMIN"
) {}
```

## **_Exception Filters_**

Use all filters as global filters.

The **CaslForbiddenExceptionFilter** catches any forbidden error from CASL and sends an 403 response.

The **CodedExceptionFilter** catches **CodedException**s and formats the response accordingly.

The **MongoExceptionFilter** catches **MongoError**s thrown from the MongoDb driver and formats the response accordingly.

## **_Validation and Serialization_**

First things first, initialize the app to use the validation pipeline, and the serialization interceptor:

```ts
app.useGlobalPipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
  })
);
app.useGlobalInterceptors(
  new CustomClassSerializerInterceptor(app.get(Reflector))
);
```

ValidationPipe is used to validate any DTO classes annotated with class-validator.

CustomClassSerializerInterceptor is used to serialize any response DTOs returned from a controller method using class-transformer to convert results correctly.

Validation Example:

```ts
export class CreateCompanyDto {
  @IsString()
  name: string;

  @ValidateNested()
  @Type(() => CreateUserDtoWithoutCompany)
  mainUser: CreateUserDtoWithoutCompany;
}
```

Response DTO example:

```ts
import { BaseResponseDto } from "@scandinavia/nestjs-libs";
import { Exclude, Expose, Type } from "class-transformer";

@Exclude()
export class UserDto extends BaseResponseDto {
  @Expose()
  firstName: string;
  @Expose()
  lastName: string;
  @Expose()
  email: string;
  @Expose()
  phone: string;
  @Expose()
  activatedAt: Date;
  @Expose()
  type: UserType;
  @Expose()
  @Type(() => CompanyDto)
  company: CompanyDto;
}
```

Don't forget to decorate the class with **@Exclude** and decorate all properties with **@Expose**, also response DTOs should extend **BaseResponseDto** class.

Remember to transform a plain object to the appropriate DTO before returning it in a controller.

```ts
@Get()
async getItem() {
    const item = await this.service.getItem();
    return plainToInstance(ItemResponseDto, item.toObject());
    // always use toObject() on mongoose documents
}
```

If you want a controller to return a plain object (non DTO), annotate the controller method like so:

```ts
@CustomInterceptorIgnore()
returnPlainObj() {
    return {x: 4};
}
```

## **_Search Plugin_**

This plugin has many utilties that help make its magic work, it works with casl, class-transformer, class-validator, and mongoose.

First things first, initialize the app to use the validation pipeline, and the serialization interceptor just like in the above section.

### **Model Definition**

Starting with model definition, make your class model either extend **StampedCollectionProperties** or **BaseCollectionProperties**, Stamped one includes createdAt and updatedAt fields.

Then decorate properties with SearchKey decorator:

```ts
export class Device extends StampedCollectionProperties {
  @SearchKey({ sortable: true, filterable: true, includeInMinifed: true })
  @Prop({ required: true })
  name: string;

  @SearchKey({ sortable: true, filterable: true })
  @Prop({ required: true })
  imei: string;

  @Prop({
    ref: SchemaNames.COMPANY,
    type: SchemaTypes.ObjectId,
    required: true,
  })
  @SearchKey({
    sortable: true,
    filterable: true,
    isId: true,
    pathClass: () => Company,
  })
  company: Types.ObjectId | CompanyDocument;
}
```

filterable: allows filtering on that field.

sortable: allows filtering on that field.

isId: set it to true when dealing with fields that store ObjectId

pathClass: a function that returns the class of that object once it is populated

includeInMinified: return this proprty when requesting a minified query, more on that later.

### Controller

Use the **SearchDto** and the **SearchPipe** within controllers:

```ts
@Get()
async getByCriteria(@Query(new SearchPipe(Device)) searchdto: SearchDto) {
    let abilities;
    // code to assign abilities a value, these are an array of casl rules.
    return this.deviceService.getByCriteria(searchDto.transformedResult, abilities);
}
```

Use the **DocAggregator** class to execute the query within the service:

```ts
async getByCriteria(searchDto: TransformedSearchDto, abilities) {
    // Pass path description to DocAggregator
    // $ROOT$ is a special path which here points to the Device base document
    // LookupFlags are used when accessing refs, when SINGLE is used, the value of company is a single document, else it's an array.
    // When REQUIRED is used, it works just like an inner-join, else the query works just like a left-join.
    return new DocAggregator(this.deviceModel, DeviceDto).aggregateAndCount(searchDto, {
        $ROOT$: {
            accessibility: this.deviceModel.accessibleBy(abilities).getQuery()
        },
        company: {
            flags: LookupFlags.SINGLE | LookupFlags.REQUIRED
        }
    });
}
```

The query pipeline is then composed automatically and executed with Count query to fill up pagination info.

### Filtering and Sorting

filter within the SearchDto should be passed as a json string which works as a mongo filter and supports some operators.

example: {"id":"618cca7a88d510dc802d3a27"}

sort should be multiple fields seperated with **;** use hyphens before a property for descending sorting.

example: company;-createdAt

the above example sorts by company ascending, then by createdAt descending.

passing minfied=true within the query parameters returns only fields annotated with includeInMinfied. This is useful to populate Dropdown Menus with basic information only (id,name) without creating a seperate endpoint to execute such logic.

## **_Uploader_**

This module uses @nestjs/serve-static, multer, and sharp.

It is used to upload files to be stored either locally on the server, or on AWS S3 cloud storage.

It also provided many validation tools and ways to define transformations on uploaded files like generating thumbnails for uploaded images.

First, initialize in the AppModule within imports:

```ts
UploadModule.forRoot({
  storageType: UploadModuleStorageType.LOCAL,
  localStorageOptions: {
    storageDir: "files",
    publicServePath: "assets",
  },
});
```

According to the above code snippet, any uploaded files will be stored under ./files/public or ./files/private directories.
Public files are statically served, while private files are not.
Public files will be accessible directly using /assets

As for controller code, where is an example:

```ts
@Post()
@UseInterceptors(
    UploadInterceptor({
        logo: {
          destination: 'logos',
          maxNumFiles: 1,
          minNumFiles: 1,
          isPrivate: false,
          pipeline: new ImagePipeline()
            .persist()
            .validate({
              aspectRatio: {
                min: 1,
                max: 1,
              },
            })
            .thumb('small', { width: 100, height: 100 }),
        },
      },
      {
        allowedMimeTypes: [MimeTypes.image],
      },
    ),
)
async upload(@UploadedSingleFileByField('logo') logo: UploadedFile) {
    const smallThumbnail: UploadedFile = logo.processFiles['small'];
    return logo;
}
```
