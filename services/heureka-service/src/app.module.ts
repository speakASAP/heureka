/**
 * Heureka feed worker (XML feeds, stock sync for Heureka catalog)
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { FeedModule } from './heureka/feed/feed.module';
import { HeurekaOrdersModule } from './heureka/orders/orders.module';
import { PublicController } from './public/public.controller';
import { DashboardModule } from './heureka/dashboard/dashboard.module';
import { PrismaModule, LoggerModule, HealthModule, RabbitMQModule } from '@heureka/shared';
import { HealthController } from './health/health.controller';
import { CredentialSelfReporter } from './health/credential-self-reporter';
import { BusinessHealthModule } from './business-health/business-health.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
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
    DashboardModule,
    BusinessHealthModule,
  ],
  controllers: [HealthController, PublicController],
  providers: [CredentialSelfReporter],
})
export class AppModule {}
