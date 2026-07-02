import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import { createHash } from 'crypto';
import { LoggerService, PrismaService } from '../index';

const DEFAULT_ROUTING_KEYS = [
  'catalog.product.archived.v1',
  'catalog.product.deleted.v1',
  'catalog.product.inactive.v1',
  'catalog.product.sellability_changed.v1',
  'catalog.product.status_changed.v1',
  'catalog.product.updated.v1',
  'catalog.product.upserted.v1',
  'catalog.product.category_changed.v1',
];

const HEUREKA_EXTERNAL_FEED_BLOCKER = '[MISSING: confirmed Heureka feed approval/import removal behavior]';

type NonOfferableReason =
  | 'catalog_product_archived'
  | 'catalog_product_deleted'
  | 'catalog_product_inactive'
  | 'catalog_product_not_sellable';

@Injectable()
export class CatalogProductEventsSubscriber implements OnModuleInit, OnModuleDestroy {
  private connection: any = null;
  private channel: amqp.Channel | null = null;
  private readonly exchangeName = process.env.CATALOG_EVENTS_EXCHANGE || 'catalog.events';
  private readonly queueName = process.env.CATALOG_PRODUCT_EVENTS_QUEUE || 'catalog.heureka-service';
  private readonly routingKeys = this.parseRoutingKeys();

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
      this.logger.log(`Connecting to RabbitMQ Catalog events: ${url}`, 'CatalogProductEventsSubscriber');

      this.connection = await amqp.connect(url);
      const ch = await this.connection.createChannel();
      this.channel = ch as unknown as amqp.Channel;

      await this.channel.assertExchange(this.exchangeName, 'topic', { durable: true });
      await this.channel.assertQueue(this.queueName, { durable: true });
      for (const routingKey of this.routingKeys) {
        await this.channel.bindQueue(this.queueName, this.exchangeName, routingKey);
      }

