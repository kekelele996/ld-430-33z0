import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DownloadRecord, type DownloadRecordDocument } from '../models/downloadRecord.schema';
import { AssetService } from './asset.service';
import { DownloadPurpose, LicenseType, UserRole } from '../types/enums';
import type { AuthUser } from '../types/interfaces';

@Injectable()
export class DownloadService {
  constructor(
    @InjectModel(DownloadRecord.name) private readonly downloadModel: Model<DownloadRecordDocument>,
    private readonly assetService: AssetService,
  ) {}

  findAll() {
    return this.downloadModel.find().sort({ downloadedAt: -1 }).exec();
  }

  async create(assetId: string, user: AuthUser, purpose: DownloadPurpose) {
    const asset = await this.assetService.findOne(assetId);
    if (!asset) throw new NotFoundException('素材不存在');
    const commercialOnly = [LicenseType.Commercial, LicenseType.Extended].includes(asset.licenseType);
    if (commercialOnly && user.role === UserRole.Viewer && !user.canDownloadCommercial) {
      throw new ForbiddenException('Commercial 许可素材需要额外权限');
    }
    await this.assetService.incrementDownload(assetId);
    return this.downloadModel.create({
      assetId: new Types.ObjectId(assetId),
      downloaderId: user.id,
      purpose,
      licenseVersion: `${asset.licenseType}-2026.1`,
    });
  }
}
