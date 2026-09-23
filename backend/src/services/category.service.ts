import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, type CategoryDocument } from '../models/category.schema';

@Injectable()
export class CategoryService {
  constructor(@InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>) {}

  findAll() {
    return this.categoryModel.find().sort({ sortOrder: 1, name: 1 }).exec();
  }

  create(payload: Partial<Category>) {
    return this.categoryModel.create(payload);
  }

  update(id: string, payload: Partial<Category>) {
    return this.categoryModel.findByIdAndUpdate(id, payload, { new: true }).exec();
  }
}
