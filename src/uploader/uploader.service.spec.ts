import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Model, mongo } from 'mongoose';
import { Asset, AssetStorageStatus } from './schemas/asset.schema';
import { SpacesStorageService } from './spaces-storage.service';
import { FoldersService } from './folders.service';
import {
  normalizeUploadedFilename,
  ReceivedAssetFile,
  UploaderService,
} from './uploader.service';

class FakeAssetModel {
  static save = jest.fn();
  static saved: Record<string, unknown>[] = [];
  static constructorCalls = 0;
  static findById = jest.fn();
  static findByIdAndUpdate = jest.fn();
  static findByIdAndDelete = jest.fn();
  static find = jest.fn();

  $session = jest.fn();

  constructor(data: Record<string, unknown>) {
    FakeAssetModel.constructorCalls += 1;
    Object.assign(this, data);
  }

  save(): Promise<Asset> {
    FakeAssetModel.saved.push({ ...this } as unknown as Record<
      string,
      unknown
    >);
    return FakeAssetModel.save(this) as Promise<Asset>;
  }
}

describe('UploaderService', () => {
  let service: UploaderService;
  const storage = { put: jest.fn(), objectUrl: jest.fn() };
  const folders = {
    saveAsset: jest.fn(),
    moveAsset: jest.fn(),
    removeAsset: jest.fn(),
    findOne: jest.fn(),
  };
  const file: ReceivedAssetFile = {
    buffer: Buffer.from('asset'),
    mimetype: 'video/mp4',
    originalname: '../workshop.mp4',
    size: 5,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    FakeAssetModel.constructorCalls = 0;
    FakeAssetModel.saved = [];
    FakeAssetModel.save
      .mockReset()
      .mockImplementation((asset: Asset) => Promise.resolve(asset));
    storage.put.mockReset().mockResolvedValue(undefined);
    folders.saveAsset
      .mockReset()
      .mockImplementation((asset: FakeAssetModel) => asset.save());
    storage.objectUrl.mockImplementation(
      (key: string) =>
        `https://ngx-workshop-assets.sfo3.digitaloceanspaces.com/${key}`
    );
    service = new UploaderService(
      FakeAssetModel as unknown as Model<Asset>,
      storage as unknown as SpacesStorageService,
      folders as unknown as FoldersService
    );
  });

  it('sanitizes paths and normalizes UTF-8 mojibake in uploaded filenames', () => {
    expect(
      normalizeUploadedFilename('../Screen 2026-10-03 at 11.01.50â¯PM.png')
    ).toBe('Screen 2026-10-03 at 11.01.50 PM.png');
  });

  it('creates metadata in the awaiting-upload state', async () => {
    const result = await service.create({ name: 'Workshop logo' });

    expect(result).toMatchObject({
      name: 'Workshop logo',
      storageStatus: AssetStorageStatus.AWAITING_UPLOAD,
    });
  });

  it('stores received bytes and marks the asset ready after acknowledgement', async () => {
    const buffer = Buffer.from('asset contents');
    const file: ReceivedAssetFile = {
      buffer,
      mimetype: 'video/mp4',
      originalname: 'workshop.mp4',
      size: buffer.length,
    };

    const result = await service.receiveUpload(file, {
      description: 'Primary logo',
    });

    expect(result).toMatchObject({
      name: 'workshop.mp4',
      description: 'Primary logo',
      originalFilename: 'workshop.mp4',
      mediaType: 'video/mp4',
      sizeBytes: buffer.length,
      checksumSha256: createHash('sha256').update(buffer).digest('hex'),
      storageStatus: AssetStorageStatus.READY,
    });
    expect(result).not.toHaveProperty('buffer');
    expect(result.storageKey).toMatch(/^uploads\/[0-9a-f-]+\.mp4$/);
    expect(storage.put).toHaveBeenCalledWith(
      result.storageKey,
      buffer,
      file.mimetype
    );
    expect(FakeAssetModel.saved.map((asset) => asset.storageStatus)).toEqual([
      AssetStorageStatus.PENDING_STORAGE,
      AssetStorageStatus.READY,
    ]);
  });

  it('uses the normalized filename for persisted metadata and the default name', async () => {
    const result = await service.receiveUpload(
      {
        ...file,
        originalname: '../Screen 2026-10-03 at 11.01.50â¯PM.mp4',
      },
      {}
    );

    expect(result).toMatchObject({
      name: 'Screen 2026-10-03 at 11.01.50 PM.mp4',
      originalFilename: 'Screen 2026-10-03 at 11.01.50 PM.mp4',
    });
    expect(result.storageKey).toMatch(/^uploads\/[0-9a-f-]+\.mp4$/);
  });

  it('records failed storage and returns a generic 503', async () => {
    storage.put.mockRejectedValue(new Error('sensitive provider detail'));
    await expect(service.receiveUpload(file, {})).rejects.toMatchObject({
      status: 503,
      message: 'Asset storage failed; upload the file again',
    });
    expect(FakeAssetModel.saved.map((asset) => asset.storageStatus)).toEqual([
      AssetStorageStatus.PENDING_STORAGE,
      AssetStorageStatus.STORAGE_FAILED,
    ]);
  });

  it('does not transfer bytes if the initial metadata save fails', async () => {
    FakeAssetModel.save.mockRejectedValueOnce(
      new Error('database unavailable')
    );
    await expect(service.receiveUpload(file, {})).rejects.toThrow(
      'database unavailable'
    );
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('rejects concurrent checksum reservation conflicts before transferring bytes', async () => {
    FakeAssetModel.save.mockRejectedValueOnce(
      new mongo.MongoServerError({
        code: 11000,
        keyPattern: { checksumSha256: 1 },
        message: 'duplicate checksum',
      })
    );
    await expect(service.receiveUpload(file, {})).rejects.toMatchObject({
      status: 409,
      message: 'An asset with identical content already exists',
    });
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('rejects missing destination folders before transferring bytes', async () => {
    folders.saveAsset.mockRejectedValueOnce(
      new NotFoundException('Folder not found')
    );
    await expect(
      service.receiveUpload(file, { folderId: '507f1f77bcf86cd799439011' })
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('saves the destination folder and detaches the completed session before storage', async () => {
    const result = await service.receiveUpload(file, {
      folderId: '507f1f77bcf86cd799439011',
    });
    expect(result.folderId).toBe('507f1f77bcf86cd799439011');
    expect(folders.saveAsset).toHaveBeenCalledWith(result);
    expect(FakeAssetModel.saved[0].$session).toHaveBeenCalledWith(null);
  });

  it('uses transactional moves for folder assignment and root moves', async () => {
    const id = '507f1f77bcf86cd799439011';
    await service.update(id, { folderId: id });
    await service.update(id, { folderId: null });
    expect(folders.moveAsset.mock.calls).toEqual([
      [id, { folderId: id }],
      [id, { folderId: null }],
    ]);
  });

  it('delegates deletion to transactional membership coordination', async () => {
    await service.remove('507f1f77bcf86cd799439011');
    expect(folders.removeAsset).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011'
    );
  });

  it('filters root assets, including legacy missing folder IDs', async () => {
    const exec = jest.fn().mockResolvedValue([]);
    FakeAssetModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({ exec }),
    });
    await service.findAll(false, undefined, true);
    expect(FakeAssetModel.find).toHaveBeenCalledWith({
      archived: false,
      folderId: null,
    });
  });

  it('validates folder existence for list filtering', async () => {
    const id = '507f1f77bcf86cd799439011';
    const exec = jest.fn().mockResolvedValue([]);
    FakeAssetModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({ exec }),
    });
    await service.findAll(undefined, id);
    expect(folders.findOne).toHaveBeenCalledWith(id);
    expect(FakeAssetModel.find).toHaveBeenCalledWith({ folderId: id });
    await expect(service.findAll(undefined, id, true)).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it('does not report success when the final metadata save fails', async () => {
    FakeAssetModel.save
      .mockImplementationOnce((asset: Asset) => Promise.resolve(asset))
      .mockRejectedValueOnce(new Error('database unavailable'));
    await expect(service.receiveUpload(file, {})).rejects.toThrow(
      'database unavailable'
    );
    expect(storage.put).toHaveBeenCalledTimes(1);
    expect(FakeAssetModel.saved[0]).toMatchObject({
      storageStatus: AssetStorageStatus.PENDING_STORAGE,
      storageKey: expect.any(String) as unknown,
    });
  });

  it('rejects an empty upload', async () => {
    await expect(
      service.receiveUpload(
        {
          buffer: Buffer.alloc(0),
          mimetype: 'video/mp4',
          originalname: 'empty.mp4',
          size: 0,
        },
        {}
      )
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(FakeAssetModel.constructorCalls).toBe(0);
    expect(storage.put).not.toHaveBeenCalled();
  });

  it.each([
    ['video/mp4', 'workshop.mp4'],
    ['image/png', 'Screen 2026-10-03 at 11.01.50 PM.png'],
    ['image/svg+xml', 'workshop-logo.svg'],
    ['application/pdf', 'workshop-agenda.pdf'],
  ])('accepts browser asset media type %s', async (mimetype, originalname) => {
    await expect(
      service.receiveUpload({ ...file, mimetype, originalname }, {})
    ).resolves.toMatchObject({
      mediaType: mimetype,
      originalFilename: originalname,
    });

    expect(storage.put).toHaveBeenCalledWith(
      expect.stringMatching(/^uploads\/[0-9a-f-]+\.[a-z0-9]+$/),
      file.buffer,
      mimetype
    );
  });

  it.each(['audio/mpeg', 'application/zip', 'text/plain'])(
    'rejects unsupported file media type %s before persisting or transferring',
    async (mimetype) => {
      await expect(
        service.receiveUpload({ ...file, mimetype }, {})
      ).rejects.toThrow(
        'Uploaded file must use image/*, video/*, or application/pdf'
      );

      expect(FakeAssetModel.constructorCalls).toBe(0);
      expect(storage.put).not.toHaveBeenCalled();
    }
  );

  it('returns not found when an asset does not exist', async () => {
    FakeAssetModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(service.findOne('507f1f77bcf86cd799439011')).rejects.toThrow(
      new NotFoundException(
        'Asset with ID "507f1f77bcf86cd799439011" not found'
      )
    );
  });

  it('updates only public metadata with validation and a version increment', async () => {
    const updated = { name: 'Updated', version: 2 };
    const exec = jest.fn().mockResolvedValue(updated);
    FakeAssetModel.findByIdAndUpdate.mockReturnValue({ exec });

    await expect(
      service.update('507f1f77bcf86cd799439011', { name: 'Updated' })
    ).resolves.toEqual(updated);
    expect(FakeAssetModel.findByIdAndUpdate).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      {
        $set: { name: 'Updated' },
        $inc: { version: 1 },
      },
      { new: true, runValidators: true }
    );
  });
});
