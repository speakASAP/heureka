import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FeedController } from './feed.controller';
import { HeurekaFeedMutationGuard } from './feed-mutation.guard';
import { HeurekaProductsController } from './products.controller';
import { FeedService } from './feed.service';
import { HeurekaAvailabilityReconciliationService } from './feed-availability-reconciliation.service';
import { PrismaModule } from '@heureka/shared';
import { ClientsModule } from '@heureka/shared';
import { HeurekaOperationsModule } from '../operations/operations.module';

@Module({
  imports: [PrismaModule, HttpModule, ClientsModule, HeurekaOperationsModule],
  controllers: [FeedController, HeurekaProductsController],
  providers: [FeedService, HeurekaFeedMutationGuard, HeurekaAvailabilityReconciliationService],
  exports: [FeedService, HeurekaAvailabilityReconciliationService],
})
export class FeedModule {}
