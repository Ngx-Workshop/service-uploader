import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

@Injectable()
export class SpacesStorageService implements OnModuleDestroy {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly endpoint: string;
  private readonly acl: 'public-read' | 'private';

  constructor(config: ConfigService) {
    const accessKeyId = config.getOrThrow<string>('SPACES_ACCESS_KEY_ID');
    const secretAccessKey = config.getOrThrow<string>(
      'SPACES_SECRET_ACCESS_KEY'
    );
    if (!accessKeyId.trim() || !secretAccessKey.trim()) {
      throw new Error('Spaces credentials must not be empty');
    }
    this.bucket = config.get<string>('SPACES_BUCKET') ?? 'ngx-workshop-assets';
    this.endpoint =
      config.get<string>('SPACES_ENDPOINT') ??
      'https://sfo3.digitaloceanspaces.com';
    const endpoint = new URL(this.endpoint);
    if (
      endpoint.protocol !== 'https:' ||
      endpoint.pathname !== '/' ||
      endpoint.search ||
      endpoint.hash ||
      endpoint.username ||
      endpoint.password
    ) {
      throw new Error('SPACES_ENDPOINT must be an HTTPS origin');
    }
    if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(this.bucket)) {
      throw new Error('Invalid SPACES_BUCKET');
    }
    const acl = config.get<string>('SPACES_OBJECT_ACL') ?? 'public-read';
    if (acl !== 'public-read' && acl !== 'private') {
      throw new Error('SPACES_OBJECT_ACL must be public-read or private');
    }
    this.acl = acl;
    this.client = new S3Client({
      endpoint: endpoint.origin,
      region: 'us-east-1',
      forcePathStyle: false,
      credentials: { accessKeyId, secretAccessKey },
      maxAttempts: 3,
    });
  }

  objectUrl(key: string): string {
    const endpoint = new URL(this.endpoint);
    endpoint.hostname = `${this.bucket}.${endpoint.hostname}`;
    endpoint.pathname = key.split('/').map(encodeURIComponent).join('/');
    return endpoint.toString();
  }

  async put(key: string, buffer: Buffer, mediaType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentLength: buffer.length,
        ContentType: mediaType,
        ACL: this.acl,
      }),
      { abortSignal: AbortSignal.timeout(60_000) }
    );
  }

  onModuleDestroy(): void {
    this.client.destroy();
  }
}
