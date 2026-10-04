import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model } from 'mongoose';
import { Asset, AssetDocument } from './schemas/asset.schema';
import { Folder, FolderDocument } from './schemas/folder.schema';
import { CreateFolderDto, UpdateFolderDto } from './dto/folder.dto';
import { UpdateAssetDto } from './dto/asset.dto';
import { isDuplicateKey } from './persistence-errors';

@Injectable()
export class FoldersService implements OnModuleInit {
  constructor(
    @InjectModel(Folder.name) private readonly folderModel: Model<Folder>,
    @InjectModel(Asset.name) private readonly assetModel: Model<Asset>
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.GENERATE_OPENAPI !== 'true') {
      await this.folderModel.createIndexes();
    }
  }

  async create(dto: CreateFolderDto): Promise<FolderDocument> {
    try {
      return await new this.folderModel({
        name: dto.name.trim(),
        normalizedName: dto.name.trim().toLowerCase(),
      }).save();
    } catch (error) {
      this.rethrowNameConflict(error);
    }
  }

  findAll(): Promise<FolderDocument[]> {
    return this.folderModel
      .find()
      .select('-normalizedName')
      .sort({ name: 1, _id: 1 })
      .exec();
  }

  async findOne(id: string): Promise<FolderDocument> {
    const folder = await this.folderModel
      .findById(id)
      .select('-normalizedName')
      .exec();
    if (!folder) {
      throw new NotFoundException(`Folder with ID "${id}" not found`);
    }
    return folder;
  }

  async update(id: string, dto: UpdateFolderDto): Promise<FolderDocument> {
    try {
      const folder = await this.folderModel
        .findByIdAndUpdate(
          id,
          {
            $set: {
              name: dto.name.trim(),
              normalizedName: dto.name.trim().toLowerCase(),
            },
            $inc: { version: 1 },
          },
          { new: true, runValidators: true }
        )
        .select('-normalizedName')
        .exec();
      if (!folder) {
        throw new NotFoundException(`Folder with ID "${id}" not found`);
      }
      return folder;
    } catch (error) {
      this.rethrowNameConflict(error);
    }
  }

  async remove(id: string): Promise<void> {
    await this.assetModel.db.transaction(async (session) => {
      const folder = await this.folderModel
        .findByIdAndDelete(id, { session })
        .exec();
      if (!folder) {
        throw new NotFoundException(`Folder with ID "${id}" not found`);
      }
      const occupied = await this.assetModel
        .exists({ folderId: id })
        .session(session);
      if (occupied) {
        throw new ConflictException(
          'Move assets out before deleting this folder'
        );
      }
    });
  }

  async saveAsset(asset: AssetDocument): Promise<AssetDocument> {
    const folderId = asset.folderId?.toString();
    if (!folderId) {
      return asset.save();
    }
    return this.assetModel.db.transaction(async (session) => {
      await this.touchFolder(folderId, session);
      // A commit-time write conflict can rerun the callback after a successful
      // save. Create a fresh document per attempt rather than reusing isNew state.
      const [saved] = await this.assetModel.create([asset.toObject()], {
        session,
      });
      return saved;
    });
  }

  async moveAsset(id: string, dto: UpdateAssetDto): Promise<AssetDocument> {
    return this.assetModel.db.transaction(async (session) => {
      const asset = await this.assetModel.findById(id).session(session).exec();
      if (!asset) {
        throw new NotFoundException(`Asset with ID "${id}" not found`);
      }
      const folderIds = new Set(
        [asset.folderId?.toString(), dto.folderId].filter(
          (folderId): folderId is string => typeof folderId === 'string'
        )
      );
      for (const folderId of [...folderIds].sort()) {
        await this.touchFolder(folderId, session);
      }
      const updated = await this.assetModel
        .findByIdAndUpdate(
          id,
          { $set: dto, $inc: { version: 1 } },
          { session, new: true, runValidators: true }
        )
        .exec();
      if (!updated) {
        throw new NotFoundException(`Asset with ID "${id}" not found`);
      }
      return updated;
    });
  }

  async removeAsset(id: string): Promise<void> {
    await this.assetModel.db.transaction(async (session) => {
      const asset = await this.assetModel.findById(id).session(session).exec();
      if (!asset) {
        throw new NotFoundException(`Asset with ID "${id}" not found`);
      }
      if (asset.folderId) {
        await this.touchFolder(asset.folderId.toString(), session);
      }
      await this.assetModel.findByIdAndDelete(id, { session }).exec();
    });
  }

  private async touchFolder(id: string, session: ClientSession): Promise<void> {
    // Shared writes serialize membership changes with folder deletion.
    const folder = await this.folderModel
      .findByIdAndUpdate(id, { $inc: { version: 1 } }, { session, new: true })
      .exec();
    if (!folder) {
      throw new NotFoundException(`Folder with ID "${id}" not found`);
    }
  }

  private rethrowNameConflict(error: unknown): never {
    if (isDuplicateKey(error, 'normalizedName')) {
      throw new ConflictException('A folder with this name already exists');
    }
    throw error;
  }
}
