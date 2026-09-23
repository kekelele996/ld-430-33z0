import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ClaimAction, ReviewResult } from '../types/enums';

export type ReviewClaimEventDocument = HydratedDocument<ReviewClaimEvent>;

@Schema({ timestamps: true })
export class ReviewClaimEvent {
  @Prop({ type: Types.ObjectId, ref: 'Asset', required: true })
  assetId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'ReviewClaim' })
  claimId?: Types.ObjectId;

  @Prop({ enum: ClaimAction, required: true })
  action!: ClaimAction;

  @Prop({ required: true })
  operatorId!: string;

  @Prop({ required: true })
  occurredAt!: Date;

  @Prop({ required: true })
  reason!: string;

  @Prop()
  expiresAt?: Date;

  @Prop({ enum: ReviewResult })
  reviewResult?: ReviewResult;

  @Prop()
  assetVersion?: number;
}

export const ReviewClaimEventSchema = SchemaFactory.createForClass(ReviewClaimEvent);
ReviewClaimEventSchema.index({ assetId: 1, occurredAt: -1 });
ReviewClaimEventSchema.index({ operatorId: 1, occurredAt: -1 });
