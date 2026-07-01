import { Body, Controller, Get, Param, Post, Query, Res, HttpStatus, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { FeedService } from './feed.service';
import { HeurekaFeedMutationGuard } from './feed-mutation.guard';

@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  async getFeed(@Query('type') type: string = 'heureka_cz', @Res() res: Response) {
    try {
      const result = await this.feedService.generateFeedWithLifecycle(type);
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('X-Heureka-Feed-Status', result.validation.status);
      res.setHeader('X-Heureka-Feed-Generation-Ms', String(result.validation.generationMs));
      res.setHeader('X-Heureka-Feed-Snapshot-Hash', result.validation.snapshotHash);
      res.send(result.xml);
    } catch (error: any) {
      const status = typeof error.getStatus === 'function' ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
      res.status(status).json({ success: false, message: error.response?.message || error.message, validation: error.response?.validation });
    }
  }

  @Get('preview')
  async previewFeed(@Query('type') type: string = 'heureka_cz', @Res() res: Response) {
    try {
      const result = await this.feedService.previewFeed(type);
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('X-Heureka-Feed-Status', result.validation.status);
      res.setHeader('X-Heureka-Feed-Generation-Ms', String(result.validation.generationMs));
      res.setHeader('X-Heureka-Feed-Snapshot-Hash', result.validation.snapshotHash);
      res.setHeader('X-Heureka-Feed-Read-Only', 'true');
      res.send(result.xml);
    } catch (error: any) {
      const status = typeof error.getStatus === 'function' ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
      res.status(status).json({ success: false, message: error.response?.message || error.message, validation: error.response?.validation });
    }
  }

  @Get('download')
  async downloadFeed(@Query('type') type: string = 'heureka_cz', @Res() res: Response) {
    try {
      const result = await this.feedService.generateFeedWithLifecycle(type);
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="heureka-${type}.xml"`);
      res.setHeader('X-Heureka-Feed-Status', result.validation.status);
      res.setHeader('X-Heureka-Feed-Generation-Ms', String(result.validation.generationMs));
      res.setHeader('X-Heureka-Feed-Snapshot-Hash', result.validation.snapshotHash);
      res.send(result.xml);
    } catch (error: any) {
      const status = typeof error.getStatus === 'function' ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
      res.status(status).json({ success: false, message: error.response?.message || error.message, validation: error.response?.validation });
    }
  }

  @Post('regenerate')
  @UseGuards(HeurekaFeedMutationGuard)
  async regenerateFeed(@Query('type') type: string = 'heureka_cz') {
    const result = await this.feedService.regenerateFeedWithLifecycle(type);
    return { success: true, message: 'Feed regenerated successfully', feedLength: result.xml.length, validation: result.validation };
  }

  @Get('history')
  async getHistory(@Query('type') type?: string) {
    const history = await this.feedService.getFeedHistory(type);
    return { success: true, data: history };
  }

  @Get('status')
  async getStatus(@Query('type') type: string = 'heureka_cz') {
    const status = await this.feedService.getFeedStatus(type);
    return { success: true, data: status };
  }

  @Get('readiness/products/:productId')
  async getProductReadiness(@Param('productId') productId: string, @Query('feedType') feedType: string = 'heureka_cz') {
    const readiness = await this.feedService.getProductFeedReadiness(productId, feedType);
    return { success: true, data: readiness };
  }

  @Post('readiness/bulk')
  async getBulkReadiness(@Body() body: { feedType?: string; productIds?: unknown }) {
    const readiness = await this.feedService.getBulkFeedReadiness(body?.productIds, body?.feedType || "heureka_cz");
    return { success: true, data: readiness };
  }
}
