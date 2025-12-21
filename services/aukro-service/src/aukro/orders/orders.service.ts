import { Injectable } from '@nestjs/common';
import { PrismaService, LoggerService, OrderClientService } from '@heureka/shared';

@Injectable()
export class OrdersService {
  private readonly logger: LoggerService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderClient: OrderClientService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService;
    this.logger.setContext('OrdersService');
  }

  async findAll(query: any) {
    return this.prisma.heurekaOrder.findMany({
      where: {
        accountId: query.accountId,
        status: query.status,
        forwarded: query.forwarded !== undefined ? query.forwarded === 'true' : undefined,
      },
      include: {
        account: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.heurekaOrder.findUnique({
      where: { id },
      include: { account: true },
    });
  }

  async create(data: any) {
    const order = await this.prisma.heurekaOrder.create({
      data,
    });

    // Forward to orders-microservice
    try {
      const centralOrder = await this.orderClient.createOrder({
        externalOrderId: order.heurekaOrderId,
        channel: 'heureka',
        channelAccountId: order.accountId,
        customer: {
          email: order.customerEmail,
          phone: order.customerPhone,
        },
        items: [], // TODO: Parse from Aukro order data
        subtotal: Number(order.total),
        shippingCost: 0,
        taxAmount: 0,
        total: Number(order.total),
        currency: order.currency,
        orderedAt: order.createdAt,
      });

      await this.prisma.heurekaOrder.update({
        where: { id: order.id },
        data: {
          orderId: centralOrder.id,
          forwarded: true,
        },
      });

      this.logger.log(`Order ${order.id} forwarded to orders-microservice: ${centralOrder.id}`);
    } catch (error: any) {
      this.logger.error(`Failed to forward order to orders-microservice: ${error.message}`);
    }

    return order;
  }

  async handleWebhook(data: any) {
    // TODO: Implement Aukro webhook handler
    this.logger.log('Webhook handler not yet implemented');
    return { message: 'Webhook handler not yet implemented' };
  }
}

