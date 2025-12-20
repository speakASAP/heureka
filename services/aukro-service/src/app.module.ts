/**
 * Aukro Service App Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { AukroModule } from './heureka/heureka.module';
import { PrismaModule, LoggerModule, HealthModule, RabbitMQModule } from '@heureka/shared';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(process.cwd(), '../../.env'),
    }),
    PrismaModule,
    LoggerModule,
    HealthModule,
    RabbitMQModule,
    AukroModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

