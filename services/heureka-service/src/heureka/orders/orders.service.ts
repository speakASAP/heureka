import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { CatalogClientService, LoggerService, OrderClientService, PrismaService, WarehouseClientService } from '@heureka/shared';
import { HeurekaOperationEventService } from '../operations/operation-event.service';

const CHANNEL = 'heureka';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEUREKA_ORDER_READ_ADMIN_ROLES = new Set([
  'global:superadmin',
  'global:platform_admin',
  'app:heureka-service:admin',
  'app:heureka:admin',
  'heureka:admin',
]);

type OrdersReadActor = { roles?: string[] | null };

@Injectable()
export class HeurekaOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderClient: OrderClientService,
    private readonly catalogClient: CatalogClientService,
    private readonly warehouseClient: WarehouseClientService,
    private readonly logger: LoggerService,
    @Optional() private readonly operationEvents?: HeurekaOperationEventService,
  ) {
    this.logger.setContext('HeurekaOrdersService');
  }

  async ingestOrder(input: any) {
    const request = await this.normalizeRequest(input);
    const account = await this.resolveAccount(request.accountId, request.channelAccountId);
    const existing = await this.prisma.heurekaOrder.findFirst({
      where: { accountId: account.id, heurekaOrderId: request.externalOrderId },
      orderBy: { createdAt: 'desc' },
    });
    if (existing?.forwarded && existing.orderId) {
      await this.operationEvents?.append({
        action: 'order_forward_replayed',
        entityType: 'orders_service',
        entityId: existing.id,
        status: existing.status || request.status,
        externalId: request.externalOrderId,
        errorSummary: `Heureka order replayed with existing central order`,
        responseSummary: { centralOrderId: existing.orderId, itemCount: request.items.length },
      });
      return this.toResponse(existing, { forwarded: true, orderId: existing.orderId, replay: true, itemCount: request.items.length });
    }

    const localOrder = existing || await this.prisma.heurekaOrder.create({
      data: {
        accountId: account.id,
        heurekaOrderId: request.externalOrderId,
        customerEmail: request.customer?.email || null,
        customerPhone: request.customer?.phone || null,
        total: request.totals.total,
        currency: request.totals.currency,
        status: request.status,
        forwarded: false,
      },
    });

    if (!existing) {
      await this.operationEvents?.append({
        action: 'order_received',
        entityType: 'orders_service',
        entityId: localOrder.id,
        status: request.status,
        externalId: request.externalOrderId,
        errorSummary: `Heureka order received`,
        accountId: account.id,
        requestSummary: { itemCount: request.items.length, total: request.totals.total, currency: request.totals.currency },
      });
    }

    const centralOrder = await this.orderClient.createOrder({
      channel: CHANNEL,
      externalOrderId: request.externalOrderId,
      channelAccountId: request.channelAccountId || account.id,
      orderedAt: request.orderedAt ? new Date(request.orderedAt) : undefined,
      status: request.status,
      customer: request.customer,
      shippingAddress: request.shippingAddress,
      billingAddress: request.billingAddress,
      items: request.items,
      totals: request.totals,
      payment: request.payment,
      shipping: request.shipping,
      customerNote: request.customerNote,
    });

    const updated = await this.prisma.heurekaOrder.update({
      where: { id: localOrder.id },
      data: {
        orderId: centralOrder.id,
        forwarded: true,
        status: request.status,
        total: request.totals.total,
        currency: request.totals.currency,
        customerEmail: request.customer?.email || null,
        customerPhone: request.customer?.phone || null,
      },
    });

    this.logger.log('Heureka order forwarded to orders-microservice', {
      heurekaOrderId: request.externalOrderId,
      centralOrderId: centralOrder.id,
      itemCount: request.items.length,
    });
    await this.operationEvents?.append({
      action: 'order_forwarded',
      entityType: 'orders_service',
      entityId: updated.id,
      status: updated.status,
      externalId: request.externalOrderId,
      errorSummary: `Heureka order forwarded to orders-microservice`,
      accountId: account.id,
      responseSummary: { centralOrderId: centralOrder.id, itemCount: request.items.length, total: request.totals.total, currency: request.totals.currency },
    });
    return this.toResponse(updated, { forwarded: true, orderId: centralOrder.id, replay: false, itemCount: request.items.length });
  }

  async listOrders(actor: OrdersReadActor, forwarded?: string) {
    this.assertOrderReadAdmin(actor);
    return this.prisma.heurekaOrder.findMany({
      where: forwarded === undefined ? undefined : { forwarded: forwarded === 'true' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getOrder(actor: OrdersReadActor, id: string) {
    this.assertOrderReadAdmin(actor);
    const order = await this.prisma.heurekaOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`Heureka order ${id} not found`);
    return order;
  }

  private assertOrderReadAdmin(actor: OrdersReadActor): void {
    const roles = Array.isArray(actor?.roles) ? actor.roles : [];
    if (!roles.some((role) => HEUREKA_ORDER_READ_ADMIN_ROLES.has(role))) {
      throw new ForbiddenException("Heureka order read requires admin role");
    }
  }

  private async normalizeRequest(input: any) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new BadRequestException('Heureka order ingestion body must be an object');
    }
    const externalOrderId = this.requireString(input.externalOrderId || input.heurekaOrderId, 'externalOrderId');
    const channelAccountId = this.optionalString(input.channelAccountId || input.account?.channelAccountId || input.account?.id);
    const accountId = this.optionalString(input.accountId || input.account?.id);
    const status = this.optionalString(input.status) || 'pending';
    if (!['pending', 'confirmed'].includes(status)) {
      throw new BadRequestException('Heureka order status must be pending or confirmed at ingestion');
    }
    const orderedAt = this.normalizeOrderedAt(input.orderedAt || input.createdAt || input.paidAt);
    const items = await this.normalizeItems(input.items || input.lines || []);
    const totals = this.normalizeTotals(input.totals, input, items);

    return {
      externalOrderId,
      accountId,
      channelAccountId,
      status,
      orderedAt,
      customer: this.normalizeCustomer(input.customer),
      shippingAddress: this.normalizeAddress(input.shippingAddress || input.deliveryAddress),
      billingAddress: this.normalizeAddress(input.billingAddress),
      items,
      totals,
      payment: { method: this.optionalString(input.payment?.method || input.paymentMethod || 'heureka'), status: this.optionalString(input.payment?.status || input.paymentStatus || 'pending') },
      shipping: { method: this.optionalString(input.shipping?.method || input.shippingMethod || 'heureka') },
      customerNote: this.optionalString(input.notes?.customerNote || input.customerNote),
    };
  }

  private async resolveAccount(accountId?: string, channelAccountId?: string) {
    if (accountId && UUID_PATTERN.test(accountId)) {
      const account = await this.prisma.heurekaAccount.findUnique({ where: { id: accountId } });
      if (account) return account;
      throw new BadRequestException(`Heureka account ${accountId} not found`);
    }

    if (channelAccountId) {
      const account = await this.prisma.heurekaAccount.findFirst({ where: { name: channelAccountId } });
      if (account) return account;
    }

    const defaultAccount = await this.prisma.heurekaAccount.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
    if (!defaultAccount) {
      throw new BadRequestException('[MISSING: Heureka account mapping] No active Heureka account is available for order ingestion');
    }
    return defaultAccount;
  }

  private async normalizeItems(rawItems: any[]) {
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw new BadRequestException('Heureka order items must contain at least one line');
    }

    const items = [];
    for (const [index, item] of rawItems.entries()) {
      const resolved = await this.resolveCatalogProductId(item, index);
      const catalogProduct = await this.catalogClient.getProductById(resolved.productId);
      const quantity = this.positiveInteger(item.quantity ?? item.count ?? 1, `items[${index}].quantity`);
      const unitPrice = this.nonNegativeMoney(item.unitPrice ?? item.price ?? resolved.unitPrice ?? 0, `items[${index}].unitPrice`);
      const totalPrice = this.nonNegativeMoney(item.totalPrice ?? item.total ?? unitPrice * quantity, `items[${index}].totalPrice`);
      const warehouseId = await this.resolveWarehouseId(item, index, resolved.productId, quantity);
      items.push({
        productId: resolved.productId,
        sku: this.optionalString(item.sku || catalogProduct?.sku),
        title: this.requireString(item.title || item.name || resolved.title || catalogProduct?.title || catalogProduct?.name, `items[${index}].title`),
        quantity,
        unitPrice,
        totalPrice,
        warehouseId,
      });
    }
    return items;
  }

  private async resolveWarehouseId(item: any, index: number, productId: string, quantity: number): Promise<string> {
    const requestedWarehouseId = this.optionalString(item?.warehouseId);
    const stockRows = await this.warehouseClient.getStockByProduct(productId);
    const reservableRoutes = stockRows
      .map((row: any) => ({
        warehouseId: this.optionalString(row?.warehouseId || row?.warehouse?.id),
        available: Number(row?.available),
      }))
      .filter((row: { warehouseId?: string; available: number }) => row.warehouseId && Number.isFinite(row.available) && row.available >= quantity);

    if (requestedWarehouseId) {
      const matchingRoute = reservableRoutes.find((row) => row.warehouseId === requestedWarehouseId);
      if (matchingRoute) return matchingRoute.warehouseId as string;
      throw new BadRequestException(`[MISSING: warehouseId] items[${index}] warehouseId does not match a Warehouse route with enough available stock for product ${productId}`);
    }

    if (reservableRoutes.length === 1) {
      return reservableRoutes[0].warehouseId as string;
    }

    if (reservableRoutes.length > 1) {
      throw new BadRequestException(`[MISSING: warehouseId] items[${index}] has multiple Warehouse routes with available stock for product ${productId}; provide canonical warehouseId`);
    }

    throw new BadRequestException(`[MISSING: warehouseId] items[${index}] has no Warehouse route with enough available stock for product ${productId}`);
  }

  private async resolveCatalogProductId(item: any, index: number): Promise<{ productId: string; title?: string; unitPrice?: number }> {
    const directProductId = this.optionalString(item?.catalogProductId || item?.productId);
    if (directProductId) {
      if (!UUID_PATTERN.test(directProductId)) {
        throw new BadRequestException(`[MISSING: catalogProductId] items[${index}] productId must be a canonical Catalog UUID, not a channel-local ID`);
      }
      return { productId: directProductId };
    }

    const offerId = this.optionalString(item?.offerId || item?.heurekaOfferId || item?.itemId);
    if (!offerId) {
      throw new BadRequestException(`[MISSING: catalogProductId] items[${index}] must include catalogProductId/productId or a mapped Heureka offerId`);
    }
    if (!UUID_PATTERN.test(offerId)) {
      throw new BadRequestException(`[MISSING: catalogProductId] items[${index}] offerId must reference a local Heureka offer UUID with a Catalog product mapping`);
    }

    const offer = await this.prisma.heurekaOffer.findUnique({ where: { id: offerId } });
    if (!offer?.productId) {
      throw new BadRequestException(`[MISSING: catalogProductId] Heureka offer ${offerId} has no Catalog product mapping`);
    }
    return { productId: offer.productId, title: offer.title || undefined, unitPrice: offer.price === null || offer.price === undefined ? undefined : Number(offer.price) };
  }

  private normalizeTotals(rawTotals: any, input: any, items: Array<{ totalPrice: number }>) {
    const subtotal = this.nonNegativeMoney(rawTotals?.subtotal ?? input.subtotal ?? items.reduce((sum, item) => sum + item.totalPrice, 0), 'totals.subtotal');
    const shippingCost = this.nonNegativeMoney(rawTotals?.shippingCost ?? input.shippingCost ?? 0, 'totals.shippingCost');
    const taxAmount = this.nonNegativeMoney(rawTotals?.taxAmount ?? input.taxAmount ?? 0, 'totals.taxAmount');
    const total = this.nonNegativeMoney(rawTotals?.total ?? input.total ?? subtotal + shippingCost + taxAmount, 'totals.total');
    const currency = this.requireString(rawTotals?.currency || input.currency || 'CZK', 'totals.currency').toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) throw new BadRequestException('totals.currency must be an ISO 4217 three-letter currency code');
    return { subtotal, shippingCost, taxAmount, total, currency };
  }

  private normalizeCustomer(customer: any) {
    if (!customer || typeof customer !== 'object') return undefined;
    return {
      name: this.optionalString(customer.name || [customer.firstName, customer.lastName].filter(Boolean).join(' ')),
      email: this.optionalString(customer.email),
      phone: this.optionalString(customer.phone),
    };
  }

  private normalizeAddress(address: any) {
    if (!address || typeof address !== 'object') return undefined;
    return {
      name: this.optionalString(address.name),
      street: this.optionalString(address.street || address.addressLine1),
      city: this.optionalString(address.city),
      postalCode: this.optionalString(address.postalCode || address.zip),
      country: this.optionalString(address.country || 'CZ'),
    };
  }

  private normalizeOrderedAt(value: unknown): string | undefined {
    const raw = this.optionalString(value);
    if (!raw) return undefined;
    const date = new Date(raw);
    if (Number.isNaN(date.valueOf())) throw new BadRequestException('orderedAt must be a valid ISO timestamp');
    return date.toISOString();
  }

  private requireString(value: unknown, field: string): string {
    const normalized = this.optionalString(value);
    if (!normalized) throw new BadRequestException(`${field} is required`);
    return normalized;
  }

  private optionalString(value: unknown): string | undefined {
    if (value === undefined || value === null) return undefined;
    const normalized = String(value).trim();
    return normalized || undefined;
  }

  private positiveInteger(value: unknown, field: string): number {
    const numeric = Number(value);
    if (!Number.isInteger(numeric) || numeric <= 0) throw new BadRequestException(`${field} must be a positive integer`);
    return numeric;
  }

  private nonNegativeMoney(value: unknown, field: string): number {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) throw new BadRequestException(`${field} must be a non-negative number`);
    return Math.round(numeric * 100) / 100;
  }

  private toResponse(order: any, forwarding: { forwarded: boolean; orderId?: string; replay: boolean; itemCount: number }) {
    return {
      id: order.id,
      channel: CHANNEL,
      externalOrderId: order.heurekaOrderId,
      channelAccountId: order.accountId,
      orderId: order.orderId || forwarding.orderId || null,
      forwarded: Boolean(order.forwarded || forwarding.forwarded),
      status: order.status,
      total: Number(order.total),
      currency: order.currency,
      forwarding,
    };
  }
}