      this.logger.log('Connected to RabbitMQ and subscribed to Catalog product events', {
        exchangeName: this.exchangeName,
        queueName: this.queueName,
        routingKeys: this.routingKeys,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to connect to Catalog product events: ${errorMessage}`, errorStack, 'CatalogProductEventsSubscriber');
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
            await this.handleCatalogProductEvent({ ...event, routingKey: msg.fields.routingKey || event?.routingKey });
            this.channel?.ack(msg);
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Error processing Catalog product event: ${errorMessage}`, errorStack, 'CatalogProductEventsSubscriber');
            this.channel?.nack(msg, false, false);
          }
        },
        { noAck: false },
      );

      this.logger.log('Subscribed to Catalog product events queue', 'CatalogProductEventsSubscriber');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to subscribe to Catalog product events: ${errorMessage}`, errorStack, 'CatalogProductEventsSubscriber');
    }
  }

  private async handleCatalogProductEvent(event: any) {
    const eventType = this.eventType(event);
    const productId = this.normalizeProductId(
      event?.catalogProductId
      ?? event?.productId
      ?? event?.payload?.catalogProductId
      ?? event?.payload?.productId
      ?? event?.aggregate?.id
      ?? event?.payload?.aggregate?.id
      ?? event?.data?.catalogProductId
      ?? event?.data?.productId
      ?? event?.data?.product?.catalogProductId
      ?? event?.data?.product?.id
      ?? event?.after?.id
      ?? event?.payload?.after?.id
      ?? event?.data?.after?.id,
    );

    if (!productId) {
      this.logger.warn('Ignoring Catalog product event without catalog product id', {
        eventType,
        eventId: event?.eventId || event?.id || null,
      });
      return;
    }

    const reason = this.nonOfferableReason(eventType, event);
    if (!reason) {
      this.logger.warn('Catalog product event is not applied to Heureka local state without a safe refresh policy', {
        eventType,
        productId,
        blocker: '[MISSING: safe catalog-event refresh policy]',
      });
      return;
    }

    await this.applyNonOfferableCatalogEvent(event, eventType, productId, reason);
  }

  private async applyNonOfferableCatalogEvent(event: any, eventType: string, productId: string, reason: NonOfferableReason) {
    const eventId = this.eventId(event, eventType, productId, reason);
    const receivedAt = new Date();
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
      action: 'catalog_product_availability_event_applied',
      status: 'excluded',
      productId,
      eventType,
      reason,
      requestSummary: { source: 'catalog-microservice' },
      responseSummary: { feedProductId: feedProduct?.id || null, offersUpdated: offerUpdate?.count ?? null },
      blockedReasons: [reason, HEUREKA_EXTERNAL_FEED_BLOCKER],
      completedAt: receivedAt,
    });

    this.logger.log('Heureka Catalog product availability event processed', {
      eventType,
      eventId,
      productId,
      reason,
      offersUpdated: offerUpdate?.count ?? null,
      externalBlocker: HEUREKA_EXTERNAL_FEED_BLOCKER,
    });
  }

  private async appendOperationEvent(input: {
    eventId: string;
    action: string;
    status: string;
    productId: string;
    eventType: string;
    reason: string;
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
          idempotencyKey: `catalog-availability:${input.eventId}:${input.productId}`.slice(0, 160),
          entityType: 'rabbitmq_consumer',
          entityId: input.eventId.slice(0, 120),
          productId: input.productId,
          requestSummary: { eventType: input.eventType, reason: input.reason, ...(input.requestSummary || {}) },
          responseSummary: input.responseSummary || {},
          blockedReasons: input.blockedReasons || [],
          errorSummary: `${input.eventType} excluded ${input.productId} from Heureka feed`,
          completedAt: input.completedAt,
        },
      });
    } catch (error: any) {
      if (String(error?.code || '') !== 'P2002') {
        this.logger.warn(`Heureka Catalog operation event append failed: ${error?.message || String(error)}`);
      }
    }
  }

  private nonOfferableReason(eventType: string, event: any): NonOfferableReason | null {
    if (eventType === 'catalog.product.deleted.v1') return 'catalog_product_deleted';
    if (eventType === 'catalog.product.archived.v1') return 'catalog_product_archived';
    if (eventType === 'catalog.product.inactive.v1') return 'catalog_product_inactive';
    if (eventType === 'catalog.product.sellability_changed.v1' && this.booleanFalse(this.afterSellable(event))) {
      return 'catalog_product_not_sellable';
    }

    const status = this.afterStatus(event);
    if (status === 'deleted') return 'catalog_product_deleted';
    if (status === 'archived') return 'catalog_product_archived';
    if (status === 'inactive') return 'catalog_product_inactive';
    if (this.booleanFalse(this.afterActive(event))) return 'catalog_product_inactive';
    if (this.booleanFalse(this.afterSellable(event))) return 'catalog_product_not_sellable';
    return null;
  }

  private eventType(event: any): string {
    return String(event?.type || event?.eventType || event?.name || event?.routingKey || '').trim();
  }

  private eventId(event: any, eventType: string, productId: string, reason: string): string {
    const id = String(event?.eventId || event?.id || '').trim();
    if (id) return id;
    return `catalog-availability-${createHash('sha256').update(`${eventType}:${productId}:${reason}`).digest('hex').slice(0, 32)}`;
  }

  private afterSellable(event: any): unknown {
    return event?.afterSellable
      ?? event?.sellable
      ?? event?.payload?.afterSellable
      ?? event?.payload?.sellable
      ?? event?.payload?.after?.sellable
      ?? event?.data?.afterSellable
      ?? event?.data?.sellable
      ?? event?.data?.change?.afterSellable
      ?? event?.data?.product?.sellable
      ?? event?.data?.product?.isSellable
      ?? (typeof event?.data?.product?.isActive === "boolean" ? event.data.product.isActive : undefined)
      ?? event?.data?.after?.sellable
      ?? event?.after?.sellable;
  }

  private afterActive(event: any): unknown {
    return event?.afterActive
      ?? event?.isActive
      ?? event?.active
      ?? event?.payload?.afterActive
      ?? event?.payload?.isActive
      ?? event?.payload?.active
      ?? event?.payload?.after?.isActive
      ?? event?.payload?.after?.active
      ?? event?.data?.afterActive
      ?? event?.data?.isActive
      ?? event?.data?.active
      ?? event?.data?.product?.isActive
      ?? event?.data?.product?.active
      ?? event?.data?.after?.isActive
      ?? event?.data?.after?.active
      ?? event?.after?.isActive
      ?? event?.after?.active;
  }

  private afterStatus(event: any): string {
    return String(
      event?.afterStatus
      ?? event?.status
      ?? event?.payload?.afterStatus
      ?? event?.payload?.status
      ?? event?.payload?.after?.status
      ?? event?.data?.afterStatus
      ?? event?.data?.status
      ?? event?.data?.change?.afterStatus
      ?? event?.data?.change?.afterLifecycle
      ?? event?.data?.product?.lifecycle
      ?? event?.data?.product?.status
      ?? event?.data?.after?.status
      ?? event?.after?.status
      ?? '',
    ).trim().toLowerCase();
  }

  private booleanFalse(value: unknown): boolean {
    if (value === false || value === 0) return true;
    const normalized = String(value).trim().toLowerCase();
    return normalized === 'false' || normalized === '0' || normalized === 'no';
  }

  private normalizeProductId(value: unknown): string {
    const productId = String(value || '').trim();
    return productId || '';
  }

  private parseRoutingKeys(): string[] {
    const configured = String(process.env.CATALOG_PRODUCT_EVENTS_ROUTING_KEYS || '').trim();
    if (!configured) return DEFAULT_ROUTING_KEYS;
    const keys = configured.split(',').map((key) => key.trim()).filter(Boolean);
    return keys.length > 0 ? keys : DEFAULT_ROUTING_KEYS;
  }
}
