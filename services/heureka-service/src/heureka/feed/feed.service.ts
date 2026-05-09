import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, LoggerService, CatalogClientService, WarehouseClientService } from '@heureka/shared';

/**
 * Heureka Feed Service
 * Generates XML feeds in Heureka format from catalog products
 */
@Injectable()
export class FeedService {
  private readonly logger: LoggerService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogClient: CatalogClientService,
    private readonly warehouseClient: WarehouseClientService,
    loggerService: LoggerService,
  ) {
    this.logger = loggerService;
    this.logger.setContext('FeedService');
  }

  /**
   * Generate XML feed for Heureka
   */
  async generateFeed(feedType: string = 'heureka_cz'): Promise<string> {
    try {
      // Get settings for feed type
      const settings = await this.prisma.heurekaSettings.findUnique({
        where: { feedType },
      });

      if (!settings || !settings.isActive) {
        throw new NotFoundException(`Settings not found or inactive for feed type: ${feedType}`);
      }

      // Create feed record
      const feed = await this.prisma.heurekaFeed.create({
        data: {
          feedType,
          status: 'generating',
        },
      });

      try {
        // Get included products
        const includedProducts = await this.prisma.heurekaProduct.findMany({
          where: { isIncluded: true },
        });

        const productIds = includedProducts.map((p) => p.productId);
        this.logger.log(`Generating feed for ${productIds.length} products`, { feedType });

        // Fetch products from catalog-microservice
        const products = await Promise.all(
          productIds.map(async (productId) => {
            try {
              const product = await this.catalogClient.getProductById(productId);
              const stock = await this.warehouseClient.getTotalAvailable(productId);
              const pricing = await this.catalogClient.getProductPricing(productId);
              const media = await this.catalogClient.getProductMedia(productId);

              return {
                ...product,
                stock,
                price: pricing?.basePrice || 0,
                images: media.filter((m: any) => m.type === 'image'),
              };
            } catch (error: any) {
              this.logger.warn(`Failed to fetch product ${productId}: ${error.message}`);
              return null;
            }
          })
        );

        // Filter out null products
        const validProducts = products.filter((p) => p !== null && p.stock > 0);

        // Generate XML
        const xml = this.buildHeurekaXml(validProducts, settings);

        // Update feed record
        await this.prisma.heurekaFeed.update({
          where: { id: feed.id },
          data: {
            status: 'completed',
            productCount: validProducts.length,
            generatedAt: new Date(),
            feedUrl: `${process.env.SHOP_URL || settings.shopUrl}/feeds/${feedType}.xml`,
          },
        });

        this.logger.log(`Feed generated successfully: ${validProducts.length} products`, { feedId: feed.id });
        return xml;
      } catch (error: any) {
        await this.prisma.heurekaFeed.update({
          where: { id: feed.id },
          data: {
            status: 'failed',
          },
        });
        throw error;
      }
    } catch (error: any) {
      this.logger.error(`Failed to generate feed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Build Heureka XML format
   */
  private buildHeurekaXml(products: any[], settings: any): string {
    const items = products.map((product) => {
      const primaryImage = product.images?.find((img: any) => img.isPrimary) || product.images?.[0];
      const deliveryPrice = this.calculateDeliveryPrice(product.price, settings);

      let itemXml = `    <SHOPITEM>
      <ITEM_ID>${this.escapeXml(product.id)}</ITEM_ID>
      <PRODUCTNAME>${this.escapeXml(product.title || product.name || '')}</PRODUCTNAME>
      <DESCRIPTION>${this.escapeXml(product.description || '')}</DESCRIPTION>
      <URL>${this.escapeXml(`${settings.shopUrl}/product/${product.id}`)}</URL>`;

      if (primaryImage) {
        itemXml += `\n      <IMGURL>${this.escapeXml(primaryImage.url)}</IMGURL>`;
      }

      itemXml += `\n      <PRICE_VAT>${product.price}</PRICE_VAT>
      <DELIVERY_DATE>${settings.deliveryDays}</DELIVERY_DATE>
      <DELIVERY>${deliveryPrice}</DELIVERY>`;

      if (product.ean) {
        itemXml += `\n      <EAN>${this.escapeXml(product.ean)}</EAN>`;
      }

      if (product.brand) {
        itemXml += `\n      <MANUFACTURER>${this.escapeXml(product.brand)}</MANUFACTURER>`;
      }

      if (product.category) {
        itemXml += `\n      <CATEGORYTEXT>${this.escapeXml(product.category)}</CATEGORYTEXT>`;
      }

      itemXml += `\n    </SHOPITEM>`;
      return itemXml;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<SHOP>
${items}
</SHOP>`;
  }

  /**
   * Calculate delivery price based on free delivery threshold
   */
  private calculateDeliveryPrice(productPrice: number, settings: any): number {
    if (settings.freeDeliveryThreshold && productPrice >= Number(settings.freeDeliveryThreshold)) {
      return 0;
    }
    return Number(settings.deliveryPrice || 0);
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Regenerate feed
   */
  async regenerateFeed(feedType: string = 'heureka_cz'): Promise<string> {
    return this.generateFeed(feedType);
  }

  /**
   * Get feed history
   */
  async getFeedHistory(feedType?: string) {
    return this.prisma.heurekaFeed.findMany({
      where: feedType ? { feedType } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }
}

