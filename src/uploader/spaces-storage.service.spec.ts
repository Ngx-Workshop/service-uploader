import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { SpacesStorageService } from './spaces-storage.service';

describe('SpacesStorageService', () => {
  const settings = {
    SPACES_ACCESS_KEY_ID: 'test-key',
    SPACES_SECRET_ACCESS_KEY: 'test-secret',
  };

  afterEach(() => jest.restoreAllMocks());

  it('sends bytes to the configured bucket with public read access and a deadline', async () => {
    const send = jest.spyOn(
      S3Client.prototype,
      'send'
    ) as unknown as jest.MockedFunction<
      (command: PutObjectCommand, options?: unknown) => Promise<unknown>
    >;
    send.mockResolvedValue({});
    const storage = new SpacesStorageService(new ConfigService(settings));
    const buffer = Buffer.from('test');
    await storage.put('uploads/test.png', buffer, 'image/png');
    expect(send).toHaveBeenCalledWith(expect.any(PutObjectCommand), {
      abortSignal: expect.any(AbortSignal) as unknown,
    });
    const command = send.mock.calls[0][0];
    expect(command.input).toEqual({
      Bucket: 'ngx-workshop-assets',
      Key: 'uploads/test.png',
      Body: buffer,
      ContentLength: 4,
      ContentType: 'image/png',
      ACL: 'public-read',
    });
    expect(storage.objectUrl('uploads/test.png')).toBe(
      'https://ngx-workshop-assets.sfo3.digitaloceanspaces.com/uploads/test.png'
    );
    storage.onModuleDestroy();
  });

  it('supports private uploads and alternate bucket configuration', async () => {
    const send = jest.spyOn(
      S3Client.prototype,
      'send'
    ) as unknown as jest.MockedFunction<
      (command: PutObjectCommand, options?: unknown) => Promise<unknown>
    >;
    send.mockResolvedValue({});
    const storage = new SpacesStorageService(
      new ConfigService({
        ...settings,
        SPACES_BUCKET: 'other-assets',
        SPACES_ENDPOINT: 'https://nyc3.digitaloceanspaces.com',
        SPACES_OBJECT_ACL: 'private',
      })
    );
    await storage.put('uploads/test', Buffer.from('test'), 'text/plain');
    expect(send.mock.calls[0][0].input.ACL).toBe('private');
    expect(storage.objectUrl('uploads/test')).toBe(
      'https://other-assets.nyc3.digitaloceanspaces.com/uploads/test'
    );
    storage.onModuleDestroy();
  });

  it.each([
    { SPACES_ACCESS_KEY_ID: '' },
    { SPACES_SECRET_ACCESS_KEY: '' },
    { SPACES_OBJECT_ACL: 'invalid' },
    { SPACES_ENDPOINT: 'http://sfo3.digitaloceanspaces.com' },
    { SPACES_ENDPOINT: 'https://sfo3.digitaloceanspaces.com/path' },
    { SPACES_BUCKET: '' },
  ])('fails startup for invalid configuration %p', (override) => {
    expect(
      () =>
        new SpacesStorageService(
          new ConfigService({ ...settings, ...override })
        )
    ).toThrow();
  });
});
