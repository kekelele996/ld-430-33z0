import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ReviewResult } from '../types/enums';

export type ReviewRecordDocument = HydratedDocument<ReviewRecord>;

@Schema({ timestamps: true })
export class ReviewRecord {
  @Prop({ type: Types.ObjectId, ref: 'Asset', required: true })
  assetId!: Types.ObjectId;

  @Prop({ required: true })
  reviewerId!: string;

  @Prop({ enum: ReviewResult, required: true })
  result!: ReviewResult;

  @Prop()
  comment?: string;

  @Prop({ default: () => new Date() })
  reviewedAt!: Date;
}

export const ReviewRecordSchema = SchemaFactory.createForClass(ReviewRecord);
