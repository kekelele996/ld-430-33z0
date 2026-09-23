import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ReviewRecord, type ReviewRecordDocument } from '../models/reviewRecord.schema';
import { AssetStatus, ReviewResult } from '../types/enums';
import { AssetService } from './asset.service';
import { ReviewClaimService } from './reviewClaim.service';

@Injectable()
export class ReviewService {
  constructor(
    @InjectModel(ReviewRecord.name) private readonly reviewModel: Model<ReviewRecordDocument>,
    private readonly assetService: AssetService,
    private readonly reviewClaimService: ReviewClaimService,
  ) {}

  findAll() {
    return this.reviewModel.find().sort({ reviewedAt: -1 }).exec();
  }

  async review(assetId: string, payload: { reviewerId: string; result: ReviewResult; comment?: string }) {
    if (!Object.values(ReviewResult).includes(payload.result)) {
      throw new BadRequestException('审核结果不合法');
    }
    const asset = await this.assetService.findById(assetId);
    if (asset.status === AssetStatus.Archived) throw new BadRequestException('归档素材不能审核');
    if (asset.status !== AssetStatus.Draft && asset.status !== AssetStatus.Flagged) {
      throw new BadRequestException('仅草稿(Draft)或 Flagged 状态的素材可审核');
    }
    await this.reviewClaimService.assertReviewable(assetId, payload.reviewerId);

    // 以素材 updatedAt 作为版本标识，同版本重复提交只保留最先记录
    const assetVersion = asset.get('updatedAt') as Date;
    const objectId = new Types.ObjectId(assetId);
    let record: ReviewRecordDocument;
    try {
      record = await this.reviewModel.create({ ...payload, assetId: objectId, assetVersion });
    } catch (error) {
      if ((error as { code?: number } | null)?.code === 11000) {
        const first = await this.reviewModel.findOne({ assetId: objectId, assetVersion }).exec();
        if (first) return { record: first, duplicated: true };
      }
      throw error;
    }

    if (payload.result === ReviewResult.Approved) await this.assetService.publish(assetId);
    if (payload.result === ReviewResult.Rejected) await this.assetService.update(assetId, { status: AssetStatus.Flagged });
    await this.reviewClaimService.completeReview(assetId, payload.reviewerId, payload.comment ?? `审核结果: ${payload.result}`);
    return { record, duplicated: false };
  }
}
