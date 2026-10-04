import { ConflictException, NotFoundException } from '@nestjs/common';
import { ClientSession, Model, mongo, Types } from 'mongoose';
import { FoldersService } from './folders.service';
import { Asset, AssetDocument } from './schemas/asset.schema';
import { Folder } from './schemas/folder.schema';

describe('FoldersService', () => {
  const id = '507f1f77bcf86cd799439011';
  const targetId = '507f1f77bcf86cd799439012';
  const session = {} as ClientSession;
  const folderSave = jest.fn();
  class FolderModel {
    static createIndexes = jest.fn();
    static find = jest.fn();
    static findById = jest.fn();
    static findByIdAndUpdate = jest.fn();
    static findByIdAndDelete = jest.fn();
    constructor(data: Record<string, unknown>) {
      Object.assign(this, data);
    }
    save = (): Promise<unknown> => folderSave(this) as Promise<unknown>;
  }
  const assets = {
    create: jest.fn(),
    db: {
      transaction: jest.fn(
        (callback: (session: ClientSession) => Promise<unknown>) =>
          callback(session)
      ),
    },
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    exists: jest.fn(),
  };
  const query = (result: unknown) => {
    const chain = {
      exec: jest.fn().mockResolvedValue(result),
      select: jest.fn(),
      session: jest.fn(),
      sort: jest.fn(),
    };
    chain.select.mockReturnValue(chain);
    chain.session.mockReturnValue(chain);
    chain.sort.mockReturnValue(chain);
    return chain;
  };
  let service: FoldersService;

  beforeEach(() => {
    jest.clearAllMocks();
    folderSave
      .mockReset()
      .mockImplementation((folder: unknown) => Promise.resolve(folder));
    FolderModel.findByIdAndUpdate.mockReturnValue(query({ _id: id }));
    FolderModel.findByIdAndDelete.mockReturnValue(query({ _id: id }));
    assets.exists.mockReturnValue({
      session: jest.fn().mockResolvedValue(null),
    });
    assets.findByIdAndDelete.mockReturnValue(query({ _id: id }));
    assets.create.mockResolvedValue([{}]);
    service = new FoldersService(
      FolderModel as unknown as Model<Folder>,
      assets as unknown as Model<Asset>
    );
  });

  it('creates trimmed, case-insensitively unique names', async () => {
    await expect(
      service.create({ name: '  Workshop  ' })
    ).resolves.toMatchObject({
      name: 'Workshop',
      normalizedName: 'workshop',
    });
  });

  it('maps folder name conflicts to 409 and propagates unrelated database errors', async () => {
    folderSave.mockRejectedValueOnce(
      new mongo.MongoServerError({
        code: 11000,
        keyPattern: { normalizedName: 1 },
      })
    );
    await expect(service.create({ name: 'Workshop' })).rejects.toBeInstanceOf(
      ConflictException
    );
    folderSave.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(service.create({ name: 'Workshop' })).rejects.toThrow(
      'database unavailable'
    );
  });

  it('renames folders with validation and versioning', async () => {
    await service.update(id, { name: '  Renamed  ' });
    expect(FolderModel.findByIdAndUpdate).toHaveBeenCalledWith(
      id,
      {
        $set: { name: 'Renamed', normalizedName: 'renamed' },
        $inc: { version: 1 },
      },
      { new: true, runValidators: true }
    );
  });

  it('returns 404 for missing folders on reads, renames, and deletion', async () => {
    FolderModel.findById.mockReturnValue(query(null));
    FolderModel.findByIdAndUpdate.mockReturnValue(query(null));
    FolderModel.findByIdAndDelete.mockReturnValue(query(null));
    await expect(service.findOne(id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.update(id, { name: 'Renamed' })
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove(id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes empty folders inside a transaction', async () => {
    await service.remove(id);
    expect(assets.db.transaction).toHaveBeenCalledTimes(1);
    expect(FolderModel.findByIdAndDelete).toHaveBeenCalledWith(id, { session });
    expect(assets.exists).toHaveBeenCalledWith({ folderId: id });
  });

  it('aborts deletion when any asset references the folder, including archived assets', async () => {
    assets.exists.mockReturnValue({
      session: jest.fn().mockResolvedValue({ _id: targetId }),
    });
    await expect(service.remove(id)).rejects.toBeInstanceOf(ConflictException);
    expect(assets.exists).toHaveBeenCalledWith({ folderId: id });
  });

  it('serializes folder assignment and saves in the same session', async () => {
    const data = { folderId: new Types.ObjectId(id) };
    const asset = {
      ...data,
      toObject: () => data,
    } as unknown as AssetDocument;
    await service.saveAsset(asset);
    expect(FolderModel.findByIdAndUpdate).toHaveBeenCalledWith(
      id,
      { $inc: { version: 1 } },
      { session, new: true }
    );
    expect(assets.create).toHaveBeenCalledWith([data], { session });
  });

  it('does not save an asset assigned to a nonexistent folder', async () => {
    FolderModel.findByIdAndUpdate.mockReturnValue(query(null));
    const save = jest.fn();
    await expect(
      service.saveAsset({
        folderId: new Types.ObjectId(id),
        save,
      } as unknown as AssetDocument)
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(save).not.toHaveBeenCalled();
  });

  it('saves root assets without requiring a membership transaction', async () => {
    const save = jest.fn().mockResolvedValue({});
    await service.saveAsset({
      folderId: null,
      save,
    } as unknown as AssetDocument);
    expect(save).toHaveBeenCalledWith();
    expect(assets.db.transaction).not.toHaveBeenCalled();
  });

  it('moves between folders by writing both folder documents and only mutable metadata', async () => {
    assets.findById.mockReturnValue(
      query({ folderId: new Types.ObjectId(id) })
    );
    const updated = { folderId: targetId, storageKey: 'unchanged', version: 2 };
    assets.findByIdAndUpdate.mockReturnValue(query(updated));
    await expect(
      service.moveAsset(id, { folderId: targetId })
    ).resolves.toEqual(updated);
    expect(
      FolderModel.findByIdAndUpdate.mock.calls.map((call: unknown[]) => call[0])
    ).toEqual([id, targetId]);
    expect(assets.findByIdAndUpdate).toHaveBeenCalledWith(
      id,
      { $set: { folderId: targetId }, $inc: { version: 1 } },
      { session, new: true, runValidators: true }
    );
  });

  it('moves to root and coordinates metadata deletion with the old folder', async () => {
    assets.findById.mockReturnValue(
      query({ folderId: new Types.ObjectId(id) })
    );
    assets.findByIdAndUpdate.mockReturnValue(query({ folderId: null }));
    await service.moveAsset(id, { folderId: null });
    await service.removeAsset(id);
    expect(FolderModel.findByIdAndUpdate).toHaveBeenCalledTimes(2);
    expect(assets.findByIdAndDelete).toHaveBeenCalledWith(id, { session });
  });

  it('rejects missing assets and missing move destinations without applying the update', async () => {
    assets.findById.mockReturnValue(query(null));
    await expect(
      service.moveAsset(id, { folderId: targetId })
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.removeAsset(id)).rejects.toBeInstanceOf(
      NotFoundException
    );
    assets.findById.mockReturnValue(query({ folderId: null }));
    FolderModel.findByIdAndUpdate.mockReturnValue(query(null));
    await expect(
      service.moveAsset(id, { folderId: targetId })
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(assets.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});
