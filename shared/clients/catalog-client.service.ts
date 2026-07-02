import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { LoggerService } from '../logger/logger.service';

export type CatalogRequestContext = {
  authorization?: string;
  catalogScope?: string;
};

export const CATALOG_PRODUCT_QUALITY_POLICY_ID = 'catalog.product_quality.v1';

export type CatalogProductQualityIssue = {
  code: string;
  message?: string;
  severity?: string;
  field?: string;
  source?: string;
};

export type CatalogProductQualityReviewItem = {
  productId: string;
  sku?: string | null;
  title?: string | null;
  lifecycle?: string | null;
  canActivate?: boolean;
  completionScore?: number;
  blockingIssues?: CatalogProductQualityIssue[];
  blockingMissingFields?: string[];
  optionalOpportunities?: CatalogProductQualityIssue[];
  nextAction?: string;
};

export type CatalogProductQualityReviewResponse = {
  policyId: string;
  blockers: string[];
  items: CatalogProductQualityReviewItem[];
  total: number;
  page: number;
  limit: number;
  unavailable?: boolean;
};

export type CatalogProductQualityReviewLookup = {
  policyId: string;
  item: CatalogProductQualityReviewItem | null;
  unavailable: boolean;
  source: 'embedded_product' | 'review_queue' | 'unavailable';
  blockers: string[];
  missing: string[];
};

/**
 * API client for catalog-microservice
 * Fetches product data from the central catalog
 */
