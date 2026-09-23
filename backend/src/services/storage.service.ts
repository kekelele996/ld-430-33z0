import { Injectable, OnModuleInit } from '@nestjs/common';
import * as Minio from 'minio';
import { minioConfig } from '../config/minio.config';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly config = minioConfig();
  private readonly client = new Minio.Client(this.config);

  async onModuleInit() {
    try {
      const exists = await this.client.bucketExists(this.config.bucket);
      if (!exists) await this.client.makeBucket(this.config.bucket);
    } catch {
      // Local development can still use metadata APIs when MinIO is unavailable.
    }
  }

  presignedUploadUrl(fileName: string) {
    return `http://${this.config.endPoint}:9000/${this.config.bucket}/${encodeURIComponent(fileName)}`;
  }
}
