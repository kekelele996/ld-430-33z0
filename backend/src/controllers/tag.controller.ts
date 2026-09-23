import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Tag } from '../models/tag.schema';
import { TAG_ROUTES } from '../routes/tag.routes';
import { TagService } from '../services/tag.service';
import { ok } from '../utils/response';

@ApiTags('tags')
@Controller(TAG_ROUTES.root)
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Get()
  async findAll() {
    return ok(await this.tagService.findAll());
  }

  @Post()
  async create(@Body() payload: Partial<Tag>) {
    return ok(await this.tagService.create(payload), '标签已创建');
  }
}
