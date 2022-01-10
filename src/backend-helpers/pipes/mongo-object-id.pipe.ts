import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<any, Types.ObjectId> {
  transform(value: any): Types.ObjectId {
    const validObjectId = Types.ObjectId.isValid(value);

    if (!validObjectId) {
      throw new BadRequestException('Invalid ObjectId');
    }

    return new Types.ObjectId(value);
  }
}

@Injectable()
export class ParseObjectIdArrayPipe implements PipeTransform<any, Types.ObjectId[]> {
  transform(value: any): Types.ObjectId[] {
    if (!Array.isArray(value)) throw new BadRequestException('Not an array');

    return value.map((val, index) => {
      if (!Types.ObjectId.isValid(val))
        throw new BadRequestException('Invalid ObjectId at index ' + index);
      else return new Types.ObjectId(val);
    });
  }
}
