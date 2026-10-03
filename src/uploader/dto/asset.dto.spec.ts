import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAssetDto, UploadAssetDto } from './asset.dto';

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
});
