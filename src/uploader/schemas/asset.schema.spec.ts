import { AssetSchema, AssetStorageStatus } from './asset.schema';
import { FolderSchema } from './folder.schema';

describe('asset and folder constraints', () => {
  it('stores membership as an ObjectId rather than mixed data', () => {
    expect(AssetSchema.path('folderId').instance).toBe('ObjectId');
  });
  it('enforces global uniqueness for pending and ready checksums, regardless of archive/folder', () => {
    expect(AssetSchema.indexes()).toContainEqual([
      { checksumSha256: 1 },
      expect.objectContaining({
        unique: true,
        partialFilterExpression: {
          checksumSha256: { $type: 'string' },
          storageStatus: {
            $in: [AssetStorageStatus.PENDING_STORAGE, AssetStorageStatus.READY],
          },
        },
      }),
    ]);
  });

  it('enforces unique normalized folder names', () => {
    expect(FolderSchema.indexes()).toContainEqual([
      { normalizedName: 1 },
      expect.objectContaining({ unique: true }),
    ]);
  });
});
