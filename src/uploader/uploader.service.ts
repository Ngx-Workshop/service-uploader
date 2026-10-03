import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'node:crypto';
import { Model } from 'mongoose';
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

export interface ReceivedAssetFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

@Injectable()
export class UploaderService {
  constructor(
    @InjectModel(Asset.name)
    private readonly assetModel: Model<Asset>
  ) {}

  async create(createAssetDto: CreateAssetDto): Promise<AssetDocument> {
    const asset = new this.assetModel({
      ...createAssetDto,
      storageStatus: AssetStorageStatus.AWAITING_UPLOAD,
    });
    return asset.save();
  }

  async receiveUpload(
    file: ReceivedAssetFile,
    uploadAssetDto: UploadAssetDto
  ): Promise<AssetDocument> {
    if (file.size === 0 || file.buffer.length === 0) {
      throw new BadRequestException('Uploaded file must not be empty');
    }
    if (!file.originalname || file.originalname.length > 255) {
      throw new BadRequestException(
        'Uploaded file must have a filename no longer than 255 characters'
      );
    }

    const asset = new this.assetModel({
      name: uploadAssetDto.name ?? file.originalname.slice(0, 120),
      description: uploadAssetDto.description,
      originalFilename: file.originalname,
      mediaType: file.mimetype,
      sizeBytes: file.size,
      checksumSha256: createHash('sha256').update(file.buffer).digest('hex'),
      receivedAt: new Date(),
      storageStatus: AssetStorageStatus.PENDING_STORAGE,
    });

    return asset.save();
  }

  async findAll(archived?: boolean): Promise<AssetDocument[]> {
    const filter = archived === undefined ? {} : { archived };
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
    const asset = await this.assetModel.findByIdAndDelete(id).exec();
    if (!asset) {
      throw new NotFoundException(`Asset with ID "${id}" not found`);
    }
  }

  archive(id: string): Promise<AssetDocument> {
    return this.update(id, { archived: true });
  }

  unarchive(id: string): Promise<AssetDocument> {
    return this.update(id, { archived: false });
  }
}
