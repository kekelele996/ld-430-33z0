import { BadRequestException, Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class ValidationMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.is('application/json') && req.body == null) {
      throw new BadRequestException('请求体不能为空');
    }
    next();
  }
}
