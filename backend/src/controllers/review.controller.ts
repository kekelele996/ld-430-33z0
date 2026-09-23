import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ReviewService } from '../services/review.service';
import { ReviewResult } from '../types/enums';
import type { AuthUser } from '../types/interfaces';
import { ok } from '../utils/response';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  async findAll(@Query('assetId') assetId?: string) {
    return ok(await this.reviewService.findAll({ assetId }));
  }

  @Post('assets/:assetId')
  async review(
    @Param('assetId') assetId: string,
    @Req() req: Request & { user?: AuthUser },
    @Body() payload: { result: ReviewResult; comment?: string },
  ) {
    if (!req.user) throw new Error('鉴权中间件未注入用户');
    return ok(await this.reviewService.review(assetId, req.user, payload), '审核已记录');
  }
}
