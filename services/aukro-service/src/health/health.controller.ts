/**
 * Health Controller
 */

import { Controller, Get } from '@nestjs/common';
import { HealthService } from '@heureka/shared';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth() {
    return this.healthService.getHealthStatus('heureka-service');
  }
}

