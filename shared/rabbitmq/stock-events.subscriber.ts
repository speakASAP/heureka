import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';
import { createHash } from 'crypto';
import { LoggerService, PrismaService } from '../index';

const HEUREKA_EXTERNAL_FEED_BLOCKER = '[MISSING: confirmed Heureka feed approval/import removal behavior]';

@Injectable()
export class StockEventsSubscriber implements OnModuleInit, OnModuleDestroy {
  private connection: any = null;
  private channel: amqp.Channel | null = null;
  private readonly exchangeName = 'stock.events';
  private readonly queueName = 'stock.heureka-service';

  constructor(
    private readonly logger: LoggerService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.connect();
    await this.subscribe();
  }

  async onModuleDestroy() {
    try {
      if (this.channel) await (this.channel as any).close();
      if (this.connection) await this.connection.close();
    } catch {
      // Ignore shutdown errors.
    }
  }

  private async connect() {
    try {
      const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';
      this.logger.log(`Connecting to RabbitMQ: ${url}`, 'StockEventsSubscriber');

      this.connection = await amqp.connect(url);
      const ch = await this.connection.createChannel();
      this.channel = ch as unknown as amqp.Channel;

      await this.channel.assertExchange(this.exchangeName, 'topic', { durable: true });
      await this.channel.assertQueue(this.queueName, { durable: true });
      await this.channel.bindQueue(this.queueName, this.exchangeName, 'stock.#');

      this.logger.log('Connected to RabbitMQ and subscribed to stock events', 'StockEventsSubscriber');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to connect to RabbitMQ: ${errorMessage}`, errorStack, 'StockEventsSubscriber');
    }
  }

  private async subscribe() {
    if (!this.channel) return;

    try {
      await this.channel.consume(
        this.queueName,
        async (msg) => {
          if (!msg) return;

          try {
            const event = JSON.parse(msg.content.toString());
            await this.handleStockEvent({ ...event, routingKey: msg.fields.routingKey || event?.routingKey });
            this.channel?.ack(msg);
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Error processing stock event: ${errorMessage}`, errorStack, 'StockEventsSubscriber');
            this.channel?.nack(msg, false, false);
          }
        },
        { noAck: false },
      );

      this.logger.log('Subscribed to stock events queue', 'StockEventsSubscriber');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to subscribe to stock events: ${errorMessage}`, errorStack, 'StockEventsSubscriber');
    }
  }

  private async handleStockEvent(event: any) {
    const eventType = this.eventType(event);
    const productId = this.normalizeProductId(event?.productId ?? event?.catalogProductId ?? event?.payload?.productId ?? event?.data?.productId);

    if (!productId) {
      this.logger.warn('Ignoring Warehouse stock event without productId', {
        eventType,
        eventId: event?.id || event?.eventId || null,
      });
      return;
    }

    switch (eventType) {
      case 'stock.updated':
        await this.applyWarehouseStockEvent(event, productId, this.normalizeQuantity(event?.available ?? event?.payload?.available ?? event?.data?.available), 'stock.updated');
        break;
      case 'stock.out':
        await this.applyWarehouseStockEvent(event, productId, 0, 'stock.out');
        break;
      case 'stock.low':
        this.logger.warn(`Low stock alert for product ${productId}: ${event?.available} available`, 'StockEventsSubscriber');
        break;
      default:
        this.logger.warn('Ignoring unsupported Warehouse stock event type', { eventType, productId });
    }
  }

  private async applyWarehouseStockEvent(event: any, productId: string, targetQuantity: number, eventType: 'stock.updated' | 'stock.out') {
    const eventId = this.eventId(event, eventType, productId, String(targetQuantity));
    const receivedAt = new Date();

    if (targetQuantity <= 0) {
      const feedProduct = await this.prisma.heurekaProduct.upsert({
        where: { productId },
        create: { productId, isIncluded: false },
        update: { isIncluded: false },
      });
      const offerUpdate = await this.prisma.heurekaOffer.updateMany({
        where: { productId },
        data: { stockQuantity: 0, isActive: false },
      });
      await this.appendOperationEvent({
        eventId,
        action: 'warehouse_stock_event_applied',
        status: 'excluded',
        productId,
        eventType,
        idempotencyPrefix: 'warehouse-stock',
        requestSummary: { targetQuantity, source: 'warehouse-microservice' },
        responseSummary: { feedProductId: feedProduct?.id || null, offersUpdated: offerUpdate?.count ?? null },
        blockedReasons: [HEUREKA_EXTERNAL_FEED_BLOCKER],
        completedAt: receivedAt,
      });
      this.logger.log('Heureka zero-stock event excluded product from feed and offers', {
        eventType,
        eventId,
        productId,
        offersUpdated: offerUpdate?.count ?? null,
        externalBlocker: HEUREKA_EXTERNAL_FEED_BLOCKER,
      });
      return;
    }

    const offerUpdate = await this.prisma.heurekaOffer.updateMany({
      where: { productId },
      data: { stockQuantity: targetQuantity },
    });
    this.logger.log('Heureka Warehouse stock cache refreshed without re-including feed product', {
      eventType,
      eventId,
      productId,
      targetQuantity,
      offersUpdated: offerUpdate?.count ?? null,
      refreshPolicy: '[MISSING: safe catalog-event refresh policy]',
    });
  }

  private async appendOperationEvent(input: {
    eventId: string;
    action: string;
    status: string;
    productId: string;
    eventType: string;
    idempotencyPrefix: string;
    requestSummary?: Record<string, any>;
    responseSummary?: Record<string, any>;
    blockedReasons?: unknown[];
    completedAt: Date;
  }) {
    const client = (this.prisma as any).heurekaOperationEvent;
    if (!client) return;
    try {
      await client.create({
        data: {
          feedType: 'heureka_cz',
          action: input.action,
          status: input.status,
          idempotencyKey: `${input.idempotencyPrefix}:${input.eventId}:${input.productId}`.slice(0, 160),
          entityType: 'rabbitmq_consumer',
          entityId: input.eventId.slice(0, 120),
          productId: input.productId,
          requestSummary: { eventType: input.eventType, ...(input.requestSummary || {}) },
          responseSummary: input.responseSummary || {},
          blockedReasons: input.blockedReasons || [],
          errorSummary: `${input.eventType} applied for ${input.productId}`,
          completedAt: input.completedAt,
        },
      });
    } catch (error: any) {
      if (String(error?.code || '') !== 'P2002') {
        this.logger.warn(`Heureka stock operation event append failed: ${error?.message || String(error)}`);
      }
    }
  }

  private eventType(event: any): string {
    return String(event?.type || event?.eventType || event?.routingKey || '').trim();
  }

  private eventId(event: any, eventType: string, productId: string, value: string): string {
    const id = String(event?.eventId || event?.id || '').trim();
    if (id) return id;
    return `warehouse-stock-${createHash('sha256').update(`${eventType}:${productId}:${value}`).digest('hex').slice(0, 32)}`;
  }

  private normalizeProductId(value: unknown): string {
    const productId = String(value || '').trim();
    return productId || '';
  }

  private normalizeQuantity(value: unknown): number {
    const quantity = Number(value);
    if (!Number.isFinite(quantity) || quantity <= 0) return 0;
    return Math.floor(quantity);
  }
}
