import { Transform, Type } from "class-transformer";
import { Types } from "mongoose";

export const TransformIdOrDto = (
  myClass: () => new (...args: any[]) => unknown
): PropertyDecorator => {
  return (...args) => {
    Type(({ object, property }) => {
      const result =
        object[property] instanceof Types.ObjectId ? String : myClass();
      return result;
    })(...args);
  };
};

export const TransformIdOrDtoArray = (
  myClass: () => new (...args: any[]) => unknown
): PropertyDecorator => {
  return (...args) => {
    Type(({ object, property }) => {
      const result =
        object[property][0] instanceof Types.ObjectId ? String : myClass();
      return result;
    })(...args);
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
