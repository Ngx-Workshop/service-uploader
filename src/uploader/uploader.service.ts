import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomUUID } from 'node:crypto';
import { Model } from 'mongoose';
import { SpacesStorageService } from './spaces-storage.service';
import { FoldersService } from './folders.service';
import { isDuplicateKey } from './persistence-errors';
import {
  CreateAssetDto,
  UpdateAssetDto,
  UploadAssetDto,
} from './dto/asset.dto';
import {
  Asset,
  AssetDocument,
  AssetStorageStatus,
} from './schemas/asset.schema';

export const BROWSER_ASSET_MEDIA_TYPE_PATTERN =
  /^(?:image\/[a-z0-9][a-z0-9.+-]*|video\/[a-z0-9][a-z0-9.+-]*|application\/pdf)$/i;
export const BROWSER_ASSET_MEDIA_TYPE_DESCRIPTION =
  'image/*, video/*, or application/pdf';
const MOJIBAKE_UTF8_SEQUENCE =
  /(?:\u00c2[\u0080-\u00bf]|\u00c3[\u0080-\u00bf]|\u00e2[\u0080-\u00bf]{2})/;

export interface ReceivedAssetFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

export function normalizeUploadedFilename(filename: string): string {
  const basename = filename.replaceAll('\\', '/').split('/').pop() ?? '';
  const decoded = MOJIBAKE_UTF8_SEQUENCE.test(basename)
    ? Buffer.from(basename, 'latin1').toString('utf8')
    : basename;
  const normalized = decoded.includes('\ufffd') ? basename : decoded;

  return normalized
    .normalize('NFKC')
    .replace(/\p{Cc}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

@Injectable()
export class UploaderService implements OnModuleInit {
  private readonly logger = new Logger(UploaderService.name);
  constructor(
    @InjectModel(Asset.name)
    private readonly assetModel: Model<Asset>,
    private readonly storage: SpacesStorageService,
    private readonly folders: FoldersService
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.GENERATE_OPENAPI !== 'true') {
      await this.assetModel.createIndexes();
    }
  }

  async create(createAssetDto: CreateAssetDto): Promise<AssetDocument> {
    const asset = new this.assetModel({
      ...createAssetDto,
      storageStatus: AssetStorageStatus.AWAITING_UPLOAD,
    });
    return this.folders.saveAsset(asset);
  }

  async receiveUpload(
    file: ReceivedAssetFile,
    uploadAssetDto: UploadAssetDto
  ): Promise<AssetDocument> {
    if (file.size === 0 || file.buffer.length === 0) {
      throw new BadRequestException('Uploaded file must not be empty');
    }
    if (!BROWSER_ASSET_MEDIA_TYPE_PATTERN.test(file.mimetype)) {
      throw new BadRequestException(
        `Uploaded file must use ${BROWSER_ASSET_MEDIA_TYPE_DESCRIPTION}`
      );
    }
    const normalizedFilename = normalizeUploadedFilename(file.originalname);
    if (!normalizedFilename || normalizedFilename.length > 255) {
      throw new BadRequestException(
        'Uploaded file must have a filename no longer than 255 characters'
      );
    }

    const extension =
      /\.[a-zA-Z0-9]{1,10}$/.exec(normalizedFilename)?.[0].toLowerCase() ?? '';
    const storageKey = `uploads/${randomUUID()}${extension}`;
    let asset = new this.assetModel({
      storageKey,
      storageUrl: this.storage.objectUrl(storageKey),
      name: uploadAssetDto.name ?? normalizedFilename.slice(0, 120),
      description: uploadAssetDto.description,
      folderId: uploadAssetDto.folderId,
      originalFilename: normalizedFilename,
      mediaType: file.mimetype,
      sizeBytes: file.size,
      checksumSha256: createHash('sha256').update(file.buffer).digest('hex'),
      receivedAt: new Date(),
      storageStatus: AssetStorageStatus.PENDING_STORAGE,
    });

    // Persist the intended location before transferring bytes so partial failures
    // leave an identifiable record for reconciliation.
    try {
      asset = await this.folders.saveAsset(asset);
    } catch (error) {
      if (isDuplicateKey(error, 'checksumSha256')) {
        throw new ConflictException(
          'An asset with identical content already exists'
        );
      }
      throw error;
    }
    // Do not reuse the completed membership transaction for subsequent saves.
    asset.$session(null);
    try {
      await this.storage.put(storageKey, file.buffer, file.mimetype);
    } catch {
      asset.storageStatus = AssetStorageStatus.STORAGE_FAILED;
      try {
        await asset.save();
      } catch {
        this.logger.error(`Could not record storage failure for ${storageKey}`);
      }
      throw new ServiceUnavailableException(
        'Asset storage failed; upload the file again'
      );
    }

    asset.storageStatus = AssetStorageStatus.READY;
    // If this write fails, the persisted record remains pending, with its key.
    // Keep the stored object: a database timeout can have an uncertain outcome.
    return asset.save();
  }

  async findAll(
    archived?: boolean,
    folderId?: string,
    root?: boolean
  ): Promise<AssetDocument[]> {
    if (folderId !== undefined && root === true) {
      throw new BadRequestException(
        'folderId and root=true cannot be combined'
      );
    }
    if (folderId !== undefined) {
      await this.folders.findOne(folderId);
    }
    const filter = {
      ...(archived === undefined ? {} : { archived }),
      ...(folderId === undefined ? {} : { folderId }),
      ...(root === true ? { folderId: null } : {}),
    };
    return this.assetModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<AssetDocument> {
    const asset = await this.assetModel.findById(id).exec();
    if (!asset) {
      throw new NotFoundException(`Asset with ID "${id}" not found`);
    }
    return asset;
  }

  async update(
    id: string,
    updateAssetDto: UpdateAssetDto
  ): Promise<AssetDocument> {
    if (updateAssetDto.folderId !== undefined) {
      return this.folders.moveAsset(id, updateAssetDto);
    }
    const asset = await this.assetModel
      .findByIdAndUpdate(
        id,
        {
          $set: updateAssetDto,
          $inc: { version: 1 },
        },
        { new: true, runValidators: true }
      )
      .exec();

    if (!asset) {
      throw new NotFoundException(`Asset with ID "${id}" not found`);
    }
    return asset;
  }

  async remove(id: string): Promise<void> {
    await this.folders.removeAsset(id);
  }

  archive(id: string): Promise<AssetDocument> {
    return this.update(id, { archived: true });
  }

  unarchive(id: string): Promise<AssetDocument> {
    return this.update(id, { archived: false });
  }
}
