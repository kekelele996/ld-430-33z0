import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { REVIEW_CLAIM_ROUTES } from '../routes/reviewClaim.routes';
import { ReviewClaimService } from '../services/reviewClaim.service';
import type { AuthUser } from '../types/interfaces';
import { ok } from '../utils/response';

@ApiTags('review-claims')
@Controller()
export class ReviewClaimController {
  constructor(private readonly reviewClaimService: ReviewClaimService) {}

  @Post(REVIEW_CLAIM_ROUTES.claim)
  async claim(
    @Param('assetId') assetId: string,
    @Req() req: Request & { user?: AuthUser },
    @Body('reason') reason: string,
  ) {
    const claim = await this.reviewClaimService.claim(assetId, this.requireUser(req), reason);
    return ok(claim, '认领成功，两小时内仅你可以审核');
  }

  @Post(REVIEW_CLAIM_ROUTES.abandon)
  async abandon(
    @Param('assetId') assetId: string,
    @Req() req: Request & { user?: AuthUser },
    @Body('reason') reason: string,
  ) {
    const claim = await this.reviewClaimService.abandon(assetId, this.requireUser(req), reason);
    return ok(claim, '已放弃认领');
  }

  @Get(REVIEW_CLAIM_ROUTES.byAsset)
  async findByAsset(@Param('assetId') assetId: string) {
    return ok(await this.reviewClaimService.findByAsset(assetId));
  }

  @Get(REVIEW_CLAIM_ROUTES.root)
  async findActive(@Query('assetId') assetId?: string, @Query('claimedBy') claimedBy?: string) {
    return ok(await this.reviewClaimService.findActive({ assetId, claimedBy }));
  }

  @Get(REVIEW_CLAIM_ROUTES.events)
  async findEvents(@Query('assetId') assetId?: string) {
    return ok(await this.reviewClaimService.findEvents(assetId));
  }

  private requireUser(req: Request & { user?: AuthUser }): AuthUser {
    if (!req.user) throw new Error('鉴权中间件未注入用户');
    return req.user;
  }
}
