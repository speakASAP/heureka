import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@heureka/shared';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('me')
  async me(@Req() req: any) {
    return { success: true, data: this.dashboardService.getCurrentUser(req.user) };
  }

  @Get('summary')
  async summary(@Req() req: any, @Query('feedType') feedType = 'heureka_cz') {
    return { success: true, data: await this.dashboardService.getSummary(req.user, feedType) };
  }

  @Get('products')
  async products(
    @Req() req: any,
    @Query('search') search = '',
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('feedType') feedType = 'heureka_cz',
  ) {
    const result = await this.dashboardService.listProducts(req.user, {
      search,
      page: Number(page),
      limit: Number(limit),
      feedType,
    });
    return { success: true, data: result };
  }

  @Get('products/:productId')
  async product(@Req() req: any, @Param('productId') productId: string, @Query('feedType') feedType = 'heureka_cz') {
    return { success: true, data: await this.dashboardService.getProductDetail(req.user, productId, feedType) };
  }

  @Put('products/:productId/listing')
  async updateListing(@Req() req: any, @Param('productId') productId: string, @Body() body: any) {
    return { success: true, data: await this.dashboardService.updateListing(req.user, productId, body || {}) };
  }

  @Post('products/:productId/include')
  async includeProduct(@Req() req: any, @Param('productId') productId: string, @Body() body: { include?: boolean }) {
    return { success: true, data: await this.dashboardService.setProductIncluded(req.user, productId, body?.include !== false) };
  }

  @Post('feed/regenerate')
  async regenerateFeed(@Req() req: any, @Body() body: { feedType?: string }) {
    return { success: true, data: await this.dashboardService.regenerateFeed(req.user, body?.feedType || 'heureka_cz') };
  }

  @Get('admin/users')
  async adminUsers(@Req() req: any, @Query() query: Record<string, string>) {
    return { success: true, data: await this.dashboardService.getAdminUsers(req.user, req.headers.authorization, query) };
  }

  @Get('admin/stats')
  async adminStats(@Req() req: any) {
    return { success: true, data: await this.dashboardService.getAdminStats(req.user, req.headers.authorization) };
  }
}
