import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CatalogClientService, LoggerService, PrismaService, WarehouseClientService } from '@heureka/shared';
import { FeedService } from '../feed/feed.service';

type DashboardUser = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles?: string[];
};

type ProductListQuery = {
  search?: string;
  page?: number;
  limit?: number;
  feedType?: string;
};

type CatalogMarketplaceProfileClient = CatalogClientService & {
  getHeurekaContentPreview?: (productId: string) => Promise<any | null>;
  getHeurekaMarketplaceFields?: (productId: string) => Promise<any | null>;
  updateHeurekaMarketplaceFields?: (productId: string, input: Record<string, unknown>) => Promise<any | null>;
};

@Injectable()
export class DashboardService {
  private readonly defaultAdminEmails = ['ssfskype@gmail.com', 'test@example.com'];
  private readonly defaultAdminRoles = [
    'global:superadmin',
    'global:platform_admin',
    'app:heureka-service:admin',
    'app:heureka:admin',
    'heureka:admin',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogClient: CatalogClientService,
    private readonly warehouseClient: WarehouseClientService,
    private readonly feedService: FeedService,
    private readonly httpService: HttpService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('HeurekaDashboardService');
  }

  getCurrentUser(user: DashboardUser) {
    const normalized = this.normalizeUser(user);
    return {
      id: normalized.id,
      email: normalized.email,
      firstName: normalized.firstName || null,
      lastName: normalized.lastName || null,
      roles: normalized.roles,
      isAdmin: this.isAdmin(normalized),
      adminPolicy: {
        roleBased: this.hasAdminRole(normalized),
        emailAllowlisted: this.isAdminEmail(normalized.email),
      },
    };
  }

  async getSummary(user: DashboardUser, feedType = 'heureka_cz') {
    this.normalizeUser(user);
    const [catalog, includedCount, linkedCount, offerCount, orderCount, latestFeed, settings] = await Promise.all([
      this.catalogClient.searchProducts({ isActive: true, page: 1, limit: 1 }),
      this.prisma.heurekaProduct.count({ where: { isIncluded: true } }),
      this.prisma.heurekaProduct.count(),
      this.prisma.heurekaOffer.count({ where: { isActive: true } }),
      this.prisma.heurekaOrder.count(),
      this.prisma.heurekaFeed.findFirst({ where: { feedType }, orderBy: { createdAt: 'desc' } }),
      this.prisma.heurekaSettings.findUnique({ where: { feedType } }).catch(() => null),
    ]);
    const catalogTotal = Number(catalog.total || 0);
    const needsData = Math.max(catalogTotal - includedCount, 0);
    return {
      feedType,
      catalogProducts: catalogTotal,
      linkedProducts: linkedCount,
      includedProducts: includedCount,
      activeOffers: offerCount,
      orderCount,
      needsData,
      readyPercent: catalogTotal ? Math.round((includedCount / catalogTotal) * 100) : 0,
      settingsActive: Boolean(settings?.isActive),
      latestFeed: latestFeed ? this.serializeFeed(latestFeed) : null,
      admin: this.isAdmin(user),
    };
  }

