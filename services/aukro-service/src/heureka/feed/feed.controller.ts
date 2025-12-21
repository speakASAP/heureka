import { Controller, Get, Post, Query, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { FeedService } from './feed.service';

@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  async getFeed(@Query('type') type: string = 'heureka_cz', @Res() res: Response) {
    try {
      const xml = await this.feedService.generateFeed(type);
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.send(xml);
    } catch (error: any) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  @Get('download')
  async downloadFeed(@Query('type') type: string = 'heureka_cz', @Res() res: Response) {
    try {
      const xml = await this.feedService.generateFeed(type);
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="heureka-${type}.xml"`);
      res.send(xml);
    } catch (error: any) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  @Post('regenerate')
  async regenerateFeed(@Query('type') type: string = 'heureka_cz') {
    const xml = await this.feedService.regenerateFeed(type);
    return {
      success: true,
      message: 'Feed regenerated successfully',
      feedLength: xml.length,
    };
  }

  @Get('history')
  async getHistory(@Query('type') type?: string) {
    const history = await this.feedService.getFeedHistory(type);
    return {
      success: true,
      data: history,
    };
  }
}

