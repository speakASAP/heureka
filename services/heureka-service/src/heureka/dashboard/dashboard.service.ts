import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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

    const [stock, pricing, media, includedRow, offer, settings] = await Promise.all([
      this.warehouseClient.getTotalAvailable(productId),
      this.catalogClient.getProductPricing(productId),
      this.catalogClient.getProductMedia(productId),
      this.prisma.heurekaProduct.findUnique({ where: { productId } }),
      this.prisma.heurekaOffer.findFirst({ where: { productId }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.heurekaSettings.findUnique({ where: { feedType } }).catch(() => null),
    ]);

    const dashboardProduct = this.buildDashboardProduct(product, {
      feedType,
      includedRow,
      offer,
      stock,
      pricing,
      media,
    });

    return {
      ...dashboardProduct,
      settingsActive: Boolean(settings?.isActive),
      listing: this.buildListing(product, offer, pricing, stock),
      media: this.normalizeMedia(media),
      gaps: this.getProductGaps(product, pricing, media, stock),
      catalogMarketplaceProfile: {
        status: 'dependency_gated',
        missing: ['[MISSING: Catalog heureka marketplace profile connector]'],
      },
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

  private buildListing(product: any, offer: any, pricing: any, stock: number) {
    return {
      title: offer?.title || product.title || product.name || '',
      price: this.toNumber(offer?.price ?? pricing?.priceVat ?? pricing?.priceWithVat ?? pricing?.basePrice ?? pricing?.price),
      stockQuantity: Number(offer?.stockQuantity ?? stock ?? 0),
      isActive: offer?.isActive !== false,
      description: product.description || '',
      category: product.categoryText || product.categoryPath || product.categoryName || product.category || '',
      ean: product.ean || product.barcode || '',
      brand: product.brand || product.manufacturer || '',
    };
  }

  private getProductGaps(product: any, pricing: any, media: any[], stock: number) {
    const gaps: string[] = [];
    if (!this.getCatalogProductId(product)) gaps.push('catalog_product_id');
    if (!(product.title || product.name || product.productName)) gaps.push('product_name');
    if (!product.description) gaps.push('description');
    if (!(product.ean || product.barcode)) gaps.push('ean');
    if (!(product.brand || product.manufacturer)) gaps.push('manufacturer');
    if (!(product.categoryText || product.categoryPath || product.categoryName || product.category)) gaps.push('category');
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
}
