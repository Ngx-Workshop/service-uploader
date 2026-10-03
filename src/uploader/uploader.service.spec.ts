import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Model } from 'mongoose';
import { Asset, AssetStorageStatus } from './schemas/asset.schema';
import { ReceivedAssetFile, UploaderService } from './uploader.service';

class FakeAssetModel {
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
    return Promise.resolve(this as unknown as Asset);
  }
}

describe('UploaderService', () => {
  let service: UploaderService;

  beforeEach(() => {
    jest.clearAllMocks();
    FakeAssetModel.constructorCalls = 0;
    service = new UploaderService(FakeAssetModel as unknown as Model<Asset>);
  });

  it('creates metadata in the awaiting-upload state', async () => {
    const result = await service.create({ name: 'Workshop logo' });

    expect(result).toMatchObject({
      name: 'Workshop logo',
      storageStatus: AssetStorageStatus.AWAITING_UPLOAD,
    });
  });

  it('fingerprints a received file and marks it pending storage', async () => {
    const buffer = Buffer.from('asset contents');
    const file: ReceivedAssetFile = {
      buffer,
      mimetype: 'image/png',
      originalname: 'logo.png',
      size: buffer.length,
    };

    const result = await service.receiveUpload(file, {
      description: 'Primary logo',
    });

    expect(result).toMatchObject({
      name: 'logo.png',
      description: 'Primary logo',
      originalFilename: 'logo.png',
      mediaType: 'image/png',
      sizeBytes: buffer.length,
      checksumSha256: createHash('sha256').update(buffer).digest('hex'),
      storageStatus: AssetStorageStatus.PENDING_STORAGE,
    });
    expect(result).not.toHaveProperty('buffer');
  });

  it('rejects an empty upload', async () => {
    await expect(
      service.receiveUpload(
        {
          buffer: Buffer.alloc(0),
          mimetype: 'application/octet-stream',
          originalname: 'empty.bin',
          size: 0,
        },
        {}
      )
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(FakeAssetModel.constructorCalls).toBe(0);
  });

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
