import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { HeurekaFeedMutationGuard } from './feed-mutation.guard';
import { FeedService } from './feed.service';

@Controller('products')
export class HeurekaProductsController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  async listProducts(@Query('included') included?: string) {
    const products = await this.feedService.listFeedProducts(included);
    return { success: true, data: products };
  }

  @Get(':productId/status')
  async getProductStatus(
    @Param('productId') productId: string,
    @Query('feedType') feedType: string = 'heureka_cz',
  ) {
    const status = await this.feedService.getProductFeedStatus(productId, feedType);
    return { success: true, data: status };
  }

  @Post(':productId/include')
  @UseGuards(HeurekaFeedMutationGuard)
  async includeProduct(
    @Param('productId') productId: string,
    @Body() body: { feedType?: string; requestedBy?: string; sourceHash?: string },
  ) {
    const result = await this.feedService.includeProductInFeed(productId, body?.feedType || 'heureka_cz', {
      requestedBy: body?.requestedBy,
      sourceHash: body?.sourceHash,
    });
    return { success: true, data: result };
  }

  @Delete(':productId/exclude')
  @UseGuards(HeurekaFeedMutationGuard)
  async excludeProduct(
    @Param('productId') productId: string,
    @Body() body: { feedType?: string; requestedBy?: string },
  ) {
    const result = await this.feedService.excludeProductFromFeed(productId, body?.feedType || 'heureka_cz', {
      requestedBy: body?.requestedBy,
    });
    return { success: true, data: result };
  }
}
