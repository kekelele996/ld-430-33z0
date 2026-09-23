import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { mongoUri } from './config/database.config';
import { AssetController } from './controllers/asset.controller';
import { CategoryController } from './controllers/category.controller';
import { CollectionController } from './controllers/collection.controller';
import { DownloadController } from './controllers/download.controller';
import { HealthController } from './controllers/health.controller';
import { ReviewController } from './controllers/review.controller';
import { TagController } from './controllers/tag.controller';
import { Asset, AssetSchema } from './models/asset.schema';
import { Category, CategorySchema } from './models/category.schema';
import { Collection, CollectionSchema } from './models/collection.schema';
import { DownloadRecord, DownloadRecordSchema } from './models/downloadRecord.schema';
import { ReviewRecord, ReviewRecordSchema } from './models/reviewRecord.schema';
import { Tag, TagSchema } from './models/tag.schema';
import { AssetService } from './services/asset.service';
import { CategoryService } from './services/category.service';
import { CollectionService } from './services/collection.service';
import { DownloadService } from './services/download.service';
import { ReviewService } from './services/review.service';
import { StorageService } from './services/storage.service';
import { TagService } from './services/tag.service';
import { AuditLogMiddleware } from './middlewares/auditLog.middleware';
import { AuthMiddleware } from './middlewares/auth.middleware';
import { RateLimitMiddleware } from './middlewares/rateLimit.middleware';
import { RbacMiddleware } from './middlewares/rbac.middleware';
import { RequestLoggerMiddleware } from './middlewares/requestLogger.middleware';
import { ValidationMiddleware } from './middlewares/validation.middleware';

@Module({
  imports: [
    MongooseModule.forRoot(mongoUri()),
    MongooseModule.forFeature([
      { name: Asset.name, schema: AssetSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Collection.name, schema: CollectionSchema },
      { name: DownloadRecord.name, schema: DownloadRecordSchema },
      { name: ReviewRecord.name, schema: ReviewRecordSchema },
      { name: Tag.name, schema: TagSchema },
    ]),
  ],
  controllers: [HealthController, AssetController, CategoryController, CollectionController, DownloadController, ReviewController, TagController],
  providers: [AssetService, CategoryService, CollectionService, DownloadService, ReviewService, StorageService, TagService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggerMiddleware, AuthMiddleware, RateLimitMiddleware, RbacMiddleware, ValidationMiddleware, AuditLogMiddleware)
      .forRoutes('*');
  }
}
