import { MODULE_METADATA } from '@nestjs/common/constants';
import { APP_GUARD } from '@nestjs/core';
import {
  AuthenticationGuard,
  NgxAuthClientModule,
  RolesGuard,
} from '@tmdjr/ngx-auth-client';
import { UploaderModule } from './uploader.module';

describe('UploaderModule authentication', () => {
  it('registers the auth client and its global authentication and role guards', () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      UploaderModule
    ) as unknown[];
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      UploaderModule
    ) as { provide: unknown; useClass: unknown }[];

    expect(imports).toContain(NgxAuthClientModule);
    expect(providers).toEqual(
      expect.arrayContaining([
        { provide: APP_GUARD, useClass: AuthenticationGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ])
    );
  });
});
