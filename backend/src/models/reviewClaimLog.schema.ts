import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ClaimAction } from '../types/enums';

export type ReviewClaimLogDocument = HydratedDocument<ReviewClaimLog>;

@Schema({ timestamps: true })
export class ReviewClaimLog {
  @Prop({ type: Types.ObjectId, ref: 'Asset', required: true })
  assetId!: Types.ObjectId;

  @Prop({ enum: ClaimAction, required: true })
  action!: ClaimAction;

  @Prop({ required: true })
  operatorId!: string;

  @Prop()
  reason?: string;

  @Prop({ default: () => new Date() })
  occurredAt!: Date;
}

export const ReviewClaimLogSchema = SchemaFactory.createForClass(ReviewClaimLog);
ReviewClaimLogSchema.index({ assetId: 1, occurredAt: -1 });
