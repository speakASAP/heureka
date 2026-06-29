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
            const product = await this.catalogClient.getProductById(productId);
            const stock = Number(await this.warehouseClient.getTotalAvailable(productId));
            const pricing = await this.catalogClient.getProductPricing(productId);
            const media = await this.catalogClient.getProductMedia(productId);
            return { ...product, stock: Number.isFinite(stock) ? stock : 0, price: pricing?.basePrice || 0, images: media.filter((m: any) => m.type === 'image') };
          } catch (error: any) {
            this.logger.warn(`Failed to fetch product ${productId}: ${error.message}`);
            return null;
          }
        }));

        const fetchedProducts = products.filter((p) => p !== null) as any[];
        const validProducts = fetchedProducts.filter((p) => Number(p.stock) > 0);
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
      const primaryImage = product.images?.find((img: any) => img.isPrimary) || product.images?.[0];
      const deliveryPrice = this.calculateDeliveryPrice(product.price, settings);
      let itemXml = `    <SHOPITEM>
      <ITEM_ID>${this.escapeXml(product.id)}</ITEM_ID>
      <PRODUCTNAME>${this.escapeXml(product.title || product.name || '')}</PRODUCTNAME>
      <DESCRIPTION>${this.escapeXml(product.description || '')}</DESCRIPTION>
      <URL>${this.escapeXml(`${settings.shopUrl}/product/${product.id}`)}</URL>`;
      if (primaryImage) itemXml += `\n      <IMGURL>${this.escapeXml(primaryImage.url)}</IMGURL>`;
      itemXml += `\n      <PRICE_VAT>${product.price}</PRICE_VAT>
      <DELIVERY_DATE>${settings.deliveryDays}</DELIVERY_DATE>
      <DELIVERY>${deliveryPrice}</DELIVERY>`;
      if (product.ean) itemXml += `\n      <EAN>${this.escapeXml(product.ean)}</EAN>`;
      if (product.brand) itemXml += `\n      <MANUFACTURER>${this.escapeXml(product.brand)}</MANUFACTURER>`;
      if (product.category) itemXml += `\n      <CATEGORYTEXT>${this.escapeXml(product.category)}</CATEGORYTEXT>`;
      itemXml += `\n    </SHOPITEM>`;
      return itemXml;
    }).join('\n');
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
      const [stock, pricing, media] = await Promise.all([
        this.warehouseClient.getTotalAvailable(productId),
        this.catalogClient.getProductPricing(productId),
        this.catalogClient.getProductMedia(productId),
      ]);
      const mediaItems = Array.isArray(media) ? media : [];
      const primaryImage = mediaItems.find((item: any) => item.isPrimary) || mediaItems[0];
      const priceVat = pricing?.priceVat ?? pricing?.priceWithVat ?? pricing?.basePrice ?? pricing?.price ?? null;
      const candidateFeedFields = Array.isArray(product?.candidateFeedFields)
        ? product.candidateFeedFields
        : ['ITEM_ID', 'PRODUCTNAME', 'DESCRIPTION', 'URL', 'IMGURL', 'PRICE_VAT', 'DELIVERY_DATE', 'DELIVERY', 'EAN', 'MANUFACTURER', 'CATEGORYTEXT'];

      return {
        productId,
        productFound: Boolean(product),
        productActive: this.isProductActive(product),
        name: product?.title || product?.name || null,
        description: product?.description || null,
        category: product?.categoryText || product?.categoryPath || product?.categoryName || product?.category || null,
        primaryImageUrl: primaryImage?.url || null,
        priceVat,
        availableStock: Number.isFinite(Number(stock)) ? Number(stock) : null,
        settingsActive: Boolean(settings?.isActive),
        renderableXml: this.canRenderProductXml(product, primaryImage?.url, priceVat),
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

  private canRenderProductXml(product: any, primaryImageUrl: string | undefined, priceVat: unknown): boolean {
    const fields = [product?.id, product?.title || product?.name, product?.description, primaryImageUrl, priceVat, product?.ean, product?.brand, product?.categoryText || product?.categoryPath || product?.categoryName || product?.category];
    return fields.every((field) => !this.hasXmlControlCharacters(field));
  }

  private hasXmlControlCharacters(value: unknown): boolean {
    return typeof value === 'string' && /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
  }

  private isMissingPrismaTable(error: any, tableName: string): boolean {
    const message = String(error?.message || "");
    const metaTable = String(error?.meta?.table || error?.meta?.tableName || "");
    return error?.code === "P2021" || message.includes(tableName) || metaTable.includes(tableName);
  }
}
