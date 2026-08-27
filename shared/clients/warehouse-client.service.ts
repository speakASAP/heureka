import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from '../logger/logger.service';

export interface WarehouseAvailability {
  productId: string;
  totalQuantity?: number;
  totalReserved?: number;
  totalAvailable?: number;
  warehouses?: any[];
}

/**
 * API client for warehouse-microservice
 * Fetches stock levels and manages stock reservations
 */
@Injectable()
export class WarehouseClientService {
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly logger: LoggerService,
  ) {
    this.baseUrl = process.env.WAREHOUSE_SERVICE_URL || 'http://warehouse-microservice:3201';
  }

  private requestOptions() {
    // JWT_TOKEN is deliberately NOT in this chain: it holds the shared a2880693
    // value, and warehouse rejects it. Reaching it could only turn a missing
    // per-pair credential into a confusing 401 from warehouse.
    const token = (
      process.env.WAREHOUSE_SERVICE_TOKEN ||
      process.env.SERVICE_TOKEN ||
      ''
    ).trim();

    if (!token) {
      // Sending the request unauthenticated would surface as a confusing 401
      // from warehouse rather than as the misconfiguration it actually is.
      this.logger.error(
        'No warehouse credential configured (WAREHOUSE_SERVICE_TOKEN / SERVICE_TOKEN); refusing to call warehouse-microservice unauthenticated',
        undefined,
        'WarehouseClient',
      );
      throw new Error('[MISSING: warehouse runtime credential]');
    }

    return {
      headers: {
        Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
      },
    };
  }

  /**
   * Get stock for a product across all warehouses
   */
  async getStockByProduct(productId: string): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/stock/${productId}`, this.requestOptions())
      );
      return response.data.data || [];
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // A 404 is genuinely "no stock rows for this product". Anything else --
      // above all 401/403 -- is a failed lookup, and returning [] for it makes
      // an outage indistinguishable from zero stock.
      if (status === 404) {
        this.logger.warn(`No stock rows for product ${productId}`, 'WarehouseClient');
        return [];
      }
      this.logger.error(
        `Stock lookup failed for product ${productId} (status ${status ?? 'none'}): ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        'WarehouseClient',
      );
      throw error;
    }
  }

  /**
   * Get total available stock for a product
   */
  async getTotalAvailable(productId: string): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/stock/${productId}/total`, this.requestOptions())
      );
      return response.data.data?.totalAvailable || 0;
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // Returning 0 for a failed lookup reads as "out of stock" and silently
      // suppresses offers; only a real 404 means there is no such stock row.
      if (status === 404) {
        this.logger.warn(`No stock row for product ${productId}`, 'WarehouseClient');
        return 0;
      }
      this.logger.error(
        `Total stock lookup failed for product ${productId} (status ${status ?? 'none'}): ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        'WarehouseClient',
      );
      throw error;
    }
  }

  /**
   * Get availability for a product list in one Warehouse-authoritative request.
   */
  async getAvailabilityBatch(productIds: string[], warehouseIds?: string[]): Promise<WarehouseAvailability[]> {
    const normalizedProductIds = Array.from(new Set(
      (productIds || []).map((productId) => String(productId || '').trim()).filter(Boolean),
    ));
    if (!normalizedProductIds.length) return [];

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/stock/availability/batch`, {
          productIds: normalizedProductIds,
          ...(warehouseIds?.length ? { warehouseIds } : {}),
        }, this.requestOptions())
      );
      const data = response.data?.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.items)) return data.items;
      return [];
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // An empty batch result is a valid answer only when warehouse actually
      // answered. A 401/5xx here would otherwise disable every offer at once.
      this.logger.error(
        `Batch stock availability failed for ${normalizedProductIds.length} products (status ${status ?? 'none'}): ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        'WarehouseClient',
      );
      throw error;
    }
  }

  /**
   * Reserve stock for an order
   */
  async reserveStock(productId: string, warehouseId: string, quantity: number, orderId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/stock/reserve`, {
          productId,
          warehouseId,
          quantity,
          orderId,
        }, this.requestOptions())
      );
      return response.data.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to reserve stock: ${errorMessage}`, errorStack, 'WarehouseClient');
      throw new HttpException(`Failed to reserve stock: ${errorMessage}`, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Release reserved stock
   */
  async unreserveStock(productId: string, warehouseId: string, quantity: number, orderId: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/stock/unreserve`, {
          productId,
          warehouseId,
          quantity,
          orderId,
        }, this.requestOptions())
      );
      return response.data.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to unreserve stock: ${errorMessage}`, errorStack, 'WarehouseClient');
      throw new HttpException(`Failed to unreserve stock: ${errorMessage}`, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Decrement stock (after order shipped)
   */
  async decrementStock(productId: string, warehouseId: string, quantity: number, reason?: string): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/stock/decrement`, {
          productId,
          warehouseId,
          quantity,
          reason: reason || 'Order shipped',
        }, this.requestOptions())
      );
      return response.data.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to decrement stock: ${errorMessage}`, errorStack, 'WarehouseClient');
      throw new HttpException(`Failed to decrement stock: ${errorMessage}`, HttpStatus.BAD_REQUEST);
    }
  }
}
