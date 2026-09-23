import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ReviewRecord, type ReviewRecordDocument } from '../models/reviewRecord.schema';
import { AssetStatus, ReviewResult } from '../types/enums';
import type { AuthUser } from '../types/interfaces';
import { AssetService } from './asset.service';
import { ReviewClaimService } from './reviewClaim.service';
import { isDuplicateKeyError } from '../utils/mongoError';

@Injectable()
export class ReviewService {
  constructor(
    @InjectModel(ReviewRecord.name) private readonly reviewModel: Model<ReviewRecordDocument>,
    private readonly assetService: AssetService,
    private readonly reviewClaimService: ReviewClaimService,
  ) {}

  findAll(query: { assetId?: string } = {}) {
    const filter: Record<string, unknown> = {};
    if (query.assetId) filter.assetId = new Types.ObjectId(query.assetId);
    return this.reviewModel.find(filter).sort({ reviewedAt: -1 }).exec();
  }

  async review(assetId: string, user: AuthUser, payload: { result: ReviewResult; comment?: string }) {
    if (!Object.values(ReviewResult).includes(payload.result)) {
      throw new BadRequestException('审核结果不合法');
    }
    const reason = payload.comment?.trim();
    if (!reason) throw new BadRequestException('审核意见/原因不能为空');

    // 两小时内只有认领人能审核；归档或认领已失效都会在这里被拒绝
    const { claim, asset } = await this.reviewClaimService.requireActiveClaim(assetId, user);

    // 同版本重复提交只留最先记录（唯一索引兜底并发）
    const existing = await this.reviewModel.findOne({ assetId: asset._id, assetVersion: asset.version }).exec();
    if (existing) {
      throw new ConflictException(`素材第 ${asset.version} 版已存在审核记录，仅保留最先提交的结论`);
    }

    try {
      const record = await this.reviewModel.create({
        assetId: asset._id,
        reviewerId: user.id,
        result: payload.result,
        comment: reason,
        assetVersion: asset.version,
      });

      if (payload.result === ReviewResult.Approved) await this.assetService.publish(assetId);
      if (payload.result === ReviewResult.Rejected) await this.assetService.flag(assetId);

      await this.reviewClaimService.markConsumed(claim, user, payload.result, asset.version, reason);
      return record;
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      const winner = await this.reviewModel.findOne({ assetId: asset._id, assetVersion: asset.version }).exec();
      throw new ConflictException(
        `同版本审核已由 ${winner?.reviewerId ?? '其他审核人'} 抢先提交，仅保留最先记录`,
      );
    }
  }
}
