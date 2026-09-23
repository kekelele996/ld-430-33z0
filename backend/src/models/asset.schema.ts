import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AssetStatus, AssetType, LicenseType } from '../types/enums';

export type AssetDocument = HydratedDocument<Asset>;

@Schema({ timestamps: true })
export class Asset {
  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ enum: AssetType, required: true })
  assetType!: AssetType;

  @Prop({ required: true })
  fileFormat!: string;

  @Prop({ required: true })
  fileUrl!: string;

  @Prop()
  thumbnailUrl?: string;

  @Prop({ required: true })
  fileSize!: number;

  @Prop({ type: { width: Number, height: Number } })
  resolution?: { width: number; height: number };

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ type: Types.ObjectId, ref: 'Category' })
  categoryId?: Types.ObjectId;

  @Prop({ required: true })
  uploaderId!: string;

  @Prop({ enum: LicenseType, default: LicenseType.Free })
  licenseType!: LicenseType;

  @Prop({ enum: AssetStatus, default: AssetStatus.Draft })
  status!: AssetStatus;

  @Prop({ default: 0 })
  downloadCount!: number;

  @Prop({ default: 0 })
  viewCount!: number;
}

export const AssetSchema = SchemaFactory.createForClass(Asset);
AssetSchema.index({ title: 'text', description: 'text', tags: 'text' });
