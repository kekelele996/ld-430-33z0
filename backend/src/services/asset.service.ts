import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Asset, type AssetDocument } from '../models/asset.schema';
import { AssetStatus } from '../types/enums';
import { validateFileFormat } from '../utils/fileValidator';
import { thumbnailFromUrl } from '../utils/thumbnailGenerator';
import { TagService } from './tag.service';
import { StorageService } from './storage.service';
import type { AuthUser } from '../types/interfaces';
import { ReviewClaimService } from './reviewClaim.service';

const VERSIONED_FIELDS = [
  'title',
  'description',
  'assetType',
  'fileFormat',
  'fileUrl',
  'thumbnailUrl',
  'fileSize',
  'resolution',
  'tags',
  'categoryId',
  'licenseType',
] as const;

@Injectable()
export class AssetService {
  constructor(
    @InjectModel(Asset.name) private readonly assetModel: Model<AssetDocument>,
    private readonly tagService: TagService,
    private readonly storageService: StorageService,
    private readonly reviewClaimService: ReviewClaimService,
  ) {}

  async findAll(query: { keyword?: string; tag?: string; status?: AssetStatus }) {
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.tag) filter.tags = query.tag;
    if (query.keyword) filter.$text = { $search: query.keyword };
    return this.assetModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string) {
    const asset = await this.assetModel.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }, { new: true }).exec();
    if (!asset) throw new NotFoundException('素材不存在');
    return asset;
  }

  async create(payload: Partial<Asset>) {
    if (!payload.assetType || !payload.fileFormat || !validateFileFormat(payload.assetType, payload.fileFormat)) {
      throw new BadRequestException('文件格式与素材类型不匹配');
    }
    const fileUrl = payload.fileUrl ?? this.storageService.presignedUploadUrl(`${Date.now()}-${payload.title ?? 'asset'}.${payload.fileFormat}`);
    const asset = await this.assetModel.create({
      ...payload,
      fileUrl,
      thumbnailUrl: payload.thumbnailUrl ?? thumbnailFromUrl(fileUrl),
    });
    await this.tagService.upsertMany(asset.tags ?? []);
    return asset;
  }

  async update(id: string, payload: Partial<Asset>) {
    const contentChanged = VERSIONED_FIELDS.some((field) => field in payload);
    const update: Partial<Asset> = { ...payload };
    if (contentChanged) update.version = (await this.requireAsset(id)).version + 1;
    return this.assetModel.findByIdAndUpdate(id, update, { new: true }).exec();
  }

  publish(id: string) {
    return this.assetModel.findByIdAndUpdate(id, { status: AssetStatus.Published }, { new: true }).exec();
  }

  flag(id: string) {
    return this.assetModel.findByIdAndUpdate(id, { status: AssetStatus.Flagged }, { new: true }).exec();
  }

  async archive(id: string, user?: AuthUser) {
    const asset = await this.requireAsset(id);
    // 归档素材不能认领：任何生效中的认领随归档释放
    await this.reviewClaimService.releaseForAsset(asset, user?.id ?? 'system', '素材已归档，认领自动释放');
    return this.assetModel.findByIdAndUpdate(id, { status: AssetStatus.Archived }, { new: true }).exec();
  }

  incrementDownload(id: string) {
    return this.assetModel.findByIdAndUpdate(id, { $inc: { downloadCount: 1 } }, { new: true }).exec();
  }

  private async requireAsset(id: string) {
    const asset = await this.assetModel.findById(id).exec();
    if (!asset) throw new NotFoundException('素材不存在');
    return asset;
  }
}
