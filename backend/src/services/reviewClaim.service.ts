import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { REVIEW_CLAIM_TTL_MS, SYSTEM_OPERATOR_ID } from '../config/reviewClaim.config';
import { ReviewClaim, type ReviewClaimDocument } from '../models/reviewClaim.schema';
import { ReviewClaimLog, type ReviewClaimLogDocument } from '../models/reviewClaimLog.schema';
import { AssetStatus, ClaimAction, UserRole } from '../types/enums';
import type { ClaimStatus } from '../types/interfaces';
import { AssetService } from './asset.service';

const isDuplicateKey = (error: unknown) => (error as { code?: number } | null)?.code === 11000;

@Injectable()
export class ReviewClaimService {
  constructor(
    @InjectModel(ReviewClaim.name) private readonly claimModel: Model<ReviewClaimDocument>,
    @InjectModel(ReviewClaimLog.name) private readonly logModel: Model<ReviewClaimLogDocument>,
    private readonly assetService: AssetService,
  ) {}

  /** 认领素材：仅 Draft/Flagged 可认领，两小时有效；并发抢单靠唯一索引 + 乐观锁保证只成功一个 */
  async claim(assetId: string, userId: string, reason?: string) {
    const asset = await this.assetService.findById(assetId);
    if (asset.status === AssetStatus.Archived) throw new BadRequestException('归档素材不能认领');
    if (asset.status !== AssetStatus.Draft && asset.status !== AssetStatus.Flagged) {
      throw new BadRequestException('仅草稿(Draft)或 Flagged 状态的素材可认领');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + REVIEW_CLAIM_TTL_MS);
    const objectId = new Types.ObjectId(assetId);
    const existing = await this.claimModel.findOne({ assetId: objectId }).exec();

    if (existing && existing.expiresAt.getTime() > now.getTime() && existing.claimedBy !== userId) {
      throw new ConflictException(`素材已被 ${existing.claimedBy} 认领，截止时间 ${existing.expiresAt.toISOString()}`);
    }

    if (existing) {
      const tookOverExpired = existing.expiresAt.getTime() <= now.getTime();
      // 乐观锁：expiresAt 作为版本条件，两人同时抢只有一人更新成功
      const updated = await this.claimModel
        .findOneAndUpdate(
          { _id: existing._id, expiresAt: existing.expiresAt },
          { $set: { claimedBy: userId, claimedAt: now, expiresAt } },
          { new: true },
        )
        .exec();
      if (!updated) throw await this.claimConflict(assetId);
      if (tookOverExpired) await this.log(assetId, ClaimAction.Expire, SYSTEM_OPERATOR_ID, '认领到期自动释放');
      await this.log(assetId, ClaimAction.Claim, userId, reason ?? (tookOverExpired ? '认领已到期素材' : '认领续期'));
      return updated;
    }

    try {
      const created = await this.claimModel.create({ assetId: objectId, claimedBy: userId, claimedAt: now, expiresAt });
      await this.log(assetId, ClaimAction.Claim, userId, reason ?? '主动认领');
      return created;
    } catch (error) {
      if (isDuplicateKey(error)) throw await this.claimConflict(assetId);
      throw error;
    }
  }

  /** 放弃认领：认领人本人或 Admin 可操作 */
  async release(assetId: string, userId: string, role: UserRole, reason?: string) {
    const existing = await this.claimModel.findOne({ assetId: new Types.ObjectId(assetId) }).exec();
    if (!existing) throw new BadRequestException('该素材当前没有认领记录');
    if (existing.expiresAt.getTime() <= Date.now()) {
      await this.expireStale(assetId, existing);
      throw new BadRequestException('认领已到期并自动释放，无需放弃');
    }
    if (existing.claimedBy !== userId && role !== UserRole.Admin) {
      throw new ForbiddenException('只有认领人本人或 Admin 可以放弃认领');
    }
    await this.claimModel.deleteOne({ _id: existing._id, expiresAt: existing.expiresAt }).exec();
    await this.log(assetId, ClaimAction.Release, userId, reason ?? '主动放弃认领');
    return { released: true };
  }

  /** 查看认领状态：其他审核人可看到占用人和截止时间 */
  async getStatus(assetId: string): Promise<ClaimStatus> {
    await this.assetService.findById(assetId);
    const existing = await this.claimModel.findOne({ assetId: new Types.ObjectId(assetId) }).exec();
    if (!existing) return { assetId, claimed: false };
    if (existing.expiresAt.getTime() <= Date.now()) {
      await this.expireStale(assetId, existing);
      return { assetId, claimed: false };
    }
    return {
      assetId,
      claimed: true,
      claimedBy: existing.claimedBy,
      claimedAt: existing.claimedAt,
      expiresAt: existing.expiresAt,
      remainingMs: existing.expiresAt.getTime() - Date.now(),
    };
  }

  /** 审核前校验：必须持有有效认领，且是认领人本人 */
  async assertReviewable(assetId: string, userId: string) {
    const existing = await this.claimModel.findOne({ assetId: new Types.ObjectId(assetId) }).exec();
    if (!existing) throw new ConflictException('该素材尚未认领，请先认领再提交审核');
    if (existing.expiresAt.getTime() <= Date.now()) {
      await this.expireStale(assetId, existing);
      throw new ConflictException('认领已到期释放，请重新认领后再审核');
    }
    if (existing.claimedBy !== userId) {
      throw new ForbiddenException(`素材正由 ${existing.claimedBy} 审核，截止时间 ${existing.expiresAt.toISOString()}`);
    }
    return existing;
  }

  /** 审核完成：释放认领并记录审核日志 */
  async completeReview(assetId: string, userId: string, reason?: string) {
    await this.claimModel.deleteOne({ assetId: new Types.ObjectId(assetId) }).exec();
    await this.log(assetId, ClaimAction.Review, userId, reason);
  }

  listLogs(assetId: string) {
    return this.logModel.find({ assetId: new Types.ObjectId(assetId) }).sort({ occurredAt: -1 }).exec();
  }

  /** 到期释放：条件删除防并发重复，只有真正删掉的那次写日志 */
  private async expireStale(assetId: string, claim: ReviewClaimDocument) {
    const result = await this.claimModel.deleteOne({ _id: claim._id, expiresAt: claim.expiresAt }).exec();
    if (result.deletedCount > 0) {
      await this.log(assetId, ClaimAction.Expire, SYSTEM_OPERATOR_ID, '认领到期自动释放');
    }
  }

  private async claimConflict(assetId: string): Promise<ConflictException> {
    const current = await this.claimModel.findOne({ assetId: new Types.ObjectId(assetId) }).exec();
    if (current) {
      return new ConflictException(`素材已被 ${current.claimedBy} 认领，截止时间 ${current.expiresAt.toISOString()}`);
    }
    return new ConflictException('认领冲突，请重试');
  }

  private log(assetId: string, action: ClaimAction, operatorId: string, reason?: string) {
    return this.logModel.create({ assetId: new Types.ObjectId(assetId), action, operatorId, reason });
  }
}
