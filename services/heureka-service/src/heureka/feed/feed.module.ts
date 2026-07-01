import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { FeedController } from './feed.controller';
import { HeurekaFeedMutationGuard } from './feed-mutation.guard';
import { HeurekaProductsController } from './products.controller';
import { FeedService } from './feed.service';
import { PrismaModule } from '@heureka/shared';
import { ClientsModule } from '@heureka/shared';

@Module({
  imports: [PrismaModule, HttpModule, ClientsModule],
  controllers: [FeedController, HeurekaProductsController],
  providers: [FeedService, HeurekaFeedMutationGuard],
  exports: [FeedService],
})
export class FeedModule {}
