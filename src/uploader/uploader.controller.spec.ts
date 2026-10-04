import { HttpStatus } from '@nestjs/common';
import { GUARDS_METADATA, HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { RemoteAuthGuard } from '@tmdjr/ngx-auth-client';
import { UploaderController } from './uploader.controller';

describe('UploaderController contract', () => {
  it('protects every route with the remote authentication guard', () => {
    const guards = Reflect.getMetadata(
      GUARDS_METADATA,
      UploaderController
    ) as unknown[];

    expect(guards).toContain(RemoteAuthGuard);
  });

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
