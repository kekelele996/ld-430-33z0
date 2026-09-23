import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ClaimStatus } from '../types/enums';

export type ReviewClaimDocument = HydratedDocument<ReviewClaim>;

@Schema({ timestamps: true })
export class ReviewClaim {
  @Prop({ type: Types.ObjectId, ref: 'Asset', required: true })
  assetId!: Types.ObjectId;

  @Prop({ required: true })
  claimedBy!: string;

  @Prop({ required: true })
  claimReason!: string;

  @Prop({ required: true })
  claimedAt!: Date;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ enum: ClaimStatus, default: ClaimStatus.Active, required: true })
  status!: ClaimStatus;

  @Prop()
  releasedAt?: Date;

  @Prop()
  releasedBy?: string;

  @Prop()
  releaseReason?: string;

  @Prop()
  assetVersionAtClaim?: number;
}

export const ReviewClaimSchema = SchemaFactory.createForClass(ReviewClaim);
// 同一素材同时只允许存在一条生效中的认领，抢单由数据库唯一约束兜底
ReviewClaimSchema.index(
  { assetId: 1 },
  { unique: true, partialFilterExpression: { status: ClaimStatus.Active } },
);
ReviewClaimSchema.index({ status: 1, expiresAt: 1 });
ReviewClaimSchema.index({ claimedBy: 1, status: 1 });
