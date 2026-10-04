import { Module } from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { NgxAuthClientModule, RemoteAuthGuard } from '@tmdjr/ngx-auth-client';
import { Asset, AssetSchema } from './schemas/asset.schema';
import { UploaderController } from './uploader.controller';
import { SpacesStorageService } from './spaces-storage.service';
import { UploaderService } from './uploader.service';

const isGeneratingOpenApi = process.env.GENERATE_OPENAPI === 'true';

@Module({
  imports: [
    NgxAuthClientModule,
    ...(isGeneratingOpenApi
      ? []
      : [
          MongooseModule.forFeature([
            { name: Asset.name, schema: AssetSchema },
          ]),
        ]),
  ],
  controllers: [UploaderController],
  providers: [
    UploaderService,
    ...(isGeneratingOpenApi
      ? [
          {
            provide: SpacesStorageService,
            useValue: {},
          },
          {
            provide: getModelToken(Asset.name),
            useValue: {},
          },
          {
            provide: RemoteAuthGuard,
            useValue: { canActivate: () => true },
          },
        ]
      : [SpacesStorageService]),
  ],
})
export class UploaderModule {}
