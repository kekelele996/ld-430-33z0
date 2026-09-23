import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ReviewClaim, type ReviewClaimDocument } from '../models/reviewClaim.schema';
import { ReviewClaimEvent, type ReviewClaimEventDocument } from '../models/reviewClaimEvent.schema';
import { Asset, type AssetDocument } from '../models/asset.schema';
import { AssetStatus, ClaimAction, ClaimStatus, ReviewResult, UserRole } from '../types/enums';
import type { AuthUser } from '../types/interfaces';
import { CLAIM_SWEEP_INTERVAL_MS, CLAIM_TTL_MS } from '../config/reviewClaim.config';
import { isDuplicateKeyError } from '../utils/mongoError';
import { logger } from '../utils/logger';

const SYSTEM_OPERATOR = 'system';
const CLAIMABLE_STATUSES = [AssetStatus.Draft, AssetStatus.Flagged];

@Injectable()
export class ReviewClaimService implements OnModuleInit, OnModuleDestroy {
  private sweepTimer?: NodeJS.Timeout;

  constructor(
    @InjectModel(ReviewClaim.name) private readonly claimModel: Model<ReviewClaimDocument>,
    @InjectModel(ReviewClaimEvent.name) private readonly eventModel: Model<ReviewClaimEventDocument>,
    @InjectModel(Asset.name) private readonly assetModel: Model<AssetDocument>,
  ) {}

