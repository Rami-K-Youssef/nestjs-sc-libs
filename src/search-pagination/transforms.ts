import {
  ClassTransformOptions,
  DiscriminatorDescriptor,
  Expose,
  plainToInstance,
  Transform,
  Type,
  TypeOptions,
} from "class-transformer";
import { Types } from "mongoose";

export const TransformIdOrDto = (
  myClass: () => new (...args: any[]) => unknown,
  options?: TypeOptions
): PropertyDecorator => {
  return (...args) => {
    Type(({ object, property }) => {
      const result =
        object[property] instanceof Types.ObjectId ? String : myClass();
      return result;
    }, options)(...args);
  };
};

export const TransformIdOrDtoSafe = (
  myClass: () => new (...args: any[]) => unknown,
  options?: TypeOptions
): PropertyDecorator => {
  return (target: Object, propertyKey: string | symbol) => {
    const idKey = (propertyKey as string) + "Id";
    Transform(({ obj, value, key }) => {
      if (obj[key] instanceof Types.ObjectId) {
        return;
      }
      return value;
    })(target, propertyKey);
    Transform(({ obj, value, key }) => {
      if (obj[propertyKey] instanceof Types.ObjectId) {
        return obj[propertyKey];
      }
    })(target, idKey);
    Expose()(target, idKey);
    Type(() => String)(target, idKey);
    Type(() => myClass(), options)(target, propertyKey);
  };
};

export const TransformIdOrDtoArray = (
  myClass: () => new (...args: any[]) => unknown,
  options?: TypeOptions
): PropertyDecorator => {
  return (...args) => {
    Type(({ object, property }) => {
      const result =
        (object[property] ?? [])[0] instanceof Types.ObjectId
          ? String
          : myClass();
      return result;
    }, options)(...args);
  };
};

export const TransformIdOrDtoArraySafe = (
  myClass: () => new (...args: any[]) => unknown,
  options?: TypeOptions
): PropertyDecorator => {
  return (target, propertyKey: symbol | string) => {
    const idKey = (propertyKey as string) + "Ids";
    Transform(({ obj, value, key }) => {
      if (obj[key]?.length == 0) return [];
      if (obj[key]?.at(0) instanceof Types.ObjectId) {
        return;
      }
      return value;
    })(target, propertyKey);
    Transform(({ obj, value, key }) => {
      if (obj[propertyKey]?.length == 0) return [];
      if (obj[propertyKey]?.at(0) instanceof Types.ObjectId) {
        return obj[propertyKey];
      }
    })(target, idKey);
    Expose()(target, idKey);
    Type(() => String)(target, idKey);
    Type(() => myClass(), options)(target, propertyKey);
  };
};

export const TransformIds = (): PropertyDecorator => {
  return (...args) => {
    Transform(
      ({ obj, key }) => {
        return obj[key]
          ? obj[key].map((item) =>
              item instanceof Types.ObjectId ? item.toHexString() : item
            )
          : [];
      },
      { toClassOnly: true }
    )(...args);
  };
};

export function plainToDiscriminator(
  discriminator: DiscriminatorDescriptor,
  plain: any,
  options?: ClassTransformOptions
) {
  const type = (plain as any)[discriminator.property];
  const subType = discriminator.subTypes.find(
    (subType) => subType.name === type
  );
  if (!subType)
    throw new Error(`Could not find class constructor for type '${type}'`);
  return plainToInstance(subType.value, plain, options);
}
