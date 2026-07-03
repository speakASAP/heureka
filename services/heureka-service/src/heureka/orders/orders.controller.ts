import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@heureka/shared';
import { HeurekaOrderIngestionGuard } from './order-ingestion.guard';
import { HeurekaOrdersService } from './orders.service';

@Controller('orders')
export class HeurekaOrdersController {
  constructor(private readonly ordersService: HeurekaOrdersService) {}

  @Post('ingest')
  @UseGuards(HeurekaOrderIngestionGuard)
  async ingestOrder(@Body() body: any) {
    const result = await this.ordersService.ingestOrder(body);
    return { success: true, data: result };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async listOrders(@Req() req: any, @Query('forwarded') forwarded?: string) {
    const orders = await this.ordersService.listOrders(req.user || {}, forwarded);
    return { success: true, data: orders };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getOrder(@Req() req: any, @Param('id') id: string) {
    const order = await this.ordersService.getOrder(req.user || {}, id);
    return { success: true, data: order };
  }
}
