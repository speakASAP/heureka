import { Injectable, Optional } from '@nestjs/common';
import { createHash } from 'crypto';
import { CatalogClientService, LoggerService, PrismaService, WarehouseClientService } from '@heureka/shared';
import { HeurekaOperationEventService } from '../operations/operation-event.service';

const HEUREKA_EXTERNAL_FEED_BLOCKER = '[MISSING: confirmed Heureka feed approval/import removal behavior]';
const SAFE_REFRESH_BLOCKER = '[MISSING: safe catalog-event refresh policy]';

export type HeurekaAvailabilityReconciliationReason =
  | 'catalog_product_missing'
  | 'catalog_product_archived'
  | 'catalog_product_deleted'
  | 'catalog_product_inactive'
  | 'catalog_product_not_sellable'
  | 'warehouse_stock_unavailable';

export interface HeurekaAvailabilityReconciliationOptions {
  feedType?: string;
  limit?: number;
  dryRun?: boolean;
  now?: Date;
}

export interface HeurekaAvailabilityReconciliationResult {
  scanned: number;
  excluded: number;
  kept: number;
  failed: number;
  offersUpdated: number;
  feedType: string;
  dryRun: boolean;
  blocker: string;
  failures: Array<{ productId: string; error: string }>;
}

@Injectable()
export class HeurekaAvailabilityReconciliationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogClient: CatalogClientService,
    private readonly warehouseClient: WarehouseClientService,
    private readonly logger: LoggerService,
    @Optional() private readonly operationEvents?: HeurekaOperationEventService,
  ) {
    this.logger.setContext('HeurekaAvailabilityReconciliationService');
  }

  async reconcile(options: HeurekaAvailabilityReconciliationOptions = {}): Promise<HeurekaAvailabilityReconciliationResult> {
    const feedType = this.feedType(options.feedType);
    const dryRun = Boolean(options.dryRun);
    const checkedAt = options.now || new Date();
    const productIds = await this.collectLocalSellableProductIds(this.limit(options.limit));
    const result: HeurekaAvailabilityReconciliationResult = {
      scanned: productIds.length,
      excluded: 0,
      kept: 0,
      failed: 0,
      offersUpdated: 0,
      feedType,
      dryRun,
      blocker: SAFE_REFRESH_BLOCKER,
      failures: [],
    };

    for (const productId of productIds) {
      try {
        const decision = await this.evaluate(productId);
        if (!decision.reason) {
          result.kept += 1;
          continue;
        }

        if (!dryRun) {
          const applied = await this.excludeProduct(productId, feedType, decision.reason, decision.warehouseAvailable, checkedAt);
          result.offersUpdated += applied.offersUpdated;
        }
        result.excluded += 1;
      } catch (error: any) {
        result.failed += 1;
        result.failures.push({ productId, error: error?.message || String(error) });
        this.logger.warn('Heureka availability reconciliation failed for product', {
          productId,
          error: error?.message || String(error),
        });
      }
    }

    this.logger.log('Heureka availability reconciliation completed', result);
    return result;
  }

  private async collectLocalSellableProductIds(limit: number): Promise<string[]> {
    const [feedProducts, offers] = await Promise.all([
      this.prisma.heurekaProduct.findMany({
        where: { isIncluded: true },
        select: { productId: true },
        orderBy: { updatedAt: 'asc' },
        take: limit,
      }),
      this.prisma.heurekaOffer.findMany({
        where: {
          productId: { not: null },
          OR: [
            { isActive: true },
            { stockQuantity: { gt: 0 } },
          ],
        },
        select: { productId: true },
        orderBy: { updatedAt: 'asc' },
        take: limit,
      }),
    ]);
    const ids = [...feedProducts, ...offers]
      .map((row: any) => this.normalizeProductId(row.productId))
      .filter(Boolean);
    return Array.from(new Set(ids)).slice(0, limit);
  }

  private async evaluate(productId: string): Promise<{
    reason: HeurekaAvailabilityReconciliationReason | null;
    warehouseAvailable: number;
  }> {
    const catalogProduct = await this.getCatalogProduct(productId);
    const catalogReason = this.catalogNonSellableReason(catalogProduct);
    if (catalogReason) {
      return { reason: catalogReason, warehouseAvailable: 0 };
    }

    const warehouseAvailable = Number(await this.warehouseClient.getTotalAvailable(productId));
    if (!Number.isFinite(warehouseAvailable) || warehouseAvailable <= 0) {
      return { reason: 'warehouse_stock_unavailable', warehouseAvailable: 0 };
    }

    return { reason: null, warehouseAvailable };
  }

  private async getCatalogProduct(productId: string): Promise<any | null> {
    try {
      return await this.catalogClient.getProductById(productId);
    } catch (error: any) {
      this.logger.warn('Heureka availability reconciliation treating Catalog lookup failure as non-sellable', {
        productId,
        error: error?.message || String(error),
      });
      return null;
    }
  }

  private catalogNonSellableReason(product: any | null): HeurekaAvailabilityReconciliationReason | null {
    if (!product) return 'catalog_product_missing';
    const status = String(product.status || product.lifecycleStatus || product.state || '').trim().toLowerCase();
    if (status === 'deleted') return 'catalog_product_deleted';
    if (status === 'archived') return 'catalog_product_archived';
    if (status === 'inactive') return 'catalog_product_inactive';
    if (this.booleanFalse(product.isActive ?? product.active)) return 'catalog_product_inactive';
    if (this.booleanFalse(product.isSellable ?? product.sellable ?? product.offerable ?? product.isOfferable)) {
      return 'catalog_product_not_sellable';
    }
    return null;
  }

  private async excludeProduct(
    productId: string,
    feedType: string,
    reason: HeurekaAvailabilityReconciliationReason,
    warehouseAvailable: number,
    checkedAt: Date,
  ): Promise<{ offersUpdated: number }> {
    const reconciliationId = this.reconciliationId(productId, reason);
    const feedProduct = await this.prisma.heurekaProduct.upsert({
      where: { productId },
      create: { productId, isIncluded: false },
      update: { isIncluded: false },
    });
    const offerUpdate = await this.prisma.heurekaOffer.updateMany({
      where: { productId },
      data: { stockQuantity: 0, isActive: false },
    });

    await this.operationEvents?.append({
      feedType,
      action: 'availability_reconciliation_applied',
      status: 'excluded',
      idempotencyKey: `availability-reconciliation:${reconciliationId}:${productId}`.slice(0, 160),
      entityType: 'feed_reconciliation',
      entityId: reconciliationId.slice(0, 120),
      productId,
      requestSummary: {
        source: 'manual_reconciliation',
        reason,
        warehouseAvailable: Number.isFinite(Number(warehouseAvailable)) ? Number(warehouseAvailable) : 0,
      },
      responseSummary: {
        feedProductId: feedProduct?.id || null,
        isIncluded: false,
        offersUpdated: offerUpdate?.count ?? null,
      },
      blockedReasons: [reason, HEUREKA_EXTERNAL_FEED_BLOCKER, SAFE_REFRESH_BLOCKER],
      errorSummary: `Availability reconciliation excluded ${productId} from ${feedType}`,
      completedAt: checkedAt,
    });

    return { offersUpdated: Number(offerUpdate?.count || 0) };
  }

  private reconciliationId(productId: string, reason: string): string {
    return `heureka-availability-${createHash('sha256').update(`${productId}:${reason}:v1`).digest('hex').slice(0, 32)}`;
  }

  private normalizeProductId(value: unknown): string {
    const productId = String(value || '').trim();
    return productId || '';
  }

  private booleanFalse(value: unknown): boolean {
    if (value === false || value === 0) return true;
    const normalized = String(value ?? '').trim().toLowerCase();
    return normalized === 'false' || normalized === '0' || normalized === 'no';
  }

  private feedType(value: unknown): string {
    const feedType = String(value || process.env.HEUREKA_RECONCILIATION_FEED_TYPE || 'heureka_cz').trim();
    return feedType || 'heureka_cz';
  }

  private limit(value: unknown): number {
    const parsed = Number(value || process.env.HEUREKA_AVAILABILITY_RECONCILIATION_LIMIT || 200);
    if (!Number.isFinite(parsed)) return 200;
    return Math.max(1, Math.min(Math.floor(parsed), 1000));
  }
}
