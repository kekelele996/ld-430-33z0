import { Controller, Get } from '@nestjs/common';
import { ok } from '../utils/response';

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return ok({ status: 'ok', service: 'asset-library-api' });
  }
}
