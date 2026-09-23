import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { UserRole } from '../types/enums';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: Request & { user?: { id: string; role: UserRole; canDownloadCommercial?: boolean } }, _res: Response, next: NextFunction) {
    const roleHeader = req.header('x-user-role') as UserRole | undefined;
    req.user = {
      id: req.header('x-user-id') ?? 'demo-user',
      role: roleHeader && Object.values(UserRole).includes(roleHeader) ? roleHeader : UserRole.Admin,
      canDownloadCommercial: req.header('x-commercial-access') === 'true',
    };
    next();
  }
}