  async listProducts(user: DashboardUser, query: ProductListQuery) {
    this.normalizeUser(user);
    const page = this.clampNumber(query.page, 1, 1, 10000);
    const limit = this.clampNumber(query.limit, 20, 1, 50);
    const search = String(query.search || '').trim().slice(0, 120);
    const feedType = query.feedType || 'heureka_cz';
    const catalog = await this.catalogClient.searchProducts({ search, isActive: true, page, limit });
    const items = Array.isArray(catalog.items) ? catalog.items : [];
    const productIds = items.map((product) => this.getCatalogProductId(product)).filter(Boolean);

    const [includedRows, offers] = await Promise.all([
      productIds.length
        ? this.prisma.heurekaProduct.findMany({ where: { productId: { in: productIds } } })
        : Promise.resolve([]),
      productIds.length
        ? this.prisma.heurekaOffer.findMany({ where: { productId: { in: productIds } }, orderBy: { updatedAt: 'desc' } })
        : Promise.resolve([]),
    ]);

    const includedByProduct = new Map(includedRows.map((row) => [row.productId, row]));
    const offerByProduct = new Map<string, any>();
    offers.forEach((offer) => {
      if (offer.productId && !offerByProduct.has(offer.productId)) {
        offerByProduct.set(offer.productId, offer);
      }
    });

    const products = await Promise.all(items.map(async (product) => {
      const productId = this.getCatalogProductId(product);
      const [stock, pricing, media] = productId
        ? await Promise.all([
            this.warehouseClient.getTotalAvailable(productId),
            this.catalogClient.getProductPricing(productId),
            this.catalogClient.getProductMedia(productId),
          ])
        : [0, null, []];
      return this.buildDashboardProduct(product, {
        feedType,
        includedRow: productId ? includedByProduct.get(productId) : null,
        offer: productId ? offerByProduct.get(productId) : null,
        stock,
        pricing,
        media,
      });
    }));

    return {
      feedType,
      products,
      pagination: {
        total: catalog.total,
        page: catalog.page,
        limit: catalog.limit,
      },
    };
  }

  async getProductDetail(user: DashboardUser, productId: string, feedType = 'heureka_cz') {
    this.normalizeUser(user);
    const product = await this.catalogClient.getProductById(productId);
    if (!product) {
      throw new NotFoundException(`Catalog product ${productId} not found`);
    }

    const [stock, pricing, media, includedRow, offer, settings, contentPreview, marketplaceFields] = await Promise.all([
      this.warehouseClient.getTotalAvailable(productId),
      this.catalogClient.getProductPricing(productId),
      this.catalogClient.getProductMedia(productId),
      this.prisma.heurekaProduct.findUnique({ where: { productId } }),
      this.prisma.heurekaOffer.findFirst({ where: { productId }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.heurekaSettings.findUnique({ where: { feedType } }).catch(() => null),
      this.getHeurekaContentPreview(productId),
      this.getHeurekaMarketplaceFields(productId),
    ]);

    const dashboardProduct = this.buildDashboardProduct(product, {
      feedType,
      includedRow,
      offer,
      stock,
      pricing,
      media,
    });
    const previewPlainText = this.resolvePreviewPlainText(contentPreview);
    const listing = this.buildListing(product, offer, pricing, stock, previewPlainText, marketplaceFields);

    return {
      ...dashboardProduct,
      category: listing.category || dashboardProduct.category,
      settingsActive: Boolean(settings?.isActive),
      listing,
      media: this.normalizeMedia(media),
      gaps: this.getProductGaps(product, pricing, media, stock, previewPlainText, listing.category),
      catalogMarketplaceProfile: this.buildCatalogMarketplaceProfile(contentPreview, marketplaceFields),
    };
  }

  async updateListing(user: DashboardUser, productId: string, body: any) {
    const actor = this.normalizeUser(user);
    const product = await this.catalogClient.getProductById(productId);
    if (!product) {
      throw new NotFoundException(`Catalog product ${productId} not found`);
    }
    const account = await this.ensureDashboardAccount();
    const existing = await this.prisma.heurekaOffer.findFirst({ where: { productId }, orderBy: { updatedAt: 'desc' } });
    const title = this.optionalString(body.title) || product.title || product.name || null;
    const price = this.optionalNumber(body.price);
    const stockQuantity = this.clampNumber(Number(body.stockQuantity), 0, 0, 1000000);
    const isActive = body.isActive !== false;
    const data = {
      accountId: account.id,
      productId,
      title,
      price,
      stockQuantity,
      isActive,
    };

    const offer = existing
      ? await this.prisma.heurekaOffer.update({ where: { id: existing.id }, data })
      : await this.prisma.heurekaOffer.create({ data });

    await this.updateHeurekaMarketplaceOverrides(productId, title, body);

    if (body.includeInFeed !== undefined) {
      await this.setProductIncluded(actor, productId, body.includeInFeed !== false);
    }

    this.logger.log('Heureka listing updated from dashboard', {
      actorId: actor.id,
      actorEmail: actor.email,
      productId,
      offerId: offer.id,
    });

    return this.getProductDetail(actor, productId);
  }

  async setProductIncluded(user: DashboardUser, productId: string, include: boolean) {
    const actor = this.normalizeUser(user);
    const product = await this.catalogClient.getProductById(productId);
    if (!product) {
      throw new NotFoundException(`Catalog product ${productId} not found`);
    }
    const result = include
      ? await this.feedService.includeProductInFeed(productId, 'heureka_cz', { requestedBy: actor.email })
      : await this.feedService.excludeProductFromFeed(productId, 'heureka_cz', { requestedBy: actor.email });
    this.logger.log('Heureka feed inclusion changed from dashboard', {
      actorId: actor.id,
      actorEmail: actor.email,
      productId,
      include,
    });
    return {
      productId,
      isIncluded: result.included,
      feedProduct: result.feedProduct,
      readiness: result.readiness,
      readinessItem: result.readinessItem,
    };
  }

  async regenerateFeed(user: DashboardUser, feedType = 'heureka_cz') {
    const actor = this.normalizeUser(user);
    const result = await this.feedService.regenerateFeedWithLifecycle(feedType);
    this.logger.log('Heureka feed regenerated from dashboard', {
      actorId: actor.id,
      actorEmail: actor.email,
      feedType,
      generationMs: result.validation.generationMs,
      status: result.validation.status,
    });
    return {
      feedType,
      xmlLength: result.xml.length,
      validation: result.validation,
    };
  }

  async listOrders(user: DashboardUser, query: Record<string, string>) {
    this.normalizeUser(user);
    const limit = this.clampNumber(Number(query.limit), 25, 1, 100);
    const status = this.optionalString(query.status);
    const where = status && status !== 'all' ? { status } : {};

    const [orders, total, pending, forwarded, failed, cancelled] = await Promise.all([
      this.prisma.heurekaOrder.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit }),
      this.prisma.heurekaOrder.count({ where }),
      this.prisma.heurekaOrder.count({ where: { status: 'pending' } }),
      this.prisma.heurekaOrder.count({ where: { forwarded: true } }),
      this.prisma.heurekaOrder.count({ where: { status: 'failed' } }),
      this.prisma.heurekaOrder.count({ where: { status: 'cancelled' } }),
    ]);

    return {
      limit,
      status: status || 'all',
      total,
      statusCounts: { pending, forwarded, failed, cancelled },
      orders: orders.map((order) => this.serializeOrder(order)),
    };
  }

