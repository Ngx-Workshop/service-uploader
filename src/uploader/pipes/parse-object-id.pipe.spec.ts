import { BadRequestException } from '@nestjs/common';
import { ParseObjectIdPipe } from './parse-object-id.pipe';

describe('ParseObjectIdPipe', () => {
  const pipe = new ParseObjectIdPipe();

  it('returns a valid MongoDB ObjectId', () => {
    const id = '507f1f77bcf86cd799439011';

    expect(pipe.transform(id)).toBe(id);
  });

  it('rejects a malformed ID', () => {
    expect(() => pipe.transform('not-an-id')).toThrow(BadRequestException);
  });
});