@Injectable()
export class CatalogClientService {
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly logger: LoggerService,
  ) {
    this.baseUrl = process.env.CATALOG_SERVICE_URL || 'http://catalog-microservice:3200';
  }

  /**
   * Get product by ID
   */
  async getProductById(productId: string, context: CatalogRequestContext = {}): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (context.catalogScope) params.append('catalogScope', context.catalogScope);
      const query = params.toString();
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/api/products/${encodeURIComponent(productId)}${query ? `?${query}` : ''}`,
          this.catalogRequestOptions(context),
        )
      );
      return response.data.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to get product ${productId}: ${errorMessage}`, errorStack, 'CatalogClient');
      throw new HttpException(`Product not found: ${productId}`, HttpStatus.NOT_FOUND);
    }
  }

  /**
   * Get product by SKU
   */
  async getProductBySku(sku: string, context: CatalogRequestContext = {}): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/products/sku/${encodeURIComponent(sku)}`, this.catalogRequestOptions(context))
      );
      if (!response.data.success || !response.data.data) {
        return null;
      }
      return response.data.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Product not found by SKU ${sku}: ${errorMessage}`, 'CatalogClient');
      return null;
    }
  }

  /**
   * Search products
   */
  async searchProducts(query: {
    search?: string;
    isActive?: boolean;
    categoryId?: string;
    catalogScope?: string;
    page?: number;
    limit?: number;
  }, context: CatalogRequestContext = {}): Promise<{ items: any[]; total: number; page: number; limit: number }> {
    try {
      const params = new URLSearchParams();
      if (query.search) params.append('search', query.search);
      if (query.isActive !== undefined) params.append('isActive', String(query.isActive));
      if (query.categoryId) params.append('categoryId', query.categoryId);
      if (query.catalogScope) params.append('catalogScope', query.catalogScope);
      if (query.page) params.append('page', String(query.page));
      if (query.limit) params.append('limit', String(query.limit));

      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/products?${params.toString()}`, this.catalogRequestOptions(context))
      );
      return {
        items: response.data.data || [],
        total: response.data.pagination?.total || 0,
        page: response.data.pagination?.page || 1,
        limit: response.data.pagination?.limit || 20,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to search products: ${errorMessage}`, errorStack, 'CatalogClient');
      return { items: [], total: 0, page: 1, limit: 20 };
    }
  }

  /**
   * Create product in catalog
   */
  async createProduct(productData: any): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/products`, productData, this.catalogRequestOptions())
      );
      return response.data.data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to create product: ${errorMessage}`, errorStack, 'CatalogClient');
      throw new HttpException(`Failed to create product: ${errorMessage}`, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Update product in catalog
   */
  async updateProduct(productId: string, productData: any, context: CatalogRequestContext = {}): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.put(
          `${this.baseUrl}/api/products/${encodeURIComponent(productId)}`,
          productData,
          this.catalogRequestOptions(context),
        )
      );
      return response.data.data;
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: any }; stack?: string; message?: string };
      const responseMessage = err.response?.data?.error?.message || err.response?.data?.message;
      const errorMessage = responseMessage || err.message || 'Unknown error';
      const errorStack = err.stack;
      const status = err.response?.status || HttpStatus.BAD_REQUEST;
      this.logger.error(`Failed to update product ${productId}: ${errorMessage}`, errorStack, 'CatalogClient');
      throw new HttpException(errorMessage, status);
    }
  }

  /**
   * Get product pricing
   */
  async getProductPricing(productId: string, context: CatalogRequestContext = {}): Promise<any> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/pricing/product/${encodeURIComponent(productId)}/current`, this.catalogRequestOptions(context))
      );
      return response.data.data;
    } catch (error: unknown) {
      this.logger.warn(`Pricing not found for product ${productId}`, 'CatalogClient');
      return null;
    }
  }

  /**
   * Get product media
   */
  async getProductMedia(productId: string, context: CatalogRequestContext = {}): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/media/product/${encodeURIComponent(productId)}`, this.catalogRequestOptions(context))
      );
      return response.data.data || [];
    } catch (error: unknown) {
      this.logger.warn(`Media not found for product ${productId}`, 'CatalogClient');
      return [];
    }
  }

  /**
   * Get public-safe Heureka feed fields rendered by Catalog.
   */
  async getHeurekaFeedSnapshot(productId: string, feedType: string = 'heureka_cz', context: CatalogRequestContext = {}): Promise<any | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/products/${encodeURIComponent(productId)}/heureka-feed-snapshot?feedType=${encodeURIComponent(feedType)}`, this.catalogRequestOptions(context))
      );
      return response.data?.data || null;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Heureka feed snapshot not available for product ${productId}: ${errorMessage}`, 'CatalogClient');
      return null;
    }
  }

  /**
   * Get protected Heureka content preview rendered by Catalog.
   */
  async getHeurekaContentPreview(productId: string): Promise<any | null> {
    return this.getProtectedHeurekaProductResource(productId, 'content-previews/heureka', 'Heureka content preview');
  }

  /**
   * Get protected Heureka marketplace fields from Catalog.
   */
  async getHeurekaMarketplaceFields(productId: string): Promise<any | null> {
    return this.getProtectedHeurekaProductResource(productId, 'marketplace-fields/heureka', 'Heureka marketplace fields');
  }

  /**
   * Update protected Heureka marketplace fields in Catalog.
   */
  async updateHeurekaMarketplaceFields(productId: string, input: Record<string, unknown>): Promise<any | null> {
    return this.updateProtectedHeurekaProductResource(productId, 'marketplace-fields/heureka', input, 'Heureka marketplace fields');
  }

  /**
   * Get Catalog-owned source settings for human-token effective scope labels.
   */
  async getCatalogSettings(context: CatalogRequestContext = {}): Promise<any | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/catalog/settings`, this.catalogRequestOptions(context))
      );
      return response.data?.data || response.data || null;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Catalog settings not available: ${errorMessage}`, 'CatalogClient');
      return null;
    }
  }

  /**
   * Read Catalog Goal 25 product quality review queue.
   */
  async getProductQualityReview(query: {
    search?: string;
    isActive?: boolean;
    lifecycle?: string;
    catalogScope?: string;
    page?: number;
    limit?: number;
    missingField?: string;
    severity?: 'blocking' | 'optional';
  } = {}, context: CatalogRequestContext = {}): Promise<CatalogProductQualityReviewResponse> {
    try {
      const params = new URLSearchParams();
      if (query.search) params.append('search', query.search);
      if (query.isActive !== undefined) params.append('isActive', String(query.isActive));
      if (query.lifecycle) params.append('lifecycle', query.lifecycle);
      if (query.catalogScope || context.catalogScope) params.append('catalogScope', String(query.catalogScope || context.catalogScope));
      if (query.page) params.append('page', String(query.page));
      if (query.limit) params.append('limit', String(query.limit));
      if (query.missingField) params.append('missingField', query.missingField);
      if (query.severity) params.append('severity', query.severity);

      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/products/review/quality?${params.toString()}`, this.catalogRequestOptions(context))
      );
      const payload = response.data || {};
      return {
        policyId: payload.policyId || CATALOG_PRODUCT_QUALITY_POLICY_ID,
        blockers: Array.isArray(payload.blockers) ? payload.blockers : [],
        items: Array.isArray(payload.data) ? payload.data : Array.isArray(payload.items) ? payload.items : [],
        total: Number(payload.pagination?.total ?? payload.total ?? 0),
        page: Number(payload.pagination?.page ?? query.page ?? 1),
        limit: Number(payload.pagination?.limit ?? query.limit ?? 100),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Catalog product quality review unavailable: ${errorMessage}`, 'CatalogClient');
      return {
        policyId: CATALOG_PRODUCT_QUALITY_POLICY_ID,
        blockers: ['[MISSING: Catalog product quality review contract response]'],
        items: [],
        total: 0,
        page: Number(query.page || 1),
        limit: Number(query.limit || 100),
        unavailable: true,
      };
    }
  }

  /**
   * Resolve one product's Catalog Goal 25 quality item through the stable review queue.
   */
  async getProductQualityReviewForProduct(productId: string, product: any = null, context: CatalogRequestContext = {}): Promise<CatalogProductQualityReviewLookup> {
    const normalizedProductId = String(productId || '').trim();
    const embedded = this.extractEmbeddedProductQualityReview(normalizedProductId, product);
    if (embedded) return embedded;

    const seen = new Set<string>();
    const terms = [
      product?.sku,
      product?.SKU,
      product?.code,
      product?.productCode,
      product?.title,
      product?.name,
      product?.productName,
      normalizedProductId,
    ].map((value) => String(value || '').trim()).filter(Boolean).filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    for (const term of terms) {
      const review = await this.getProductQualityReview({ search: term, isActive: true, catalogScope: context.catalogScope, page: 1, limit: 100 }, context);
      if (review.unavailable) return this.unavailableProductQualityLookup(normalizedProductId, review.blockers);
      const item = this.findProductQualityItem(review.items, normalizedProductId);
      if (item) {
        return { policyId: review.policyId, item, unavailable: false, source: 'review_queue', blockers: review.blockers, missing: [] };
      }
    }

    const maxPages = this.clampProductQualityLookupPages(process.env.CATALOG_PRODUCT_QUALITY_LOOKUP_MAX_PAGES);
    for (let page = 1; page <= maxPages; page += 1) {
      const review = await this.getProductQualityReview({ isActive: true, catalogScope: context.catalogScope, page, limit: 100 }, context);
      if (review.unavailable) return this.unavailableProductQualityLookup(normalizedProductId, review.blockers);
      const item = this.findProductQualityItem(review.items, normalizedProductId);
      if (item) {
        return { policyId: review.policyId, item, unavailable: false, source: 'review_queue', blockers: review.blockers, missing: [] };
      }
      if (!review.items.length || review.items.length < review.limit || (review.total && page * review.limit >= review.total)) break;
    }

    return this.unavailableProductQualityLookup(normalizedProductId, [`[MISSING: Catalog product quality review item for ${normalizedProductId || 'unknown product'}]`]);
  }

  /**
   * Provision private user Catalog settings without changing source opt-ins.
   */
  async provisionCatalogAccess(authorization: string | undefined, sourceApplication = 'heureka-service'): Promise<any | null> {
    const headers = this.getCatalogHumanBearerHeaders(authorization);
    if (!headers) {
      this.logger.warn('Catalog access provisioning skipped: bearer token is not available', 'CatalogClient');
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/api/catalog/access/provision`, { sourceApplication }, { headers }),
      );
      return response.data?.data || response.data || null;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Catalog access provisioning failed: ${errorMessage}`, 'CatalogClient');
      return null;
    }
  }

  private async getProtectedHeurekaProductResource(productId: string, path: string, label: string): Promise<any | null> {
    const headers = this.getCatalogInternalServiceHeaders();
    if (!headers) {
      this.logger.warn(`${label} not available for product ${productId}: internal service token is not configured`, 'CatalogClient');
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/api/products/${encodeURIComponent(productId)}/${path}`, { headers })
      );
      return response.data?.data || null;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`${label} not available for product ${productId}: ${errorMessage}`, 'CatalogClient');
      return null;
    }
  }

  private async updateProtectedHeurekaProductResource(productId: string, path: string, input: Record<string, unknown>, label: string): Promise<any | null> {
    const headers = this.getCatalogInternalServiceHeaders();
    if (!headers) {
      this.logger.warn(`${label} update skipped for product ${productId}: internal service token is not configured`, 'CatalogClient');
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.put(`${this.baseUrl}/api/products/${encodeURIComponent(productId)}/${path}`, input, { headers })
      );
      return response.data?.data || null;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`${label} update failed for product ${productId}: ${errorMessage}`, 'CatalogClient');
      return null;
    }
  }

  private extractEmbeddedProductQualityReview(productId: string, product: any): CatalogProductQualityReviewLookup | null {
    if (!product || typeof product !== 'object') return null;
    const source = product.productQualityReview || product.qualityReview || product.quality || null;
    const blockingIssues = Array.isArray(source?.blockingIssues)
      ? source.blockingIssues
      : Array.isArray(product.blockingIssues)
        ? product.blockingIssues
        : null;
    if (!source && !blockingIssues) return null;
    const item: CatalogProductQualityReviewItem = {
      productId,
      sku: product.sku || product.code || source?.sku || null,
      title: product.title || product.name || product.productName || source?.title || null,
      lifecycle: product.lifecycle || source?.lifecycle || null,
      canActivate: typeof source?.canActivate === 'boolean' ? source.canActivate : !(blockingIssues || []).length,
      completionScore: source?.completionScore,
      blockingIssues: this.normalizeProductQualityIssues(blockingIssues || []),
      blockingMissingFields: Array.isArray(source?.blockingMissingFields) ? source.blockingMissingFields : [],
      optionalOpportunities: this.normalizeProductQualityIssues(source?.optionalOpportunities || []),
      nextAction: source?.nextAction,
    };
    return { policyId: source?.policyId || CATALOG_PRODUCT_QUALITY_POLICY_ID, item, unavailable: false, source: 'embedded_product', blockers: [], missing: [] };
  }

  private normalizeProductQualityIssues(issues: unknown): CatalogProductQualityIssue[] {
    if (!Array.isArray(issues)) return [];
    return issues.map((issue) => {
      if (typeof issue === 'string') return { code: issue };
      return {
        code: String((issue as any)?.code || '').trim(),
        message: (issue as any)?.message,
        severity: (issue as any)?.severity,
        field: (issue as any)?.field,
        source: (issue as any)?.source,
      };
    }).filter((issue) => issue.code);
  }

  private findProductQualityItem(items: CatalogProductQualityReviewItem[], productId: string): CatalogProductQualityReviewItem | null {
    const normalizedProductId = String(productId || '').trim();
    return (items || []).find((item) => String(item?.productId || '').trim() === normalizedProductId) || null;
  }

  private unavailableProductQualityLookup(productId: string, blockers: string[] = []): CatalogProductQualityReviewLookup {
    return {
      policyId: CATALOG_PRODUCT_QUALITY_POLICY_ID,
      item: null,
      unavailable: true,
      source: 'unavailable',
      blockers,
      missing: blockers.length ? blockers : [`[MISSING: Catalog product quality review item for ${productId || 'unknown product'}]`],
    };
  }

  private clampProductQualityLookupPages(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 3;
    return Math.max(1, Math.min(25, Math.floor(parsed)));
  }


  private catalogRequestOptions(context: CatalogRequestContext = {}): { headers: Record<string, string> } | undefined {
    const headers = this.getCatalogHumanBearerHeaders(context.authorization) || this.getCatalogInternalServiceHeaders();
    return headers ? { headers } : undefined;
  }

  private getCatalogHumanBearerHeaders(authorization?: string): Record<string, string> | null {
    const bearer = String(authorization || '').trim();
    if (!bearer) {
      return null;
    }
    return {
      Authorization: bearer.startsWith('Bearer ') ? bearer : `Bearer ${bearer}`,
    };
  }

  private getCatalogInternalServiceHeaders(): Record<string, string> | null {
    const internalToken = (
      process.env.CATALOG_INTERNAL_SERVICE_TOKEN ||
      process.env.HEUREKA_INTERNAL_SERVICE_TOKEN ||
      process.env.INTERNAL_SERVICE_TOKEN ||
      process.env.JWT_TOKEN ||
      ''
    ).trim();

    if (!internalToken) {
      return null;
    }

    return {
      'x-internal-service-token': internalToken,
      'x-service-name': 'heureka-service',
    };
  }

}
