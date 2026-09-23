import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Category } from '../models/category.schema';
import { CATEGORY_ROUTES } from '../routes/category.routes';
import { CategoryService } from '../services/category.service';
import { ok } from '../utils/response';

@ApiTags('categories')
@Controller(CATEGORY_ROUTES.root)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  async findAll() {
    return ok(await this.categoryService.findAll());
  }

  @Post()
  async create(@Body() payload: Partial<Category>) {
    return ok(await this.categoryService.create(payload), '分类已创建');
  }

  @Patch(CATEGORY_ROUTES.detail)
  async update(@Param('id') id: string, @Body() payload: Partial<Category>) {
    return ok(await this.categoryService.update(id, payload), '分类已更新');
  }
}
