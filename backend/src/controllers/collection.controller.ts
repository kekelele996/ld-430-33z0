import { Body, Controller, Param, Patch, Post, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Collection } from '../models/collection.schema';
import { COLLECTION_ROUTES } from '../routes/collection.routes';
import { CollectionService } from '../services/collection.service';
import { ok } from '../utils/response';

@ApiTags('collections')
@Controller(COLLECTION_ROUTES.root)
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Get()
  async findAll() {
    return ok(await this.collectionService.findAll());
  }

  @Post()
  async create(@Body() payload: Partial<Collection>) {
    return ok(await this.collectionService.create(payload), '收藏夹已创建');
  }

  @Patch(COLLECTION_ROUTES.addAsset)
  async addAsset(@Param('id') id: string, @Param('assetId') assetId: string) {
    return ok(await this.collectionService.addAsset(id, assetId), '素材已加入收藏夹');
  }
}
