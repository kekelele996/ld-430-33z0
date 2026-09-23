import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Collection, type CollectionDocument } from '../models/collection.schema';

@Injectable()
export class CollectionService {
  constructor(@InjectModel(Collection.name) private readonly collectionModel: Model<CollectionDocument>) {}

  findAll() {
    return this.collectionModel.find().sort({ createdAt: -1 }).exec();
  }

  create(payload: Partial<Collection>) {
    return this.collectionModel.create(payload);
  }

  addAsset(collectionId: string, assetId: string) {
    return this.collectionModel
      .findByIdAndUpdate(collectionId, { $addToSet: { assetIds: new Types.ObjectId(assetId) } }, { new: true })
      .exec();
  }
}
