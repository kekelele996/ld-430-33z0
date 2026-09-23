import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tag, type TagDocument } from '../models/tag.schema';
import { TagCategory } from '../types/enums';

@Injectable()
export class TagService {
  constructor(@InjectModel(Tag.name) private readonly tagModel: Model<TagDocument>) {}

  findAll() {
    return this.tagModel.find().sort({ usageCount: -1, name: 1 }).exec();
  }

  async upsertMany(names: string[], category = TagCategory.Other) {
    await Promise.all(
      names.map((name) =>
        this.tagModel.updateOne({ name }, { $setOnInsert: { category }, $inc: { usageCount: 1 } }, { upsert: true }).exec(),
      ),
    );
  }

  create(payload: Partial<Tag>) {
    return this.tagModel.create(payload);
  }
}
