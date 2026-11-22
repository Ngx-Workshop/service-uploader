import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { Types } from 'mongoose';

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`Invalid ID "${value}"`);
    }

    return value;
  }
}

@Injectable()
export class OptionalParseObjectIdPipe extends ParseObjectIdPipe {
  transform(value: string): string;
  transform(value: undefined): undefined;
  transform(value: string | undefined): string | undefined {
    return value === undefined ? undefined : super.transform(value);
  }
}