  onModuleInit() {
    this.sweepTimer = setInterval(() => {
      this.sweepExpired().catch((error) => logger.error('认领到期清扫失败', error));
    }, CLAIM_SWEEP_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
  }

  /**
   * 认领素材。两小时内仅认人生效；并发抢单依赖 Active 认领的唯一索引，
   * 两人同时抢只有一人成功。
   */
  async claim(assetId: string, user: AuthUser, reason: string): Promise<ReviewClaimDocument> {
    if (user.role !== UserRole.Admin && user.role !== UserRole.Moderator) {
      throw new ForbiddenException('只有 Admin 和 Moderator 可以认领素材');
    }
    if (!reason || !reason.trim()) throw new BadRequestException('认领原因不能为空');
    const asset = await this.loadAsset(assetId);
    if (asset.status === AssetStatus.Archived) throw new BadRequestException('归档素材不能认领');
    if (!CLAIMABLE_STATUSES.includes(asset.status)) {
      throw new ConflictException(`当前状态（${asset.status}）的素材无需审核认领`);
    }

    await this.releaseExpiredForAsset(assetId);

    const existing = await this.claimModel.findOne({ assetId: asset._id, status: ClaimStatus.Active }).exec();
    if (existing) {
      if (existing.claimedBy === user.id) return existing;
      throw new ConflictException(
        `素材已由 ${existing.claimedBy} 认领，截止时间 ${existing.expiresAt.toISOString()}`,
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + CLAIM_TTL_MS);
    try {
      const claim = await this.claimModel.create({
        assetId: asset._id,
        claimedBy: user.id,
        claimReason: reason.trim(),
        claimedAt: now,
        expiresAt,
        status: ClaimStatus.Active,
        assetVersionAtClaim: asset.version,
      });
      await this.recordEvent({
        assetId: asset._id,
        claimId: claim._id,
        action: ClaimAction.Claimed,
        operatorId: user.id,
        reason: reason.trim(),
        occurredAt: now,
        expiresAt,
        assetVersion: asset.version,
      });
      return claim;
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      // 并发抢单落败：重新读取占用信息返回给后来者
      await this.releaseExpiredForAsset(assetId);
      const winner = await this.claimModel.findOne({ assetId: asset._id, status: ClaimStatus.Active }).exec();
      if (winner) {
        if (winner.claimedBy === user.id) return winner;
        throw new ConflictException(`素材已由 ${winner.claimedBy} 认领，截止时间 ${winner.expiresAt.toISOString()}`);
      }
      return this.claim(assetId, user, reason);
    }
  }

  /** 认领人主动放弃认领 */
  async abandon(assetId: string, user: AuthUser, reason: string): Promise<ReviewClaimDocument> {
    if (user.role !== UserRole.Admin && user.role !== UserRole.Moderator) {
      throw new ForbiddenException('只有 Admin 和 Moderator 可以操作认领');
    }
    if (!reason || !reason.trim()) throw new BadRequestException('放弃原因不能为空');
    const asset = await this.loadAsset(assetId);

    await this.releaseExpiredForAsset(assetId);
    const claim = await this.claimModel.findOne({ assetId: asset._id, status: ClaimStatus.Active }).exec();
    if (!claim) throw new ConflictException('该素材当前没有生效中的认领');
    if (claim.claimedBy !== user.id) {
      throw new ForbiddenException(`素材由 ${claim.claimedBy} 认领中，仅认领人可以放弃`);
    }

    const now = new Date();
    const result = await this.claimModel
      .updateOne(
        { _id: claim._id, status: ClaimStatus.Active, claimedBy: user.id },
        { $set: { status: ClaimStatus.Released, releasedAt: now, releasedBy: user.id, releaseReason: reason.trim() } },
      )
      .exec();
    if (result.matchedCount === 0) throw new ConflictException('认领已失效，放弃失败');

    await this.recordEvent({
      assetId: asset._id,
      claimId: claim._id,
      action: ClaimAction.Released,
      operatorId: user.id,
      reason: reason.trim(),
      occurredAt: now,
      assetVersion: claim.assetVersionAtClaim,
    });
    return this.claimModel.findById(claim._id).exec() as Promise<ReviewClaimDocument>;
  }

  /** 查询素材当前认领状态；到期认领在查询时惰性释放 */
  async findByAsset(assetId: string): Promise<ReviewClaimDocument | null> {
    const asset = await this.loadAsset(assetId);
    await this.releaseExpiredForAsset(assetId);
    const active = await this.claimModel.findOne({ assetId: asset._id, status: ClaimStatus.Active }).exec();
    if (active) return active;
    return this.claimModel.findOne({ assetId: asset._id }).sort({ claimedAt: -1 }).exec();
  }

  /** 生效中的认领列表（其他审核人据此看到占用人和截止时间） */
  findActive(query: { assetId?: string; claimedBy?: string } = {}) {
    const filter: Record<string, unknown> = { status: ClaimStatus.Active, expiresAt: { $gt: new Date() } };
    if (query.assetId) filter.assetId = new Types.ObjectId(query.assetId);
    if (query.claimedBy) filter.claimedBy = query.claimedBy;
    return this.claimModel.find(filter).sort({ expiresAt: 1 }).exec();
  }

  /** 认领/审核操作流水 */
  findEvents(assetId?: string) {
    const filter: Record<string, unknown> = {};
    if (assetId) filter.assetId = new Types.ObjectId(assetId);
    return this.eventModel.find(filter).sort({ occurredAt: -1 }).exec();
  }

  /**
   * 审核前置校验：必须在认领有效期内、且由认领人本人提交。
   * 素材在此期间被归档时，认领自动释放并拒绝审核。
   */
  async requireActiveClaim(
    assetId: string,
    user: AuthUser,
  ): Promise<{ claim: ReviewClaimDocument; asset: AssetDocument }> {
    if (user.role !== UserRole.Admin && user.role !== UserRole.Moderator) {
      throw new ForbiddenException('只有 Admin 和 Moderator 可以提交审核结论');
    }
    const asset = await this.loadAsset(assetId);
    await this.releaseExpiredForAsset(assetId);
    const claim = await this.claimModel.findOne({ assetId: asset._id, status: ClaimStatus.Active }).exec();
    if (!claim) throw new ForbiddenException('素材未被认领，请先认领后再审核');
    if (claim.claimedBy !== user.id) {
      throw new ForbiddenException(`素材由 ${claim.claimedBy} 认领中，截止时间 ${claim.expiresAt.toISOString()}`);
    }
    if (asset.status === AssetStatus.Archived) {
      await this.releaseForAsset(asset, SYSTEM_OPERATOR, '素材已归档，认领自动释放');
      throw new BadRequestException('归档素材不能审核');
    }
    return { claim, asset };
  }

  /** 审核提交成功后，认领消费关闭，并写入审核/消费两条流水 */
  async markConsumed(
    claim: ReviewClaimDocument,
    user: AuthUser,
    result: ReviewResult,
    assetVersion: number,
    reason: string,
  ): Promise<void> {
    const now = new Date();
    await this.claimModel
      .updateOne({ _id: claim._id, status: ClaimStatus.Active }, { $set: { status: ClaimStatus.Consumed, releasedAt: now } })
      .exec();
    await this.recordEvent({
      assetId: claim.assetId,
      claimId: claim._id,
      action: ClaimAction.Consumed,
      operatorId: user.id,
      reason,
      occurredAt: now,
      reviewResult: result,
      assetVersion,
    });
    await this.recordEvent({
      assetId: claim.assetId,
      claimId: claim._id,
      action: ClaimAction.Reviewed,
      operatorId: user.id,
      reason,
      occurredAt: now,
      reviewResult: result,
      assetVersion,
    });
  }

  /** 释放素材上任意生效中的认领（如归档联动），返回是否释放 */
  async releaseForAsset(assetOrId: AssetDocument | Types.ObjectId | string, operatorId: string, reason: string): Promise<boolean> {
    const assetId = typeof assetOrId === 'string' ? new Types.ObjectId(assetOrId) : (assetOrId as { _id: Types.ObjectId })._id;
    const claim = await this.claimModel.findOne({ assetId, status: ClaimStatus.Active }).exec();
    if (!claim) return false;
    const now = new Date();
    const result = await this.claimModel
      .updateOne({ _id: claim._id, status: ClaimStatus.Active }, { $set: { status: ClaimStatus.Released, releasedAt: now, releasedBy: operatorId, releaseReason: reason } })
      .exec();
    if (result.matchedCount === 0) return false;
    await this.recordEvent({
      assetId,
      claimId: claim._id,
      action: ClaimAction.Released,
      operatorId,
      reason,
      occurredAt: now,
      assetVersion: claim.assetVersionAtClaim,
    });
    return true;
  }

  /** 惰性释放：指定素材的生效认领若已到期，原子置为 Released 并记录到期流水 */
  async releaseExpiredForAsset(assetId: string | Types.ObjectId): Promise<ReviewClaimDocument | null> {
    const id = typeof assetId === 'string' ? new Types.ObjectId(assetId) : assetId;
    const now = new Date();
    const claim = await this.claimModel.findOne({ assetId: id, status: ClaimStatus.Active, expiresAt: { $lte: now } }).exec();
    if (!claim) return null;
    const reason = '认领两小时到期，系统自动释放';
    const result = await this.claimModel
      .updateOne(
        { _id: claim._id, status: ClaimStatus.Active, expiresAt: { $lte: now } },
        { $set: { status: ClaimStatus.Released, releasedAt: now, releasedBy: SYSTEM_OPERATOR, releaseReason: reason } },
      )
      .exec();
    if (result.matchedCount === 0) return null;
    await this.recordEvent({
      assetId: id,
      claimId: claim._id,
      action: ClaimAction.Expired,
      operatorId: SYSTEM_OPERATOR,
      reason,
      occurredAt: now,
      assetVersion: claim.assetVersionAtClaim,
    });
    return this.claimModel.findById(claim._id).exec();
  }

  /** 定时清扫所有到期认领，保证无人访问的素材也能到期重新可认领 */
  async sweepExpired(): Promise<number> {
    const now = new Date();
    const expired = await this.claimModel.find({ status: ClaimStatus.Active, expiresAt: { $lte: now } }).exec();
    await Promise.all(expired.map((claim) => this.releaseExpiredForAsset(claim.assetId).catch(() => null)));
    return expired.length;
  }

  private async loadAsset(assetId: string): Promise<AssetDocument> {
    if (!Types.ObjectId.isValid(assetId)) throw new BadRequestException('素材 ID 不合法');
    const asset = await this.assetModel.findById(assetId).exec();
    if (!asset) throw new NotFoundException('素材不存在');
    return asset;
  }

  private recordEvent(payload: {
    assetId: Types.ObjectId;
    claimId?: Types.ObjectId;
    action: ClaimAction;
    operatorId: string;
    occurredAt: Date;
    reason: string;
    expiresAt?: Date;
    reviewResult?: ReviewResult;
    assetVersion?: number;
  }) {
    return this.eventModel.create(payload);
  }
}
