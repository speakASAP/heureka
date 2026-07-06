import { Controller, Get } from '@nestjs/common';
import { BusinessHealthService } from './business-health.service';
import { HeurekaChannelReadbackBusinessHealthEnvelope } from './business-health.types';

@Controller('business-health')
export class BusinessHealthController {
  constructor(private readonly businessHealthService: BusinessHealthService) {}

  @Get('channel-readback')
  getChannelReadback(): HeurekaChannelReadbackBusinessHealthEnvelope {
    return this.businessHealthService.getChannelReadbackEnvelope();
  }
}
