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
    return { success: true, data: await this.dashboardService.getSummary(req.user, feedType, req.headers.authorization) };
  }

  @Get('catalog-products')
  async products(
    @Req() req: any,
    @Query('search') search = '',
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('feedType') feedType = 'heureka_cz',
    @Query('feedStatus') feedStatus?: string,
    @Query('workflowStatus') workflowStatus?: string,
    @Query('gap') gap?: string,
    @Query('source') source?: string,
  ) {
    const result = await this.dashboardService.listProducts(req.user, {
      search,
      page: Number(page),
      limit: Number(limit),
      feedType,
      feedStatus,
      workflowStatus,
      gap,
      source,
    }, req.headers.authorization);
    return { success: true, data: result };
  }

  @Get('products/:productId')
  async product(@Req() req: any, @Param('productId') productId: string, @Query('feedType') feedType = 'heureka_cz') {
    return { success: true, data: await this.dashboardService.getProductDetail(req.user, productId, feedType, req.headers.authorization) };
  }

  @Put('products/:productId/listing')
  async updateListing(@Req() req: any, @Param('productId') productId: string, @Body() body: any) {
    return { success: true, data: await this.dashboardService.updateListing(req.user, productId, body || {}, req.headers.authorization) };
  }

  @Post('products/:productId/include')
  async includeProduct(@Req() req: any, @Param('productId') productId: string, @Body() body: { include?: boolean }) {
    return { success: true, data: await this.dashboardService.setProductIncluded(req.user, productId, body?.include !== false, req.headers.authorization) };
  }

  @Post('feed/regenerate')
  async regenerateFeed(@Req() req: any, @Body() body: { feedType?: string }) {
    return { success: true, data: await this.dashboardService.regenerateFeed(req.user, body?.feedType || 'heureka_cz') };
  }

  @Get('orders')
  async orders(@Req() req: any, @Query() query: Record<string, string>) {
    return { success: true, data: await this.dashboardService.listOrders(req.user, query) };
  }

  @Get('orders/:id')
  async order(@Req() req: any, @Param('id') id: string) {
    return { success: true, data: await this.dashboardService.getOrderDetail(req.user, id) };
  }

  @Get('feed/status')
  async feedStatus(@Req() req: any, @Query('feedType') feedType = 'heureka_cz') {
    return { success: true, data: await this.dashboardService.getDashboardFeedStatus(req.user, feedType) };
  }

  @Get('feed/history')
  async feedHistory(@Req() req: any, @Query('feedType') feedType = 'heureka_cz') {
    return { success: true, data: await this.dashboardService.getDashboardFeedHistory(req.user, feedType) };
  }

  @Get('feed/settings')
  async feedSettings(@Req() req: any, @Query('feedType') feedType = 'heureka_cz') {
    return { success: true, data: await this.dashboardService.getSettings(req.user, feedType) };
  }

  @Put('feed/settings')
  async updateFeedSettings(@Req() req: any, @Body() body: Record<string, unknown>) {
    return { success: true, data: await this.dashboardService.updateSettings(req.user, body || {}) };
  }

  @Get('operations')
  async operations(@Req() req: any, @Query('feedType') feedType = 'heureka_cz') {
    return { success: true, data: await this.dashboardService.getOperations(req.user, feedType, req.headers.authorization) };
  }

  @Get('operations/history')
  async operationsHistory(@Req() req: any, @Query('feedType') feedType = 'heureka_cz') {
    return { success: true, data: await this.dashboardService.getOperationsHistory(req.user, feedType) };
  }

  @Get('readiness/lanes')
  async readinessLanes(@Req() req: any, @Query('feedType') feedType = 'heureka_cz') {
    return { success: true, data: await this.dashboardService.getReadinessLanes(req.user, feedType, req.headers.authorization) };
  }

  @Get('settings')
  async settings(@Req() req: any, @Query('feedType') feedType = 'heureka_cz') {
    return { success: true, data: await this.dashboardService.getSettings(req.user, feedType) };
  }

  @Get('admin/registered-users')
  async adminUsers(@Req() req: any, @Query() query: Record<string, string>) {
    return { success: true, data: await this.dashboardService.getAdminUsers(req.user, req.headers.authorization, query) };
  }

  @Get('admin/stats')
  async adminStats(@Req() req: any) {
    return { success: true, data: await this.dashboardService.getAdminStats(req.user, req.headers.authorization) };
  }
}
