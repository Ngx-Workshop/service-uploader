import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FolderDocument = HydratedDocument<Folder>;

@Schema({ collection: 'asset_folders', timestamps: true, versionKey: false })
export class Folder {
  @Prop({ required: true, trim: true, maxlength: 120 })
  name: string;

  @Prop({ required: true })
  normalizedName: string;

  @Prop({ default: 1, min: 1 })
  version: number;

  createdAt: Date;
  updatedAt: Date;
}

export const FolderSchema = SchemaFactory.createForClass(Folder);
FolderSchema.set('toJSON', {
  transform: (_document, result: Record<string, unknown>) => {
    delete result.normalizedName;
    return result;
  },
});
FolderSchema.index({ normalizedName: 1 }, { unique: true });