  async getOrderDetail(user: DashboardUser, id: string) {
    this.normalizeUser(user);
    const order = await this.prisma.heurekaOrder.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Heureka order ${id} not found`);
    }
    return this.serializeOrder(order);
  }

  async getDashboardFeedStatus(user: DashboardUser, feedType = 'heureka_cz') {
    this.normalizeUser(user);
    const [feedStatus, settings] = await Promise.all([
      this.feedService.getFeedStatus(feedType),
      this.prisma.heurekaSettings.findUnique({ where: { feedType } }).catch(() => null),
    ]);
    return {
      feedType,
      status: feedStatus,
      settings: settings ? this.serializeSettings(settings) : null,
      missing: settings ? [] : ['[MISSING: active Heureka feed settings]'],
    };
  }

  async getDashboardFeedHistory(user: DashboardUser, feedType = 'heureka_cz') {
    this.normalizeUser(user);
    const history = await this.prisma.heurekaFeed.findMany({ where: { feedType }, orderBy: { createdAt: 'desc' }, take: 25 });
    return {
      feedType,
      feeds: history.map((feed) => this.serializeFeed(feed)),
    };
  }

  async updateSettings(user: DashboardUser, body: Record<string, unknown>) {
    const actor = this.requireAdmin(user);
    const feedType = this.optionalString(body.feedType) || 'heureka_cz';
    const existing = await this.prisma.heurekaSettings.findUnique({ where: { feedType } }).catch(() => null);
    if (!existing) {
      throw new NotFoundException('[MISSING: active Heureka feed settings]');
    }

    const data = this.buildSettingsPatch(body);
    if (!Object.keys(data).length) {
      throw new BadRequestException('No supported Heureka settings fields provided');
    }

    const settings = await this.prisma.heurekaSettings.update({ where: { feedType }, data });
    this.logger.log('Heureka feed settings updated from dashboard', {
      actorId: actor.id,
      actorEmail: actor.email,
      feedType,
      changedFields: Object.keys(data),
    });
    return {
      feedType,
      settings: this.serializeSettings(settings),
      runtime: this.getRuntimeStatus(),
      missing: [],
    };
  }

  async getOperations(user: DashboardUser, feedType = 'heureka_cz') {
    this.normalizeUser(user);
    const [summary, feedStatus, feedHistory, settings, recentOrders] = await Promise.all([
      this.getSummary(user, feedType),
      this.feedService.getFeedStatus(feedType).catch((error: any) => ({
        status: 'unavailable',
        message: error?.message || 'Feed status unavailable',
      })),
      this.prisma.heurekaFeed.findMany({ where: { feedType }, orderBy: { createdAt: 'desc' }, take: 10 }),
      this.prisma.heurekaSettings.findUnique({ where: { feedType } }).catch(() => null),
      this.prisma.heurekaOrder.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);

    return {
      feedType,
      summary,
      feedStatus,
      feedHistory: feedHistory.map((feed) => this.serializeFeed(feed)),
      settings: settings ? this.serializeSettings(settings) : null,
      recentOrders: recentOrders.map((order) => this.serializeOrder(order)),
      runtime: this.getRuntimeStatus(),
      nextActions: this.buildOperationActions(summary, settings),
    };
  }

  async getOperationsHistory(user: DashboardUser, feedType = 'heureka_cz') {
    this.normalizeUser(user);
    const [feedHistory, orders] = await Promise.all([
      this.prisma.heurekaFeed.findMany({ where: { feedType }, orderBy: { createdAt: 'desc' }, take: 25 }),
      this.prisma.heurekaOrder.findMany({ orderBy: { createdAt: 'desc' }, take: 25 }),
    ]);
    return {
      feedType,
      feeds: feedHistory.map((feed) => this.serializeFeed(feed)),
      orders: orders.map((order) => this.serializeOrder(order)),
      missing: ['[MISSING: operation/audit log contract]'],
    };
  }

  async getSettings(user: DashboardUser, feedType = 'heureka_cz') {
    this.normalizeUser(user);
    const settings = await this.prisma.heurekaSettings.findUnique({ where: { feedType } }).catch(() => null);
    return {
      feedType,
      settings: settings ? this.serializeSettings(settings) : null,
      runtime: this.getRuntimeStatus(),
      missing: settings ? [] : ['[MISSING: active Heureka feed settings]'],
    };
  }

  async getAdminUsers(user: DashboardUser, authorization: string | undefined, query: Record<string, string>) {
    const actor = this.requireAdmin(user);
    const limit = this.clampNumber(Number(query.limit), 25, 1, 100);
    const offset = this.clampNumber(Number(query.offset), 0, 0, 1000000);
    const authUsers = await this.fetchAuthUsers(authorization, {
      limit,
      offset,
      search: query.search,
      applicationId: query.applicationId,
      status: query.status,
      verified: query.verified,
      adminOnly: query.adminOnly,
    });
    const localStats = await this.getLocalUsageStats();
    this.logger.log('Heureka admin users viewed', {
      actorId: actor.id,
      actorEmail: actor.email,
      authUsersAvailable: authUsers.available,
      count: authUsers.count || 0,
    });
    return {
      source: 'auth-microservice',
      users: authUsers.users,
      count: authUsers.count,
      limit,
      offset,
      available: authUsers.available,
      missing: authUsers.missing,
      localStats,
    };
  }

  async getAdminStats(user: DashboardUser, authorization: string | undefined) {
    const actor = this.requireAdmin(user);
    const [summary, authUsers, localStats] = await Promise.all([
      this.getSummary(actor),
      this.fetchAuthUsers(authorization, { limit: 5, offset: 0 }),
      this.getLocalUsageStats(),
    ]);
    return {
      summary,
      users: {
        source: 'auth-microservice',
        available: authUsers.available,
        count: authUsers.count,
        sampled: authUsers.users.length,
        missing: authUsers.missing,
      },
      localStats,
    };
  }

  private async fetchAuthUsers(authorization: string | undefined, params: Record<string, any>) {
    if (!authorization) {
      return { available: false, users: [], count: 0, missing: ['[MISSING: bearer token for Auth admin users]'] };
    }
    const baseUrl = (process.env.AUTH_SERVICE_URL || 'https://auth.alfares.cz').replace(/\/$/, '');
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${baseUrl}/auth/admin/users`, {
          headers: { Authorization: authorization },
          params,
          timeout: Number(process.env.AUTH_ADMIN_USERS_TIMEOUT_MS || 10000),
          validateStatus: () => true,
        }),
      );
      if (response.status < 200 || response.status >= 300 || !response.data?.success) {
        return {
          available: false,
          users: [],
          count: 0,
          missing: [`[MISSING: Auth admin users API returned ${response.status}]`],
        };
      }
      return {
        available: true,
        users: Array.isArray(response.data.users) ? response.data.users : [],
        count: Number(response.data.count || 0),
        missing: [],
      };
    } catch (error: any) {
      this.logger.warn(`Auth admin users lookup failed: ${error.message}`);
      return {
        available: false,
        users: [],
        count: 0,
        missing: ['[MISSING: Auth admin users API unavailable]'],
      };
    }
  }

  private async getLocalUsageStats() {
    const [products, includedProducts, offers, activeOffers, orders, feeds, latestFeed] = await Promise.all([
      this.prisma.heurekaProduct.count(),
      this.prisma.heurekaProduct.count({ where: { isIncluded: true } }),
      this.prisma.heurekaOffer.count(),
      this.prisma.heurekaOffer.count({ where: { isActive: true } }),
      this.prisma.heurekaOrder.count(),
      this.prisma.heurekaFeed.count(),
      this.prisma.heurekaFeed.findFirst({ orderBy: { createdAt: 'desc' } }),
    ]);
    return {
      products,
      includedProducts,
      offers,
      activeOffers,
      orders,
      feeds,
      latestFeed: latestFeed ? this.serializeFeed(latestFeed) : null,
    };
  }

  private buildDashboardProduct(product: any, context: any) {
    const productId = this.getCatalogProductId(product);
    const pricing = context.pricing || {};
    const offer = context.offer;
    const media = this.normalizeMedia(context.media || []);
    const stock = Number(context.stock || 0);
    const price = this.toNumber(offer?.price ?? pricing.priceVat ?? pricing.priceWithVat ?? pricing.basePrice ?? pricing.price);
    const name = offer?.title || product.title || product.name || product.productName || 'Untitled product';
    const gaps = this.getProductGaps(product, pricing, media, stock);
    const quality = this.calculateQuality(gaps);
    const isIncluded = Boolean(context.includedRow?.isIncluded);
    const status = isIncluded
      ? (quality >= 80 && stock > 0 ? 'published' : 'needs_data')
      : 'not_published';

    return {
      id: productId,
      sku: product.sku || product.code || null,
      ean: product.ean || product.barcode || null,
      name,
      brand: product.brand || product.manufacturer || null,
      category: product.categoryText || product.categoryPath || product.categoryName || product.category || null,
      primaryImageUrl: media[0]?.url || null,
      price,
      availableStock: stock,
      feedType: context.feedType || 'heureka_cz',
      isIncluded,
      heurekaStatus: status,
      feedStatus: isIncluded ? 'included' : 'excluded',
      dataQuality: quality,
      gaps,
      offerId: offer?.id || null,
      updatedAt: offer?.updatedAt || context.includedRow?.updatedAt || product.updatedAt || null,
    };
  }

  private async getHeurekaContentPreview(productId: string): Promise<any | null> {
    const catalogClient = this.catalogClient as CatalogMarketplaceProfileClient;
    if (typeof catalogClient.getHeurekaContentPreview !== 'function') {
      this.logger.warn('Catalog Heureka content preview client method is unavailable');
      return null;
    }
    return catalogClient.getHeurekaContentPreview(productId);
  }

  private async getHeurekaMarketplaceFields(productId: string): Promise<any | null> {
    const catalogClient = this.catalogClient as CatalogMarketplaceProfileClient;
    if (typeof catalogClient.getHeurekaMarketplaceFields !== 'function') {
      this.logger.warn('Catalog Heureka marketplace fields client method is unavailable');
      return null;
    }
    return catalogClient.getHeurekaMarketplaceFields(productId);
  }

  private async updateHeurekaMarketplaceOverrides(productId: string, title: string | null, body: any) {
    const catalogClient = this.catalogClient as CatalogMarketplaceProfileClient;
    if (typeof catalogClient.updateHeurekaMarketplaceFields !== 'function') {
      this.logger.warn('Catalog Heureka marketplace fields update client method is unavailable');
      return null;
    }

    const overrides = this.buildHeurekaMarketplaceOverrides(title, body);
    if (!Object.keys(overrides).length) return null;

    return catalogClient.updateHeurekaMarketplaceFields(productId, { overrides, status: 'draft' });
  }

  private buildListing(product: any, offer: any, pricing: any, stock: number, descriptionFallback?: string | null, marketplaceFields?: any) {
    const overrides = this.resolveMarketplaceOverrides(marketplaceFields);
    return {
      title: offer?.title || overrides.productName || product.title || product.name || '',
      price: this.toNumber(offer?.price ?? pricing?.priceVat ?? pricing?.priceWithVat ?? pricing?.basePrice ?? pricing?.price),
      stockQuantity: Number(offer?.stockQuantity ?? stock ?? 0),
      isActive: offer?.isActive !== false,
      description: product.description || descriptionFallback || '',
      category: overrides.categoryText || product.categoryText || product.categoryPath || product.categoryName || product.category || '',
      ean: product.ean || product.barcode || '',
      brand: product.brand || product.manufacturer || '',
    };
  }

  private buildHeurekaMarketplaceOverrides(title: string | null, body: any) {
    const overrides: Record<string, unknown> = {};
    const productName = this.optionalString(body.productName ?? body.title ?? title);
    const categoryText = this.optionalString(body.categoryText ?? body.category ?? body.CATEGORYTEXT);
    const deliveryDate = this.optionalNumber(body.deliveryDate ?? body.delivery_date);
    const deliveryPrice = this.optionalNumber(body.deliveryPrice ?? body.delivery);

    if (productName) overrides.productName = productName;
    if (categoryText) overrides.categoryText = categoryText;
    if (deliveryDate !== null) overrides.deliveryDate = deliveryDate;
    if (deliveryPrice !== null) overrides.deliveryPrice = deliveryPrice;

    return overrides;
  }

  private buildCatalogMarketplaceProfile(contentPreview: any, marketplaceFields: any) {
    const hasContentPreview = contentPreview !== null && contentPreview !== undefined;
    const hasMarketplaceFields = marketplaceFields !== null && marketplaceFields !== undefined;

    if (!hasContentPreview && !hasMarketplaceFields) {
      return {
        status: 'dependency_gated',
        missing: ['[MISSING: Catalog heureka marketplace profile connector]'],
      };
    }

    return {
      status: 'available',
      contentPreview: hasContentPreview ? contentPreview : null,
      marketplaceFields: hasMarketplaceFields ? marketplaceFields : null,
      missing: [],
    };
  }

  private resolvePreviewPlainText(contentPreview: any): string | null {
    const candidates = [
      contentPreview?.content?.plainText,
      contentPreview?.plainText,
      contentPreview?.plain_text,
      contentPreview?.content?.plain_text,
      contentPreview?.preview?.content?.plainText,
      contentPreview?.preview?.plainText,
      contentPreview?.description,
    ];

    for (const candidate of candidates) {
      const text = this.optionalString(candidate);
      if (text) return text;
    }

    return null;
  }

  private resolveMarketplaceOverrides(marketplaceFields: any) {
    const profileOverrides = marketplaceFields?.profile?.overrides && typeof marketplaceFields.profile.overrides === 'object'
      ? marketplaceFields.profile.overrides
      : {};
    const fieldValue = (key: string) => {
      const field = Array.isArray(marketplaceFields?.fields)
        ? marketplaceFields.fields.find((item: any) => item?.key === key)
        : null;
      return this.optionalString(field?.value);
    };

    return {
      productName: this.optionalString(profileOverrides.productName) || fieldValue('productName'),
      categoryText: (
        this.optionalString(profileOverrides.categoryText) ||
        this.optionalString(profileOverrides.categoryPath) ||
        this.optionalString(profileOverrides.category) ||
        fieldValue('categoryText')
      ),
      deliveryDate: this.optionalNumber(profileOverrides.deliveryDate) ?? this.optionalNumber(fieldValue('deliveryDate')),
      deliveryPrice: this.optionalNumber(profileOverrides.deliveryPrice) ?? this.optionalNumber(fieldValue('deliveryPrice')),
    };
  }

  private getProductGaps(product: any, pricing: any, media: any[], stock: number, descriptionFallback?: string | null, categoryFallback?: string | null) {
    const gaps: string[] = [];
    if (!this.getCatalogProductId(product)) gaps.push('catalog_product_id');
    if (!(product.title || product.name || product.productName)) gaps.push('product_name');
    if (!(product.description || descriptionFallback)) gaps.push('description');
    if (!(product.ean || product.barcode)) gaps.push('ean');
    if (!(product.brand || product.manufacturer)) gaps.push('manufacturer');
    if (!(product.categoryText || product.categoryPath || product.categoryName || product.category || categoryFallback)) gaps.push('category');
    if (!this.toNumber(pricing?.priceVat ?? pricing?.priceWithVat ?? pricing?.basePrice ?? pricing?.price)) gaps.push('price');
    if (!media.length) gaps.push('image');
    if (Number(stock || 0) <= 0) gaps.push('stock');
    return gaps;
  }

  private calculateQuality(gaps: string[]) {
    const required = 9;
    return Math.max(0, Math.round(((required - Math.min(gaps.length, required)) / required) * 100));
  }

  private normalizeMedia(media: any[]) {
    return (Array.isArray(media) ? media : [])
      .filter((item) => item?.url)
      .sort((a, b) => Number(b.isPrimary || 0) - Number(a.isPrimary || 0))
      .map((item) => ({ id: item.id || item.url, url: item.url, isPrimary: Boolean(item.isPrimary), type: item.type || 'image' }));
  }

  private async ensureDashboardAccount() {
    const existing = await this.prisma.heurekaAccount.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
    if (existing) return existing;
    return this.prisma.heurekaAccount.create({
      data: {
        name: 'Dashboard default account',
        isActive: true,
      },
    });
  }

  private requireAdmin(user: DashboardUser) {
    const normalized = this.normalizeUser(user);
    if (!this.isAdmin(normalized)) {
      throw new ForbiddenException('Heureka admin access required');
    }
    return normalized;
  }

  private isAdmin(user: DashboardUser) {
    const normalized = this.normalizeUser(user);
    return this.isAdminEmail(normalized.email) || this.hasAdminRole(normalized);
  }

  private isAdminEmail(email: string) {
    const emails = new Set([
      ...this.defaultAdminEmails,
      ...String(process.env.HEUREKA_ADMIN_EMAILS || '')
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ]);
    return emails.has(String(email || '').toLowerCase());
  }

  private hasAdminRole(user: DashboardUser) {
    const configuredRoles = String(process.env.HEUREKA_ADMIN_ROLES || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const allowed = new Set([...this.defaultAdminRoles, ...configuredRoles]);
    return this.normalizeRoles(user.roles).some((role) => allowed.has(role));
  }

  private normalizeUser(user: DashboardUser): DashboardUser {
    return {
      id: String(user?.id || ''),
      email: String(user?.email || '').toLowerCase(),
      firstName: user?.firstName,
      lastName: user?.lastName,
      roles: this.normalizeRoles(user?.roles),
    };
  }

  private normalizeRoles(roles: unknown) {
    if (!Array.isArray(roles)) return [];
    return roles.map((role) => String(role || '').trim()).filter(Boolean);
  }

  private getCatalogProductId(product: any) {
    return String(product?.id || product?.productId || '').trim();
  }

  private clampNumber(value: number, fallback: number, min: number, max: number) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(Math.max(Math.trunc(numeric), min), max);
  }

  private optionalString(value: unknown) {
    const text = String(value ?? '').trim();
    return text || null;
  }

  private optionalNumber(value: unknown) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  private toNumber(value: any) {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value?.toNumber === 'function') return value.toNumber();
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  private serializeFeed(feed: any) {
    return {
      id: feed.id,
      feedType: feed.feedType,
      feedUrl: feed.feedUrl,
      productCount: feed.productCount,
      status: feed.status,
      generatedAt: feed.generatedAt,
      createdAt: feed.createdAt,
      updatedAt: feed.updatedAt,
    };
  }

  private serializeOrder(order: any) {
    return {
      id: order.id,
      accountId: order.accountId,
      externalOrderId: order.heurekaOrderId,
      orderId: order.orderId,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      total: this.toNumber(order.total) ?? 0,
      currency: order.currency,
      status: order.status,
      forwarded: Boolean(order.forwarded),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private serializeSettings(settings: any) {
    return {
      id: settings.id,
      feedType: settings.feedType,
      shopName: settings.shopName,
      shopUrl: settings.shopUrl,
      contactEmail: settings.contactEmail,
      contactPhone: settings.contactPhone,
      deliveryDays: settings.deliveryDays,
      deliveryPrice: this.toNumber(settings.deliveryPrice),
      freeDeliveryThreshold: this.toNumber(settings.freeDeliveryThreshold),
      currency: settings.currency,
      isActive: Boolean(settings.isActive),
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }

  private buildSettingsPatch(body: Record<string, unknown>) {
    const data: Record<string, unknown> = {};
    const textFields = ['shopName', 'shopUrl', 'contactEmail', 'contactPhone', 'currency'];
    for (const field of textFields) {
      if (body[field] === undefined) continue;
      const value = this.optionalString(body[field]);
      if (value !== null || field === 'contactPhone') data[field] = value;
    }

    if (body.deliveryDays !== undefined) {
      const value = this.optionalNumber(body.deliveryDays);
      if (value !== null) data.deliveryDays = Math.max(0, Math.trunc(value));
    }
    if (body.deliveryPrice !== undefined) {
      const value = this.optionalNumber(body.deliveryPrice);
      if (value !== null) data.deliveryPrice = value;
    }
    if (body.freeDeliveryThreshold !== undefined) {
      const value = this.optionalNumber(body.freeDeliveryThreshold);
      if (value !== null) data.freeDeliveryThreshold = value;
    }
    if (body.isActive !== undefined) {
      data.isActive = body.isActive === true || String(body.isActive).toLowerCase() === 'true';
    }

    return data;
  }

  private getRuntimeStatus() {
    return {
      shopUrl: process.env.SHOP_URL || 'https://heureka.alfares.cz',
      feedUrl: `${process.env.SHOP_URL || 'https://heureka.alfares.cz'}/heureka/feed?type=heureka_cz`,
      healthUrl: `${process.env.SHOP_URL || 'https://heureka.alfares.cz'}/health`,
      authServiceUrl: process.env.AUTH_SERVICE_URL || 'https://auth.alfares.cz',
      catalogServiceUrl: process.env.CATALOG_SERVICE_URL || 'http://catalog-microservice:3200',
      ordersServiceUrl: process.env.ORDERS_SERVICE_URL || process.env.ORDER_SERVICE_URL || null,
      loggingConfigured: Boolean(process.env.LOGGING_SERVICE_URL),
      warehouseConfigured: Boolean(process.env.WAREHOUSE_SERVICE_URL || process.env.WAREHOUSE_BASE_URL),
    };
  }

  private buildOperationActions(summary: any, settings: any) {
    const actions: string[] = [];
    if (!settings?.isActive) actions.push('activate_heureka_feed_settings');
    if (Number(summary?.needsData || 0) > 0) actions.push('resolve_catalog_product_gaps');
    if (Number(summary?.includedProducts || 0) > 0) actions.push('regenerate_feed');
    if (!actions.length) actions.push('monitor_feed_and_orders');
    return actions;
  }
}
