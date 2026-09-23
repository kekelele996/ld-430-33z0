import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReviewClaimDocument = HydratedDocument<ReviewClaim>;

@Schema({ timestamps: true })
export class ReviewClaim {
  @Prop({ type: Types.ObjectId, ref: 'Asset', required: true, unique: true })
  assetId!: Types.ObjectId;

  @Prop({ required: true })
  claimedBy!: string;

  @Prop({ required: true, default: () => new Date() })
  claimedAt!: Date;

  @Prop({ required: true })
  expiresAt!: Date;
}

export const ReviewClaimSchema = SchemaFactory.createForClass(ReviewClaim);
ReviewClaimSchema.index({ expiresAt: 1 });
