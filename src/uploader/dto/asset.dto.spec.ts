import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAssetDto, UpdateAssetDto, UploadAssetDto } from './asset.dto';

describe('asset DTO validation', () => {
  it('accepts valid metadata', async () => {
    const dto = plainToInstance(CreateAssetDto, {
      name: 'Workshop logo',
      description: 'Primary logo',
      tags: ['brand', 'header'],
      archived: false,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects missing names and invalid tags', async () => {
    const dto = plainToInstance(CreateAssetDto, {
      name: '',
      tags: ['valid', 42],
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['name', 'tags'])
    );
  });

  it('allows upload metadata to omit a display name', async () => {
    const dto = plainToInstance(UploadAssetDto, {
      description: 'Uses the original filename',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it.each([CreateAssetDto, UpdateAssetDto, UploadAssetDto])(
    'rejects malformed folder IDs in %p',
    async (Dto) => {
      const dto = plainToInstance(Dto, {
        name: 'Asset',
        folderId: 'invalid',
      });
      const errors = await validate(dto);
      expect(errors.map((error) => error.property)).toContain('folderId');
    }
  );

  it('accepts explicit null for a root move', async () => {
    await expect(
      validate(plainToInstance(UpdateAssetDto, { folderId: null }))
    ).resolves.toHaveLength(0);
  });
});
