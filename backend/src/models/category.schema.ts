import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true })
  name!: string;

  @Prop({ type: Types.ObjectId, ref: 'Category' })
  parentCategoryId?: Types.ObjectId;

  @Prop()
  icon?: string;

  @Prop({ default: 0 })
  sortOrder!: number;

  @Prop()
  description?: string;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
