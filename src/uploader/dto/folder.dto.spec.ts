import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateFolderDto, UpdateFolderDto } from './folder.dto';

describe('folder DTO validation', () => {
  it.each([CreateFolderDto, UpdateFolderDto])(
    'trims names in %p',
    async (Dto) => {
      const dto = plainToInstance(Dto, { name: '  Workshop  ' });
      expect(dto.name).toBe('Workshop');
      await expect(validate(dto)).resolves.toHaveLength(0);
    }
  );

  it.each(['', '   ', 'a'.repeat(121), null, 42])(
    'rejects invalid folder name %p',
    async (name) => {
      await expect(
        validate(plainToInstance(CreateFolderDto, { name }))
      ).resolves.not.toHaveLength(0);
    }
  );

  it('requires a name when renaming', async () => {
    await expect(
      validate(plainToInstance(UpdateFolderDto, {}))
    ).resolves.not.toHaveLength(0);
  });
});
