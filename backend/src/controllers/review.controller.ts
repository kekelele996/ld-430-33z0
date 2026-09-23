import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReviewService } from '../services/review.service';
import { ReviewResult } from '../types/enums';
import { ok } from '../utils/response';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  async findAll() {
    return ok(await this.reviewService.findAll());
  }

  @Post('assets/:assetId')
  async review(@Param('assetId') assetId: string, @Body() payload: { reviewerId: string; result: ReviewResult; comment?: string }) {
    return ok(await this.reviewService.review(assetId, payload), '审核已记录');
  }
}
