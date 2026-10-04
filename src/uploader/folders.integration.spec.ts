import { ConflictException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Connection, createConnection, Model } from 'mongoose';
import { FoldersService } from './folders.service';
import { Asset, AssetSchema, AssetStorageStatus } from './schemas/asset.schema';
import { Folder, FolderSchema } from './schemas/folder.schema';
import { SpacesStorageService } from './spaces-storage.service';
import { UploaderService } from './uploader.service';

const uri = process.env.MONGODB_FOLDER_TEST_URI;
const describeIntegration = uri ? describe : describe.skip;

describeIntegration(
  'folders with a disposable MongoDB replica-set database',
  () => {
    let connection: Connection;
    let assets: Model<Asset>;
    let folderModel: Model<Folder>;
    let folders: FoldersService;
    let uploader: UploaderService;
    const storage = {
      put: jest.fn<Promise<void>, [string, Buffer, string]>(),
      objectUrl: (key: string) => `https://example.invalid/${key}`,
    };
    const file = {
      buffer: Buffer.from('asset bytes'),
      mimetype: 'image/png',
      originalname: 'image.png',
      size: 11,
    };

    beforeAll(async () => {
      if (!uri) {
        throw new Error(
          'MONGODB_FOLDER_TEST_URI is required for integration tests'
        );
      }
      connection = await createConnection(uri, {
        dbName: `uploader_folders_test_${randomUUID().replaceAll('-', '')}`,
      }).asPromise();
      assets = connection.model(Asset.name, AssetSchema);
      folderModel = connection.model(Folder.name, FolderSchema);
      folders = new FoldersService(folderModel, assets);
      uploader = new UploaderService(
        assets,
        storage as unknown as SpacesStorageService,
        folders
      );
      await folders.onModuleInit();
      await uploader.onModuleInit();
    }, 30000);

    beforeEach(async () => {
      await assets.deleteMany({});
      await folderModel.deleteMany({});
      storage.put.mockReset().mockResolvedValue(undefined);
    });

    afterAll(async () => {
      if (connection) {
        await connection.dropDatabase();
        await connection.close();
      }
    });

    it.each([false, true])(
      'enforces concurrent checksum uniqueness before S3 transfer (folders=%s)',
      async (useFolders) => {
        const first = useFolders
          ? await folders.create({ name: 'First' })
          : undefined;
        const second = useFolders
          ? await folders.create({ name: 'Second' })
          : undefined;
        const results = await Promise.allSettled([
          uploader.receiveUpload(file, { folderId: first?._id.toString() }),
          uploader.receiveUpload(file, { folderId: second?._id.toString() }),
        ]);
        expect(
          results.filter((result) => result.status === 'fulfilled')
        ).toHaveLength(1);
        const rejected = results.find((result) => result.status === 'rejected');
        expect(rejected).toMatchObject({
          status: 'rejected',
          reason: expect.any(ConflictException) as unknown,
        });

        expect(await assets.countDocuments()).toBe(1);
        expect(storage.put).toHaveBeenCalledTimes(1);
      }
    );

    it('releases duplicate protection after metadata deletion without deleting stored bytes', async () => {
      const original = await uploader.receiveUpload(file, {});
      await uploader.remove(original._id.toString());
      const replacement = await uploader.receiveUpload(file, {});
      expect(replacement.storageKey).not.toBe(original.storageKey);
      expect(storage.put).toHaveBeenCalledTimes(2);
    });

    it('fails index creation for legacy duplicates until they are reconciled', async () => {
      await assets.collection.dropIndex('unique_active_checksum');
      try {
        const data = {
          name: 'Legacy duplicate',
          storageStatus: AssetStorageStatus.READY,
          checksumSha256: 'a'.repeat(64),
        };
        await assets.create([data, data]);
        await expect(uploader.onModuleInit()).rejects.toMatchObject({
          code: 11000,
        });
      } finally {
        await assets.deleteMany({});
        await uploader.onModuleInit();
      }
    });

    it('blocks archived content across folders but allows retry after storage failure', async () => {
      const first = await folders.create({ name: 'First' });
      const second = await folders.create({ name: 'Second' });
      storage.put.mockRejectedValueOnce(new Error('storage unavailable'));
      await expect(
        uploader.receiveUpload(file, { folderId: first.id as string })
      ).rejects.toMatchObject({ status: 503 });
      const asset = await uploader.receiveUpload(file, {
        folderId: second.id as string,
      });
      await uploader.archive(asset.id as string);
      await expect(
        uploader.receiveUpload(file, { folderId: first.id as string })
      ).rejects.toBeInstanceOf(ConflictException);
      expect(
        await assets.countDocuments({
          storageStatus: AssetStorageStatus.STORAGE_FAILED,
        })
      ).toBe(1);
      expect(storage.put).toHaveBeenCalledTimes(2);
    });

    it('blocks pending uncertain uploads', async () => {
      const asset = await uploader.receiveUpload(file, {});
      await assets.updateOne(
        { _id: asset._id },
        { $set: { storageStatus: AssetStorageStatus.PENDING_STORAGE } }
      );
      await expect(uploader.receiveUpload(file, {})).rejects.toBeInstanceOf(
        ConflictException
      );
      expect(storage.put).toHaveBeenCalledTimes(1);
    });

    it('supports rename conflicts, nonempty delete rollback, moves, root filters and legacy assets', async () => {
      const first = await folders.create({ name: 'First' });
      const second = await folders.create({ name: 'Second' });
      await expect(folders.create({ name: ' FIRST ' })).rejects.toBeInstanceOf(
        ConflictException
      );
      await expect(
        folders.update(second.id as string, { name: 'first' })
      ).rejects.toBeInstanceOf(ConflictException);
      const asset = await uploader.receiveUpload(file, {
        folderId: first.id as string,
      });
      await expect(folders.remove(first.id as string)).rejects.toBeInstanceOf(
        ConflictException
      );
      expect(await folderModel.exists({ _id: first._id })).not.toBeNull();
      const moved = await uploader.update(asset.id as string, {
        folderId: second.id as string,
      });
      expect(moved.storageKey).toBe(asset.storageKey);
      expect(moved.storageUrl).toBe(asset.storageUrl);
      expect(moved.checksumSha256).toBe(asset.checksumSha256);
      expect(moved.version).toBe(2);
      expect(
        await uploader.findAll(undefined, second.id as string)
      ).toHaveLength(1);
      await uploader.update(asset.id as string, { folderId: null });
      await assets.updateOne({ _id: asset._id }, { $unset: { folderId: '' } });
      expect(await uploader.findAll(undefined, undefined, true)).toHaveLength(
        1
      );
      await folders.remove(first.id as string);
      await folders.remove(second.id as string);
      expect(await folderModel.countDocuments()).toBe(0);
    });

    it('rejects missing destinations before storing and supports transactional asset removal', async () => {
      const folder = await folders.create({ name: 'Folder' });
      const asset = await uploader.create({
        name: 'Metadata',
        folderId: folder.id as string,
      });
      await expect(
        uploader.update(asset.id as string, {
          folderId: '507f1f77bcf86cd799439011',
        })
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        uploader.receiveUpload(file, { folderId: '507f1f77bcf86cd799439011' })
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(storage.put).not.toHaveBeenCalled();
      await uploader.remove(asset.id as string);
      await folders.remove(folder.id as string);
      expect(await assets.countDocuments()).toBe(0);
    });

    it('serializes concurrent folder deletion with assignment without dangling references', async () => {
      for (let iteration = 0; iteration < 8; iteration++) {
        const folder = await folders.create({ name: `Race ${iteration}` });
        const results = await Promise.allSettled([
          uploader.create({
            name: 'Concurrent asset',
            folderId: folder.id as string,
          }),
          folders.remove(folder.id as string),
        ]);
        expect(
          results.filter((result) => result.status === 'fulfilled')
        ).toHaveLength(1);
        const exists = await folderModel.exists({ _id: folder._id });
        const members = await assets.countDocuments({ folderId: folder._id });
        expect(members).toBe(exists ? 1 : 0);
        const rejected = results.find((result) => result.status === 'rejected');
        if (rejected?.status === 'rejected') {
          expect(rejected.reason).toBeInstanceOf(
            exists ? ConflictException : NotFoundException
          );
        }
      }
    });

    it('serializes deletion with moving an existing root asset into the folder', async () => {
      for (let iteration = 0; iteration < 8; iteration++) {
        const folder = await folders.create({ name: `Move race ${iteration}` });
        const asset = await uploader.create({ name: 'Root asset' });
        const results = await Promise.allSettled([
          uploader.update(asset._id.toString(), {
            folderId: folder._id.toString(),
          }),
          folders.remove(folder._id.toString()),
        ]);
        expect(
          results.filter((result) => result.status === 'fulfilled')
        ).toHaveLength(1);
        const exists = await folderModel.exists({ _id: folder._id });
        const saved = await assets.findById(asset._id).orFail();
        expect(saved.folderId?.toString() ?? null).toBe(
          exists ? folder._id.toString() : null
        );
      }
    });
  }
);
