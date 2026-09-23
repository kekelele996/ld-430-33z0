import { Body, Controller, ForbiddenException, Get, Param, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { REVIEW_ROUTES } from '../routes/review.routes';
import { ReviewClaimService } from '../services/reviewClaim.service';
import { ReviewService } from '../services/review.service';
import { ReviewResult, UserRole } from '../types/enums';
import type { AuthUser } from '../types/interfaces';
import { ok } from '../utils/response';

type AuthedRequest = Request & { user?: AuthUser };

@ApiTags('reviews')
@Controller(REVIEW_ROUTES.root)
export class ReviewController {
  constructor(
    private readonly reviewService: ReviewService,
    private readonly reviewClaimService: ReviewClaimService,
  ) {}

  private assertReviewerRole(user?: AuthUser): AuthUser {
    if (!user || (user.role !== UserRole.Admin && user.role !== UserRole.Moderator)) {
      throw new ForbiddenException('仅 Admin 或 Moderator 可执行审核认领操作');
    }
    return user;
  }

  @Get()
  async findAll() {
    return ok(await this.reviewService.findAll());
  }

  @Get(REVIEW_ROUTES.claim)
  async getClaimStatus(@Param('assetId') assetId: string) {
    return ok(await this.reviewClaimService.getStatus(assetId));
  }

  @Get(REVIEW_ROUTES.claimLogs)
  async listClaimLogs(@Param('assetId') assetId: string) {
    return ok(await this.reviewClaimService.listLogs(assetId));
  }

  @Post(REVIEW_ROUTES.claim)
  async claim(@Param('assetId') assetId: string, @Body() body: { reason?: string }, @Req() req: AuthedRequest) {
    const user = this.assertReviewerRole(req.user);
    return ok(await this.reviewClaimService.claim(assetId, user.id, body?.reason), '认领成功，两小时内有效');
  }

  @Post(REVIEW_ROUTES.release)
  async release(@Param('assetId') assetId: string, @Body() body: { reason?: string }, @Req() req: AuthedRequest) {
    const user = this.assertReviewerRole(req.user);
    return ok(await this.reviewClaimService.release(assetId, user.id, user.role, body?.reason), '已放弃认领');
  }

  @Post(REVIEW_ROUTES.reviewAsset)
  async review(
    @Param('assetId') assetId: string,
    @Body() payload: { result: ReviewResult; comment?: string },
    @Req() req: AuthedRequest,
  ) {
    const user = this.assertReviewerRole(req.user);
    const { record, duplicated } = await this.reviewService.review(assetId, {
      reviewerId: user.id,
      result: payload.result,
      comment: payload.comment,
    });
    return ok(record, duplicated ? '该版本已存在审核记录，保留最先提交' : '审核已记录');
  }
}
