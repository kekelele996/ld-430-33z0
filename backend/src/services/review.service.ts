import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ReviewRecord, type ReviewRecordDocument } from '../models/reviewRecord.schema';
import { AssetStatus, ReviewResult } from '../types/enums';
import { AssetService } from './asset.service';

@Injectable()
export class ReviewService {
  constructor(
    @InjectModel(ReviewRecord.name) private readonly reviewModel: Model<ReviewRecordDocument>,
    private readonly assetService: AssetService,
  ) {}

  findAll() {
    return this.reviewModel.find().sort({ reviewedAt: -1 }).exec();
  }

  async review(assetId: string, payload: { reviewerId: string; result: ReviewResult; comment?: string }) {
    const record = await this.reviewModel.create({ ...payload, assetId: new Types.ObjectId(assetId) });
    if (payload.result === ReviewResult.Approved) await this.assetService.publish(assetId);
    if (payload.result === ReviewResult.Rejected) await this.assetService.update(assetId, { status: AssetStatus.Flagged });
    return record;
  }
}
