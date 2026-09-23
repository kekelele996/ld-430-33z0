import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TagCategory } from '../types/enums';

export type TagDocument = HydratedDocument<Tag>;

@Schema({ timestamps: true })
export class Tag {
  @Prop({ required: true, unique: true })
  name!: string;

  @Prop({ enum: TagCategory, default: TagCategory.Other })
  category!: TagCategory;

  @Prop({ default: 0 })
  usageCount!: number;
}

export const TagSchema = SchemaFactory.createForClass(Tag);
