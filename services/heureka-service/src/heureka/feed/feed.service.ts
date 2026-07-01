import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, LoggerService, CatalogClientService, WarehouseClientService } from '@heureka/shared';
import { FeedStatusSummary, FeedValidationSnapshot, summarizeFeedStatus, validateHeurekaFeed } from './feed-lifecycle';
import { buildCatalogFeedReadinessResponse, CatalogFeedReadinessResponse, CatalogFeedReadinessSnapshot } from './feed-readiness';

interface FeedGenerationResult {
  xml: string;
  validation: FeedValidationSnapshot;
}

@Injectable()
export class FeedService {
  private readonly logger: LoggerService;
  private readonly latestValidationByType = new Map<string, FeedValidationSnapshot>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogClient: CatalogClientService,
    private readonly warehouseClient: WarehouseClientService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService;
    this.logger.setContext('FeedService');
  }

  async generateFeed(feedType: string = 'heureka_cz'): Promise<string> {
    const result = await this.generateFeedWithLifecycle(feedType);
    return result.xml;
  }

  async generateFeedWithLifecycle(feedType: string = 'heureka_cz'): Promise<FeedGenerationResult> {
    const startedAt = Date.now();
    try {
      const settings = await this.prisma.heurekaSettings.findUnique({ where: { feedType } });
      if (!settings || !settings.isActive) throw new NotFoundException(`Settings not found or inactive for feed type: ${feedType}`);

      const feed = await this.prisma.heurekaFeed.create({ data: { feedType, status: 'generating' } });
      try {
        const includedProducts = await this.prisma.heurekaProduct.findMany({ where: { isIncluded: true } });
        const productIds = includedProducts.map((p) => p.productId);
        this.logger.log(`Generating feed for ${productIds.length} products`, { feedType, feedId: feed.id });

        const products = await Promise.all(productIds.map(async (productId) => {
          try {
            const [product, stock, pricing, media, feedSnapshot] = await Promise.all([
              this.catalogClient.getProductById(productId),
              this.warehouseClient.getTotalAvailable(productId),
              this.catalogClient.getProductPricing(productId),
              this.catalogClient.getProductMedia(productId),
              this.catalogClient.getHeurekaFeedSnapshot(productId, feedType),
            ]);
            const mediaItems = Array.isArray(media) ? media : [];
            const feedFields = this.buildHeurekaFeedFields(product, pricing, mediaItems, settings, feedSnapshot);
            return {
              ...product,
              stock: Number.isFinite(Number(stock)) ? Number(stock) : 0,
              price: this.optionalNumber(feedFields.PRICE_VAT) ?? 0,
              images: mediaItems.filter((m: any) => m.type === 'image'),
              feedFields,
            };
          } catch (error: any) {
            this.logger.warn(`Failed to fetch product ${productId}: ${error.message}`);
            return null;
          }
        }));

        const fetchedProducts = products.filter((p) => p !== null) as any[];
        const validProducts = fetchedProducts.filter((p) => Number(p.stock) > 0 && this.hasRequiredPublicFeedFields(p.feedFields || {}));
        const zeroStockExcludedCount = fetchedProducts.length - validProducts.length;
        const failedFetchCount = products.length - fetchedProducts.length;
        const xml = this.buildHeurekaXml(validProducts, settings);
        const generatedAt = new Date();
        const generationMs = Date.now() - startedAt;
        const validation = validateHeurekaFeed({ feedId: feed.id, feedType, xml, generatedAt, generationMs, includedProductCount: validProducts.length, zeroStockExcludedCount, failedFetchCount });
        this.latestValidationByType.set(feedType, validation);

        if (validation.status !== 'valid') {
          await this.prisma.heurekaFeed.update({ where: { id: feed.id }, data: { status: 'failed', productCount: validProducts.length, generatedAt } });
          throw new BadRequestException({ message: 'Generated feed failed lifecycle validation', validation });
        }

        await this.prisma.heurekaFeed.update({ where: { id: feed.id }, data: { status: 'completed', productCount: validProducts.length, generatedAt, feedUrl: `${process.env.SHOP_URL || settings.shopUrl}/feeds/${feedType}.xml` } });
        this.logger.log(`Feed generated successfully: ${validProducts.length} products`, { feedId: feed.id, feedType, generationMs, zeroStockExcludedCount, failedFetchCount });
        return { xml, validation };
      } catch (error: any) {
        if (!(error instanceof BadRequestException)) await this.prisma.heurekaFeed.update({ where: { id: feed.id }, data: { status: 'failed' } });
        throw error;
      }
    } catch (error: any) {
      this.logger.error(`Failed to generate feed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private buildHeurekaXml(products: any[], settings: any): string {
    const items = products.map((product) => {
      const feedFields = this.buildHeurekaFeedFields(product, null, product.images || [], settings, { feedFields: product.feedFields || {} });
      let itemXml = `    <SHOPITEM>
      <ITEM_ID>${this.escapeXml(String(feedFields.ITEM_ID || product.id))}</ITEM_ID>
      <PRODUCTNAME>${this.escapeXml(String(feedFields.PRODUCTNAME || ''))}</PRODUCTNAME>
      <DESCRIPTION>${this.escapeXml(String(feedFields.DESCRIPTION || ''))}</DESCRIPTION>
      <URL>${this.escapeXml(String(feedFields.URL || `${settings.shopUrl}/product/${product.id}`))}</URL>`;
      if (feedFields.IMGURL) itemXml += `
      <IMGURL>${this.escapeXml(String(feedFields.IMGURL))}</IMGURL>`;
      itemXml += `
      <PRICE_VAT>${this.escapeXml(String(feedFields.PRICE_VAT ?? 0))}</PRICE_VAT>
      <DELIVERY_DATE>${this.escapeXml(String(feedFields.DELIVERY_DATE ?? settings.deliveryDays))}</DELIVERY_DATE>
      <DELIVERY>${this.escapeXml(String(feedFields.DELIVERY ?? this.calculateDeliveryPrice(Number(feedFields.PRICE_VAT || 0), settings)))}</DELIVERY>`;
      if (feedFields.EAN) itemXml += `
      <EAN>${this.escapeXml(String(feedFields.EAN))}</EAN>`;
      if (feedFields.MANUFACTURER) itemXml += `
      <MANUFACTURER>${this.escapeXml(String(feedFields.MANUFACTURER))}</MANUFACTURER>`;
      if (feedFields.CATEGORYTEXT) itemXml += `
      <CATEGORYTEXT>${this.escapeXml(String(feedFields.CATEGORYTEXT))}</CATEGORYTEXT>`;
      itemXml += `
    </SHOPITEM>`;
      return itemXml;
    }).join(String.fromCharCode(10));
    return `<?xml version="1.0" encoding="UTF-8"?>
<SHOP>
${items}
</SHOP>`;
  }

  private calculateDeliveryPrice(productPrice: number, settings: any): number {
    if (settings.freeDeliveryThreshold && productPrice >= Number(settings.freeDeliveryThreshold)) return 0;
    return Number(settings.deliveryPrice || 0);
  }

  private escapeXml(text: string): string {
    if (!text) return '';
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  async regenerateFeed(feedType: string = 'heureka_cz'): Promise<string> {
    return this.generateFeed(feedType);
  }

  async regenerateFeedWithLifecycle(feedType: string = 'heureka_cz'): Promise<FeedGenerationResult> {
    return this.generateFeedWithLifecycle(feedType);
  }

  async getFeedHistory(feedType?: string) {
    return this.prisma.heurekaFeed.findMany({ where: feedType ? { feedType } : undefined, orderBy: { createdAt: 'desc' }, take: 10 });
  }

  async getFeedStatus(feedType: string = 'heureka_cz'): Promise<FeedStatusSummary> {
    const latestFeed = await this.prisma.heurekaFeed.findFirst({ where: { feedType }, orderBy: { createdAt: 'desc' } });
    return summarizeFeedStatus(feedType, latestFeed, this.latestValidationByType.get(feedType));
  }

  async listFeedProducts(included?: string) {
    const where = included === undefined
      ? {}
      : { isIncluded: ['true', '1', 'yes'].includes(String(included).toLowerCase()) };
    return this.prisma.heurekaProduct.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 200 });
  }

  async getProductFeedStatus(productId: string, feedType: string = 'heureka_cz') {
    if (!productId || !productId.trim()) throw new BadRequestException('productId is required');
    const [feedProduct, readiness] = await Promise.all([
      this.prisma.heurekaProduct.findUnique({ where: { productId: productId.trim() } }).catch((error: any) => {
        if (!this.isMissingPrismaTable(error, 'heureka_products')) throw error;
        return null;
      }),
      this.getProductFeedReadiness(productId.trim(), feedType),
    ]);

    return {
      action: 'read_heureka_feed_status',
      productId: productId.trim(),
      authority: 'heureka',
      publishAuthority: 'heureka',
      feedType,
      included: Boolean(feedProduct?.isIncluded),
      feedProduct: feedProduct ? this.publicFeedProduct(feedProduct) : null,
      readiness,
      readinessItem: readiness.items[0] || null,
      nextAction: feedProduct?.isIncluded ? 'view_heureka_feed' : 'include_in_heureka_feed',
      feedUrl: `${process.env.SHOP_URL || 'https://heureka.alfares.cz'}/heureka/feed?type=${encodeURIComponent(feedType)}`,
    };
  }

  async includeProductInFeed(productId: string, feedType: string = 'heureka_cz', metadata: { requestedBy?: string; sourceHash?: string } = {}) {
    if (!productId || !productId.trim()) throw new BadRequestException('productId is required');
    const normalizedProductId = productId.trim();
    const readiness = await this.getProductFeedReadiness(normalizedProductId, feedType);
    const readinessItem = readiness.items[0] || null;
    const readinessState = String(readinessItem?.readiness || '').toLowerCase();

    if (readinessState !== 'ready' && readinessState !== 'warning') {
      throw new BadRequestException({
        message: 'Heureka readiness blocked feed inclusion.',
        reason: 'heureka_readiness_blocked',
        readiness,
        readinessItem,
        nextAction: 'resolve_heureka_readiness_blockers',
      });
    }

    const feedProduct = await this.prisma.heurekaProduct.upsert({
      where: { productId: normalizedProductId },
      create: { productId: normalizedProductId, isIncluded: true },
      update: { isIncluded: true },
    });

    return {
      action: 'include_heureka_product',
      productId: normalizedProductId,
      authority: 'heureka',
      publishAuthority: 'heureka',
      feedType,
      included: true,
      feedProduct: this.publicFeedProduct(feedProduct),
      readiness,
      readinessItem,
      metadata: {
        requestedBy: metadata.requestedBy || 'catalog-microservice',
        sourceHash: metadata.sourceHash || null,
      },
      message: 'Product is included in the Heureka feed.',
      nextAction: 'view_heureka_feed',
      feedUrl: `${process.env.SHOP_URL || 'https://heureka.alfares.cz'}/heureka/feed?type=${encodeURIComponent(feedType)}`,
    };
  }

  async excludeProductFromFeed(productId: string, feedType: string = 'heureka_cz', metadata: { requestedBy?: string } = {}) {
    if (!productId || !productId.trim()) throw new BadRequestException('productId is required');
    const normalizedProductId = productId.trim();
    const existing = await this.prisma.heurekaProduct.findUnique({ where: { productId: normalizedProductId } });
    const feedProduct = existing
      ? await this.prisma.heurekaProduct.update({ where: { productId: normalizedProductId }, data: { isIncluded: false } })
      : await this.prisma.heurekaProduct.create({ data: { productId: normalizedProductId, isIncluded: false } });
    const readiness = await this.getProductFeedReadiness(normalizedProductId, feedType);

    return {
      action: 'exclude_heureka_product',
      productId: normalizedProductId,
      authority: 'heureka',
      publishAuthority: 'heureka',
      feedType,
      included: false,
      feedProduct: this.publicFeedProduct(feedProduct),
      readiness,
      readinessItem: readiness.items[0] || null,
      metadata: { requestedBy: metadata.requestedBy || 'catalog-microservice' },
      message: 'Product is excluded from the Heureka feed.',
      nextAction: 'resolve_heureka_readiness_blockers',
    };
  }

  async getProductFeedReadiness(productId: string, feedType: string = 'heureka_cz'): Promise<CatalogFeedReadinessResponse> {
    if (!productId || !productId.trim()) throw new BadRequestException('productId is required');
    const snapshot = await this.buildReadinessSnapshot(productId.trim(), feedType);
    return buildCatalogFeedReadinessResponse(feedType, [snapshot]);
  }

  async getBulkFeedReadiness(productIds: unknown, feedType: string = 'heureka_cz'): Promise<CatalogFeedReadinessResponse> {
    if (!Array.isArray(productIds)) throw new BadRequestException('productIds must be an array');
    const requestedProductIds = productIds.map((productId) => String(productId || '').trim()).filter(Boolean);
    if (!requestedProductIds.length) throw new BadRequestException('productIds must include at least one product id');
    if (requestedProductIds.length > 100) throw new BadRequestException('Catalog feed readiness supports at most 100 products per request');

    const snapshots = await Promise.all(requestedProductIds.map((productId) => this.buildReadinessSnapshot(productId, feedType)));
    return buildCatalogFeedReadinessResponse(feedType, snapshots);
  }

  private async findReadinessSettings(feedType: string): Promise<any | null> {
    try {
      return await this.prisma.heurekaSettings.findUnique({ where: { feedType } });
    } catch (error: any) {
      if (!this.isMissingPrismaTable(error, "heureka_settings")) throw error;

      this.logger.warn(`Readiness settings lookup skipped because heureka_settings table is unavailable for feed type ${feedType}`);
      return null;
    }
  }

  private async buildReadinessSnapshot(productId: string, feedType: string): Promise<CatalogFeedReadinessSnapshot> {
    const settings = await this.findReadinessSettings(feedType);
    try {
      const product = await this.catalogClient.getProductById(productId);
      const [stock, pricing, media, feedSnapshot] = await Promise.all([
        this.warehouseClient.getTotalAvailable(productId),
        this.catalogClient.getProductPricing(productId),
        this.catalogClient.getProductMedia(productId),
        this.catalogClient.getHeurekaFeedSnapshot(productId, feedType),
      ]);
      const mediaItems = Array.isArray(media) ? media : [];
      const feedFields = this.buildHeurekaFeedFields(product, pricing, mediaItems, settings, feedSnapshot);
      const candidateFeedFields = Object.keys(feedFields).length
        ? Object.keys(feedFields)
        : ['ITEM_ID', 'PRODUCTNAME', 'DESCRIPTION', 'URL', 'IMGURL', 'PRICE_VAT', 'DELIVERY_DATE', 'DELIVERY', 'EAN', 'MANUFACTURER', 'CATEGORYTEXT'];

      return {
        productId,
        productFound: Boolean(product),
        productActive: this.isProductActive(product),
        name: this.optionalString(feedFields.PRODUCTNAME) || null,
        description: this.optionalString(feedFields.DESCRIPTION) || null,
        category: this.optionalString(feedFields.CATEGORYTEXT) || null,
        primaryImageUrl: this.optionalString(feedFields.IMGURL) || null,
        priceVat: feedFields.PRICE_VAT ?? null,
        availableStock: Number.isFinite(Number(stock)) ? Number(stock) : null,
        settingsActive: Boolean(settings?.isActive),
        renderableXml: this.canRenderFeedFields(feedFields),
        candidateFeedFields,
      };
    } catch (error: any) {
      this.logger.warn(`Readiness product snapshot unavailable for ${productId}: ${error.message}`);
      return {
        productId,
        productFound: false,
        settingsActive: Boolean(settings?.isActive),
      };
    }
  }

  private isProductActive(product: any): boolean {
    if (!product) return false;
    if (typeof product.isActive === 'boolean') return product.isActive;
    if (typeof product.status === 'string') return product.status.toLowerCase() !== 'inactive';
    return true;
  }

  private buildHeurekaFeedFields(product: any, pricing: any, mediaItems: any[], settings: any, feedSnapshot: any = null): Record<string, string | number | null> {
    const snapshotFields = this.normalizeFeedFields(feedSnapshot?.feedFields || feedSnapshot?.content?.feedFields);
    const primaryImage = mediaItems.find((item: any) => item.isPrimary) || mediaItems[0];
    const priceVat = this.optionalNumber(snapshotFields.PRICE_VAT) ?? this.resolvePriceVat(pricing);
    const delivery = this.optionalNumber(snapshotFields.DELIVERY) ?? this.calculateDeliveryPrice(Number(priceVat || 0), settings || {});

    return {
      ITEM_ID: this.optionalString(snapshotFields.ITEM_ID) || product?.id || null,
      PRODUCTNAME: this.optionalString(snapshotFields.PRODUCTNAME) || product?.title || product?.name || null,
      DESCRIPTION: this.optionalString(snapshotFields.DESCRIPTION) || product?.description || null,
      URL: this.optionalString(snapshotFields.URL) || `${settings?.shopUrl || process.env.SHOP_URL || 'https://heureka.alfares.cz'}/product/${product?.id}`,
      IMGURL: this.optionalString(snapshotFields.IMGURL) || primaryImage?.url || null,
      PRICE_VAT: priceVat,
      DELIVERY_DATE: this.optionalNumber(snapshotFields.DELIVERY_DATE) ?? (Number(settings?.deliveryDays || 0) || null),
      DELIVERY: delivery,
      EAN: this.optionalString(snapshotFields.EAN) || product?.ean || null,
      MANUFACTURER: this.optionalString(snapshotFields.MANUFACTURER) || product?.brand || product?.manufacturer || null,
      CATEGORYTEXT: this.optionalString(snapshotFields.CATEGORYTEXT) || this.resolveCatalogCategory(product),
    };
  }

  private normalizeFeedFields(value: any): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  private optionalString(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text ? text : null;
  }

  private optionalNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  private resolvePriceVat(pricing: any): number | null {
    return this.optionalNumber(pricing?.priceVat ?? pricing?.priceWithVat ?? pricing?.salePrice ?? pricing?.basePrice ?? pricing?.price);
  }

  private resolveCatalogCategory(product: any): string | null {
    const direct = this.optionalString(product?.categoryText || product?.categoryPath || product?.categoryName || product?.category);
    if (direct) return direct;
    if (Array.isArray(product?.categories)) {
      const categoryText = product.categories.map((category: any) => this.optionalString(category?.name)).filter(Boolean).join(' | ');
      return categoryText || null;
    }
    return null;
  }

  private canRenderFeedFields(feedFields: Record<string, unknown>): boolean {
    return Object.values(feedFields).every((field) => !this.hasXmlControlCharacters(field));
  }

  private hasRequiredPublicFeedFields(feedFields: Record<string, unknown>): boolean {
    const required = ['ITEM_ID', 'PRODUCTNAME', 'DESCRIPTION', 'IMGURL', 'PRICE_VAT', 'CATEGORYTEXT'];
    return required.every((key) => this.optionalString(feedFields[key]) !== null) && this.canRenderFeedFields(feedFields);
  }

  private hasXmlControlCharacters(value: unknown): boolean {
    return typeof value === 'string' && /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
  }

  private isMissingPrismaTable(error: any, tableName: string): boolean {
    const message = String(error?.message || "");
    const metaTable = String(error?.meta?.table || error?.meta?.tableName || "");
    return error?.code === "P2021" || message.includes(tableName) || metaTable.includes(tableName);
  }

  private publicFeedProduct(feedProduct: any) {
    return {
      id: feedProduct.id,
      productId: feedProduct.productId,
      isIncluded: feedProduct.isIncluded,
      createdAt: feedProduct.createdAt,
      updatedAt: feedProduct.updatedAt,
    };
  }
}
