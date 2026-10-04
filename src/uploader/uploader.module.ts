import { Module } from '@nestjs/common';
import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { NgxAuthClientModule, RemoteAuthGuard } from '@tmdjr/ngx-auth-client';
import { Asset, AssetSchema } from './schemas/asset.schema';
import { UploaderController } from './uploader.controller';
import { SpacesStorageService } from './spaces-storage.service';
import { UploaderService } from './uploader.service';
import { Folder, FolderSchema } from './schemas/folder.schema';
import { FoldersController } from './folders.controller';
import { FoldersService } from './folders.service';

const isGeneratingOpenApi = process.env.GENERATE_OPENAPI === 'true';

@Module({
  imports: [
    NgxAuthClientModule,
    ...(isGeneratingOpenApi
      ? []
      : [
          MongooseModule.forFeature([
            { name: Asset.name, schema: AssetSchema },
            { name: Folder.name, schema: FolderSchema },
          ]),
        ]),
  ],
  controllers: [FoldersController, UploaderController],
  providers: [
    UploaderService,
    FoldersService,
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
            provide: getModelToken(Folder.name),
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
