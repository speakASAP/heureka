/**
 * Heureka Module
 */

import { Module } from '@nestjs/common';
import { AccountsModule } from './accounts/accounts.module';
import { OffersModule } from './offers/offers.module';
import { OrdersModule } from './orders/orders.module';
import { FeedModule } from '../heureka/feed/feed.module';

@Module({
  imports: [AccountsModule, OffersModule, OrdersModule, FeedModule],
})
export class AukroModule {}

