import { HttpStatus } from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { UploaderController } from './uploader.controller';

describe('UploaderController contract', () => {
  it('returns created after durable upload completion', () => {
    const status = Reflect.getMetadata(
      HTTP_CODE_METADATA,
      // Method decorators attach HTTP metadata directly to the handler.
      // eslint-disable-next-line @typescript-eslint/unbound-method
      UploaderController.prototype.upload
    ) as number;

    expect(status).toBe(HttpStatus.CREATED);
  });
});
