import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ASSET_ROUTES } from '../routes/asset.routes';
import { AssetService } from '../services/asset.service';
import { Asset } from '../models/asset.schema';
import { AssetStatus } from '../types/enums';
import { ok } from '../utils/response';

@ApiTags('assets')
@Controller(ASSET_ROUTES.root)
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Get()
  async findAll(@Query('keyword') keyword?: string, @Query('tag') tag?: string, @Query('status') status?: AssetStatus) {
    return ok(await this.assetService.findAll({ keyword, tag, status }));
  }

  @Get(ASSET_ROUTES.detail)
  async findOne(@Param('id') id: string) {
    return ok(await this.assetService.findOne(id));
  }

  @Post()
  async create(@Body() payload: Partial<Asset>) {
    return ok(await this.assetService.create(payload), '素材已创建');
  }

  @Patch(ASSET_ROUTES.detail)
  async update(@Param('id') id: string, @Body() payload: Partial<Asset>) {
    return ok(await this.assetService.update(id, payload), '素材已更新');
  }

  @Post(ASSET_ROUTES.publish)
  async publish(@Param('id') id: string) {
    return ok(await this.assetService.publish(id), '素材已发布');
  }

  @Post(ASSET_ROUTES.archive)
  async archive(@Param('id') id: string) {
    return ok(await this.assetService.archive(id), '素材已归档');
  }
}
