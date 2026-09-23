import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CollectionDocument = HydratedDocument<Collection>;

@Schema({ timestamps: true })
export class Collection {
  @Prop({ required: true })
  name!: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  creatorId!: string;

  @Prop()
  coverUrl?: string;

  @Prop({ type: [Types.ObjectId], ref: 'Asset', default: [] })
  assetIds!: Types.ObjectId[];

  @Prop({ default: false })
  isPublic!: boolean;

  @Prop({ type: [String], default: [] })
  collaboratorIds!: string[];
}

export const CollectionSchema = SchemaFactory.createForClass(Collection);
