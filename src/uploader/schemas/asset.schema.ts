import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum AssetStorageStatus {
  AWAITING_UPLOAD = 'AWAITING_UPLOAD',
  PENDING_STORAGE = 'PENDING_STORAGE',
  READY = 'READY',
  STORAGE_FAILED = 'STORAGE_FAILED',
}

export type AssetDocument = HydratedDocument<Asset>;

@Schema({
  collection: 'assets',
  timestamps: true,
  versionKey: false,
})
export class Asset {
  @Prop({ required: true, trim: true, maxlength: 120 })
  name: string;

  @Prop({ trim: true, maxlength: 2000 })
  description?: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: false, index: true })
  archived: boolean;

  @Prop({ default: 1, min: 1 })
  version: number;

  @Prop({
    required: true,
    enum: AssetStorageStatus,
    default: AssetStorageStatus.AWAITING_UPLOAD,
  })
  storageStatus: AssetStorageStatus;

  @Prop()
  storageKey?: string;

  @Prop()
  storageUrl?: string;

  @Prop({ maxlength: 255 })
  originalFilename?: string;

  @Prop({ maxlength: 255 })
  mediaType?: string;

  @Prop({ min: 0 })
  sizeBytes?: number;

  @Prop({ match: /^[a-f0-9]{64}$/ })
  checksumSha256?: string;

  @Prop()
  receivedAt?: Date;

  createdAt: Date;

  updatedAt: Date;
}

export const AssetSchema = SchemaFactory.createForClass(Asset);
