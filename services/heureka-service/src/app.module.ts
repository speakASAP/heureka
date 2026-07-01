/**
 * Heureka feed worker (XML feeds, stock sync for Heureka catalog)
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { FeedModule } from './heureka/feed/feed.module';
import { HeurekaOrdersModule } from './heureka/orders/orders.module';
import { PublicController } from './public/public.controller';
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
    FeedModule,
    HeurekaOrdersModule,
  ],
  controllers: [HealthController, PublicController],
})
export class AppModule {}
