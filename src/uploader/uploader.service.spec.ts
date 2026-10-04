import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Model } from 'mongoose';
import { Asset, AssetStorageStatus } from './schemas/asset.schema';
import { SpacesStorageService } from './spaces-storage.service';
import { ReceivedAssetFile, UploaderService } from './uploader.service';

class FakeAssetModel {
  static save = jest.fn();
  static saved: Record<string, unknown>[] = [];
  static constructorCalls = 0;
  static findById = jest.fn();
  static findByIdAndUpdate = jest.fn();
  static findByIdAndDelete = jest.fn();
  static find = jest.fn();

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
    storage.objectUrl.mockImplementation(
      (key: string) =>
        `https://ngx-workshop-assets.sfo3.digitaloceanspaces.com/${key}`
    );
    service = new UploaderService(
      FakeAssetModel as unknown as Model<Asset>,
      storage as unknown as SpacesStorageService
    );
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

  it.each(['image/png', 'video/avi', 'application/octet-stream'])(
    'rejects unsupported file media type %s before persisting or transferring',
    async (mimetype) => {
      await expect(
        service.receiveUpload({ ...file, mimetype }, {})
      ).rejects.toThrow(
        'Uploaded file must use one of: video/mp4, video/webm, video/ogg'
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
