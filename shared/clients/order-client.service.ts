import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from '../logger/logger.service';

const CREATE_ORDER_CONTRACT_VERSION = 'orders.create.v1';
const DEFAULT_CHANNEL_ACCOUNT_ID = 'heureka-default';
export const ORDER_IDEMPOTENCY_CONFLICT = 'ORDER_IDEMPOTENCY_CONFLICT';
export const ORDER_LIFECYCLE_READ_CONTRACT_MISSING = '[MISSING: Orders lifecycle read contract/client method]';

export type OrderReadResult = {
  available: boolean;
  stale: boolean;
  order: any | null;
  missing: string[];
  httpStatus?: number;
  errorSummary?: string;
  reason?: string;
};

interface CreateCentralOrderRequest {
  externalOrderId: string;
  channel: string;
  channelAccountId?: string;
  orderedAt?: Date | string;
  status?: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  shippingAddress?: {
    name?: string;
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  billingAddress?: {
    name?: string;
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  items: Array<{
    productId: string;
    sku?: string;
    title: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    warehouseId?: string;
  }>;
  totals?: {
    subtotal: number;
    shippingCost?: number;
    taxAmount?: number;
    total: number;
    currency: string;
  };
  payment?: {
    method?: string;
    status?: string;
  };
  shipping?: {
    method?: string;
  };
  subtotal?: number;
  shippingCost?: number;
  taxAmount?: number;
  total?: number;
  currency?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  shippingMethod?: string;
  customerNote?: string;
}

type CreateCentralOrderPayload = Omit<CreateCentralOrderRequest, 'orderedAt'> & {
  contractVersion: string;
  orderedAt?: string;
};

/**
 * API client for orders-microservice.
 * Sends the Orders create contract idempotency fields and runtime service credentials.
 */
@Injectable()
export class OrderClientService {
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly logger: LoggerService,
  ) {
    this.baseUrl =
      process.env.ORDERS_SERVICE_URL ||
      process.env.ORDERS_MICROSERVICE_URL ||
      process.env.ORDER_SERVICE_URL ||
      'http://orders-microservice:3203';
  }

  async createOrder(orderData: CreateCentralOrderRequest): Promise<any> {
    const payload: CreateCentralOrderPayload = {
      contractVersion: CREATE_ORDER_CONTRACT_VERSION,
      ...orderData,
      channelAccountId: this.normalizeChannelAccountId(orderData.channelAccountId),
      orderedAt: this.normalizeOrderedAt(orderData.orderedAt),
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post(this.baseUrl + '/api/orders', payload, {
          headers: this.getAuthHeaders(),
        }),
      );
      this.logger.log('Order accepted by orders-microservice: ' + response.data.data?.id, 'OrderClient');
      return response.data.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const message = status === HttpStatus.CONFLICT
        ? ORDER_IDEMPOTENCY_CONFLICT
        : error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Failed to create order in orders-microservice: ' + message, stack, 'OrderClient');
      throw new HttpException('Failed to create order: ' + message, status || HttpStatus.BAD_REQUEST);
    }
  }

  async updateOrderStatus(orderId: string, status: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.put(this.baseUrl + '/api/orders/' + orderId + '/status', { status }, {
          headers: this.getAuthHeaders(),
        }),
      );
      return response.data.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Failed to update order status: ' + errorMessage, errorStack, 'OrderClient');
      throw new HttpException('Failed to update order status: ' + errorMessage, HttpStatus.BAD_REQUEST);
    }
  }

  async getOrderById(orderId: string): Promise<OrderReadResult> {
    const normalizedOrderId = orderId?.trim();
    if (!normalizedOrderId) {
      return {
        available: false,
        stale: true,
        order: null,
        missing: ['[MISSING: central Orders id]'],
        reason: 'missing_order_id',
      };
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(this.baseUrl + '/api/orders/' + encodeURIComponent(normalizedOrderId), {
          headers: this.getAuthHeaders(),
        }),
      );
      const order = response.data?.data ?? response.data ?? null;
      if (!order || response.data?.success === false) {
        return {
          available: false,
          stale: true,
          order: null,
          missing: [ORDER_LIFECYCLE_READ_CONTRACT_MISSING],
          httpStatus: response.status,
          reason: 'orders_read_empty_response',
        };
      }
      return {
        available: true,
        stale: false,
        order,
        missing: [],
        httpStatus: response.status,
      };
    } catch (error: any) {
      const status = error?.response?.status;
      const errorSummary = this.getErrorSummary(error);
      this.logger.warn(
        'Orders lifecycle read unavailable for order id ' + normalizedOrderId + (status ? ' HTTP ' + status : '') + ': ' + errorSummary,
        'OrderClient',
      );
      return {
        available: false,
        stale: true,
        order: null,
        missing: [ORDER_LIFECYCLE_READ_CONTRACT_MISSING],
        httpStatus: status,
        errorSummary,
        reason: status ? 'orders_read_http_' + status : 'orders_read_failed',
      };
    }
  }

  async findByExternalId(externalOrderId: string, channel: string, channelAccountId?: string): Promise<any | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(this.baseUrl + '/api/orders', {
          params: {
            channel,
            externalOrderId,
            channelAccountId: channelAccountId ? this.normalizeChannelAccountId(channelAccountId) : undefined,
          },
          headers: this.getAuthHeaders(),
        }),
      );
      const orders = response.data.data || [];
      return orders.find((order: any) => order.externalOrderId === externalOrderId) || null;
    } catch (error: unknown) {
      this.logger.warn('Order not found: ' + externalOrderId, 'OrderClient');
      return null;
    }
  }

  private getErrorSummary(error: any): string {
    const responseMessage = error?.response?.data?.message || error?.response?.data?.error;
    const message = Array.isArray(responseMessage)
      ? responseMessage.join('; ')
      : responseMessage || (error instanceof Error ? error.message : 'Unknown error');
    return String(message || 'Unknown error').replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, 'Bearer [REDACTED]').slice(0, 240);
  }

  private normalizeChannelAccountId(channelAccountId?: string): string {
    const normalized = channelAccountId?.trim();
    return normalized || DEFAULT_CHANNEL_ACCOUNT_ID;
  }

  private normalizeOrderedAt(orderedAt?: Date | string): string | undefined {
    if (!orderedAt) return undefined;
    return orderedAt instanceof Date ? orderedAt.toISOString() : orderedAt;
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    const bearer = process.env.ORDERS_SERVICE_TOKEN?.trim();
    if (bearer) {
      headers.Authorization = bearer.startsWith('Bearer ') ? bearer : `Bearer ${bearer}`;
    }

    const internalToken = (
      process.env.HEUREKA_INTERNAL_SERVICE_TOKEN ||
      process.env.INTERNAL_SERVICE_TOKEN ||
      process.env.JWT_TOKEN ||
      ''
    ).trim();
    if (internalToken) {
      headers['x-internal-service-token'] = internalToken;
      headers['x-service-name'] = 'heureka-service';
    }
    return headers;
  }
}
