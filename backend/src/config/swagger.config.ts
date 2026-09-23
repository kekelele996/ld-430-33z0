import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('数字素材库与共享 API')
  .setDescription('素材上传、分类、搜索、标签、下载和权限共享的 RESTful API')
  .setVersion('1.0.0')
  .addBearerAuth()
  .build();
