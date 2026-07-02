import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CatalogClientService, LoggerService, ORDER_LIFECYCLE_READ_CONTRACT_MISSING, OrderClientService, OrderReadResult, PrismaService, WarehouseClientService } from '@heureka/shared';
import { buildHeurekaOperationAuditReadModel, ECOSYSTEM_OPERATION_AUDIT_SCHEMA_BLOCKER } from '../operations/operation-event.schema';
import { FeedService } from '../feed/feed.service';
import { HeurekaOperationEventService } from '../operations/operation-event.service';

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
  feedStatus?: string;
  workflowStatus?: string;
  gap?: string;
  source?: string;
};

type CatalogSourceFilter = 'effective' | 'own' | 'alfares' | 'community';

type CatalogMarketplaceProfileClient = CatalogClientService & {
  getHeurekaContentPreview?: (productId: string) => Promise<any | null>;
  getHeurekaMarketplaceFields?: (productId: string) => Promise<any | null>;
  updateHeurekaMarketplaceFields?: (productId: string, input: Record<string, unknown>) => Promise<any | null>;
};

type CentralLifecycleState = 'available' | 'missing_id' | 'stale';

type CentralOrderLifecycle = {
  contractVersion: 'heureka.central-orders-status-read-model.v1';
  source: 'orders-microservice';
  state: CentralLifecycleState;
  orderId: string | null;
  centralOrderId: string | null;
  status: string;
  stage: string;
  stale: boolean;
  forwarded: boolean;
  localStatus: string | null;
  readAt: string;
  updatedAt?: string | null;
  reservationStatus?: string | null;
  warehouseHandoffStatus?: string | null;
  httpStatus?: number;
  errorSummary?: string;
  reason?: string;
  action?: string;
  missing: string[];
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
    @Optional() private readonly operationEvents?: HeurekaOperationEventService,
    @Optional() private readonly orderClient?: OrderClientService,
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

  async getSummary(user: DashboardUser, feedType = 'heureka_cz', authorization?: string) {
    this.normalizeUser(user);
    const [catalog, includedCount, linkedCount, offerCount, orderCount, latestFeed, settings] = await Promise.all([
      this.catalogClient.searchProducts({ isActive: true, catalogScope: 'effective', page: 1, limit: 1 }, { authorization }),
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

  async listProducts(user: DashboardUser, query: ProductListQuery, authorization?: string) {
    const actor = this.normalizeUser(user);
    const page = this.clampNumber(query.page, 1, 1, 10000);
    const limit = this.clampNumber(query.limit, 20, 1, 50);
    const search = String(query.search || '').trim().slice(0, 120);
    const feedType = query.feedType || 'heureka_cz';
    const feedStatus = this.optionalString(query.feedStatus);
    const workflowStatus = this.optionalString(query.workflowStatus);
    const gap = this.optionalString(query.gap);
    const source = this.normalizeCatalogSourceFilter(query.source);
    const catalogScope = this.catalogScopeForSourceFilter(source);
    const [catalog, catalogSettings] = await Promise.all([
      this.catalogClient.searchProducts({ search, isActive: true, catalogScope, page, limit }, { authorization }),
      this.catalogClient.getCatalogSettings({ authorization }),
    ]);
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

    const stockByProductId = await this.buildStockAvailabilityLookup(productIds);
    const products = await Promise.all(items.map(async (product) => {
      const productId = this.getCatalogProductId(product);
      const [pricing, media, marketplaceFields] = productId
        ? await Promise.all([
            this.catalogClient.getProductPricing(productId, { authorization }),
            this.catalogClient.getProductMedia(productId, { authorization }),
            this.getHeurekaMarketplaceFields(productId),
          ])
        : [null, [], null];
      return this.buildDashboardProduct(product, {
        feedType,
        includedRow: productId ? includedByProduct.get(productId) : null,
        offer: productId ? offerByProduct.get(productId) : null,
        stock: productId ? this.stockFromLookup(stockByProductId, productId) : 0,
        pricing,
        media,
        marketplaceFields,
        sourceSettings: catalogSettings,
        catalogScope,
        sourceFilter: source,
        actor,
      });
    }));

    const filteredProducts = this.filterDashboardProducts(products, { feedStatus, workflowStatus, gap });

    return {
      feedType,
      catalogScope,
      catalogSourceFilter: source,
      catalogSettingsAuthority: {
        source: 'catalog-microservice',
        settingsEndpoint: '/api/catalog/settings',
        accessProvisionEndpoint: '/api/catalog/access/provision',
        dashboardProductsUrl: 'https://catalog.alfares.cz/dashboard/products',
        dashboardCreateUrl: 'https://catalog.alfares.cz/dashboard/products/new',
        dashboardSettingsUrl: 'https://catalog.alfares.cz/dashboard/settings',
        settingsAvailable: Boolean(catalogSettings),
      },
      sourceOptions: this.buildCatalogSourceOptions(source, catalogSettings),
      products: filteredProducts,
      filters: {
        search,
        feedStatus,
        workflowStatus,
        gap,
        source,
        pageSize: products.length,
        returned: filteredProducts.length,
      },
      pagination: {
        total: catalog.total,
        page: catalog.page,
        limit: catalog.limit,
        filtered: filteredProducts.length,
      },
    };
  }

  async getProductDetail(user: DashboardUser, productId: string, feedType = 'heureka_cz', authorization?: string) {
    const actor = this.normalizeUser(user);
    const product = await this.catalogClient.getProductById(productId, { authorization, catalogScope: 'effective' });
    if (!product) {
      throw new NotFoundException(`Catalog product ${productId} not found`);
    }

    const [stock, pricing, media, includedRow, offer, settings, contentPreview, marketplaceFields, catalogSettings] = await Promise.all([
      this.warehouseClient.getTotalAvailable(productId),
      this.catalogClient.getProductPricing(productId, { authorization }),
      this.catalogClient.getProductMedia(productId, { authorization }),
      this.prisma.heurekaProduct.findUnique({ where: { productId } }),
      this.prisma.heurekaOffer.findFirst({ where: { productId }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.heurekaSettings.findUnique({ where: { feedType } }).catch(() => null),
      this.getHeurekaContentPreview(productId),
      this.getHeurekaMarketplaceFields(productId),
      this.catalogClient.getCatalogSettings({ authorization }),
    ]);

    const dashboardProduct = this.buildDashboardProduct(product, {
      feedType,
      includedRow,
      offer,
      stock,
      pricing,
      media,
      sourceSettings: catalogSettings,
      catalogScope: 'effective',
      sourceFilter: 'effective',
      actor,
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

  async updateProductResale(user: DashboardUser, productId: string, resaleEnabled: unknown, authorization?: string) {
    const actor = this.normalizeUser(user);
    if (typeof resaleEnabled !== 'boolean') {
      throw new BadRequestException('resaleEnabled must be a boolean');
    }

    const product = await this.catalogClient.getProductById(productId, { authorization, catalogScope: 'effective' });
    if (!product) {
      throw new NotFoundException(`Catalog product ${productId} not found`);
    }

    const source = this.buildCatalogSourceProjection(product, null, actor, 'effective');
    if (!source.ownedByCurrentUser) {
      throw new ForbiddenException('Only the Catalog product owner can change resale sharing from Heureka.');
    }

    const updated = await this.catalogClient.updateProduct(productId, { resaleEnabled }, { authorization });
    const productAfterUpdate = { ...product, ...(updated || {}), resaleEnabled };
    const [pricing, media, includedRow, offer, catalogSettings, stock] = await Promise.all([
      this.catalogClient.getProductPricing(productId, { authorization }),
      this.catalogClient.getProductMedia(productId, { authorization }),
      this.prisma.heurekaProduct.findUnique({ where: { productId } }),
      this.prisma.heurekaOffer.findFirst({ where: { productId }, orderBy: { updatedAt: 'desc' } }),
      this.catalogClient.getCatalogSettings({ authorization }),
      this.warehouseClient.getTotalAvailable(productId),
    ]);

    return this.buildDashboardProduct(productAfterUpdate, {
      feedType: 'heureka_cz',
      includedRow,
      offer,
      stock,
      pricing,
      media,
      sourceSettings: catalogSettings,
      catalogScope: 'effective',
      sourceFilter: 'effective',
      actor,
    });
  }

  async updateListing(user: DashboardUser, productId: string, body: any, authorization?: string) {
    const actor = this.normalizeUser(user);
    const product = await this.catalogClient.getProductById(productId, { authorization, catalogScope: 'effective' });
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
      await this.setProductIncluded(actor, productId, body.includeInFeed !== false, authorization);
    }

    this.logger.log('Heureka listing updated from dashboard', {
      actorId: actor.id,
      productId,
      offerId: offer.id,
    });
    await this.operationEvents?.append({
      feedType: 'heureka_cz',
      action: existing ? 'listing_updated' : 'listing_created',
      entityType: 'dashboard',
      entityId: offer.id,
      status: isActive ? 'active' : 'inactive',
      actorId: actor.id,
      summary: `Dashboard ${existing ? 'updated' : 'created'} Heureka listing`,
      productId,
      requestSummary: { title, price, stockQuantity, includeInFeed: body.includeInFeed ?? null },
      responseSummary: { offerId: offer.id },
    });

    return this.getProductDetail(actor, productId, 'heureka_cz', authorization);
  }

  async setProductIncluded(user: DashboardUser, productId: string, include: boolean, authorization?: string) {
    const actor = this.normalizeUser(user);
    const product = await this.catalogClient.getProductById(productId, { authorization, catalogScope: 'effective' });
    if (!product) {
      throw new NotFoundException(`Catalog product ${productId} not found`);
    }
    const result = include
      ? await this.feedService.includeProductInFeed(productId, 'heureka_cz', { requestedBy: actor.email })
      : await this.feedService.excludeProductFromFeed(productId, 'heureka_cz', { requestedBy: actor.email });
    this.logger.log('Heureka feed inclusion changed from dashboard', {
      actorId: actor.id,
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
      feedType,
      generationMs: result.validation.generationMs,
      status: result.validation.status,
    });
    await this.operationEvents?.append({
      feedType,
      action: 'feed_regenerate_requested',
      entityType: 'dashboard',
      entityId: result.validation.feedId || null,
      status: result.validation.status,
      actorId: actor.id,
      summary: `Dashboard regenerated ${feedType} feed with status ${result.validation.status}`,
      requestSummary: { feedType },
      responseSummary: { generationMs: result.validation.generationMs, productCount: result.validation.includedProductCount },
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

    const readModels = await this.serializeOrdersWithCentralLifecycle(orders);

    return {
      limit,
      status: status || 'all',
      total,
      statusCounts: { pending, forwarded, failed, cancelled },
      centralStatusCounts: this.countCentralLifecycle(readModels),
      orders: readModels,
    };
  }

  async getOrderDetail(user: DashboardUser, id: string) {
    this.normalizeUser(user);
    const order = await this.prisma.heurekaOrder.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Heureka order ${id} not found`);
    }
    return this.serializeOrderWithCentralLifecycle(order);
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
      feedType,
      changedFields: Object.keys(data),
    });
    await this.operationEvents?.append({
      feedType,
      action: 'settings_updated',
      entityType: 'dashboard',
      entityId: settings.id,
      status: settings.isActive ? 'active' : 'inactive',
      actorId: actor.id,
      summary: `Dashboard updated ${feedType} feed settings`,
      requestSummary: { changedFields: Object.keys(data) },
    });
    return {
      feedType,
      settings: this.serializeSettings(settings),
      runtime: this.getRuntimeStatus(),
      missing: [],
    };
  }

  async getOperations(user: DashboardUser, feedType = 'heureka_cz', authorization?: string) {
    this.normalizeUser(user);
    const [summary, feedStatus, feedHistory, settings, recentOrders] = await Promise.all([
      this.getSummary(user, feedType, authorization),
      this.feedService.getFeedStatus(feedType).catch((error: any) => ({
        status: 'unavailable',
        message: error?.message || 'Feed status unavailable',
      })),
      this.prisma.heurekaFeed.findMany({ where: { feedType }, orderBy: { createdAt: 'desc' }, take: 10 }),
      this.prisma.heurekaSettings.findUnique({ where: { feedType } }).catch(() => null),
      this.prisma.heurekaOrder.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);

    const recentOrderReadModels = await this.serializeOrdersWithCentralLifecycle(recentOrders);

    return {
      feedType,
      summary,
      feedStatus,
      feedHistory: feedHistory.map((feed) => this.serializeFeed(feed)),
      settings: settings ? this.serializeSettings(settings) : null,
      recentOrders: recentOrderReadModels,
      centralStatusCounts: this.countCentralLifecycle(recentOrderReadModels),
      runtime: this.getRuntimeStatus(),
      nextActions: this.buildOperationActions(summary, settings),
    };
  }

  async getOperationsHistory(user: DashboardUser, feedType = 'heureka_cz') {
    this.normalizeUser(user);
    const [feedHistory, orders, offers, products, settings, operationEventLog] = await Promise.all([
      this.prisma.heurekaFeed.findMany({ where: { feedType }, orderBy: { createdAt: 'desc' }, take: 25 }),
      this.prisma.heurekaOrder.findMany({ orderBy: { createdAt: 'desc' }, take: 25 }),
      this.prisma.heurekaOffer.findMany({ orderBy: { updatedAt: 'desc' }, take: 25 }),
      this.prisma.heurekaProduct.findMany({ orderBy: { updatedAt: 'desc' }, take: 25 }),
      this.prisma.heurekaSettings.findMany({ orderBy: { updatedAt: 'desc' }, take: 10 }).catch(() => []),
      this.operationEvents?.list(feedType, 50) || Promise.resolve({ events: [], missing: ['[MISSING: durable operation/audit log contract]', '[MISSING: Heureka typed operation event writer]'], readModel: buildHeurekaOperationAuditReadModel([], 50) }),
    ]);
    const operationEvents = [
      ...operationEventLog.events,
      ...this.buildOperationEvents({ feedHistory, orders, offers, products, settings }),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50);
    return {
      feedType,
      feeds: feedHistory.map((feed) => this.serializeFeed(feed)),
      orders: orders.map((order) => this.serializeOrder(order)),
      offers: offers.map((offer) => this.serializeOfferEventSource(offer)),
      products: products.map((product) => this.serializeFeedProductEventSource(product)),
      settings: settings.map((item) => this.serializeSettings(item)),
      operationEvents,
      operationEventLog: operationEventLog.readModel,
      missing: [
        ...operationEventLog.missing,
        ECOSYSTEM_OPERATION_AUDIT_SCHEMA_BLOCKER,
      ],
    };
  }

  async getReadinessLanes(user: DashboardUser, feedType = 'heureka_cz', authorization?: string) {
    this.normalizeUser(user);
    const catalog = await this.collectActiveCatalogProducts(500, authorization);
    const productIds = catalog.items.map((product) => this.getCatalogProductId(product)).filter(Boolean);
    const readinessResponses = await this.collectBulkReadiness(feedType, productIds);
    const readinessItems = readinessResponses.flatMap((response) => Array.isArray(response?.items) ? response.items : []);
    const blockerIndex = this.indexReadinessBlockers(readinessItems);
    const lanes = this.buildReadinessLanes(blockerIndex.byCode);
    const productsById = new Map(catalog.items.map((product) => [this.getCatalogProductId(product), product]));
    const readinessById = new Map(readinessItems.map((item) => [String(item?.productId || ''), item]));
    const blockedProductIds = Array.from(new Set(Object.values(blockerIndex.byCode).flat())).sort();

    return {
      contractVersion: 'heureka-dashboard-readiness-lanes.v1',
      generatedAt: new Date().toISOString(),
      readOnly: true,
      mutations: [],
      feedType,
      inputs: {
        activeCatalogProductsReturned: productIds.length,
        activeCatalogProductsReportedTotal: catalog.total,
        activeCatalogProductsTruncated: catalog.truncated,
      },
      readiness: {
        contractVersions: Array.from(new Set(readinessResponses.map((response) => response?.contractVersion).filter(Boolean))),
        summary: this.summarizeReadinessItems(readinessItems),
        blockerCounts: blockerIndex.counts,
      },
      lanes,
      blockedProducts: blockedProductIds.map((productId) => this.buildReadinessBlockedProduct(productId, productsById, readinessById)),
      nextActions: this.buildReadinessLaneNextActions(lanes),
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
      this.getSummary(actor, 'heureka_cz', authorization),
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

  private buildOperationEvents(input: { feedHistory: any[]; orders: any[]; offers: any[]; products: any[]; settings: any[] }) {
    const events = [
      ...(input.feedHistory || []).map((feed) => this.operationEvent({
        action: 'feed_generation',
        source: 'heureka_feeds',
        entityId: feed.id,
        status: feed.status,
        timestamp: feed.generatedAt || feed.updatedAt || feed.createdAt,
        summary: `${feed.feedType || 'heureka'} feed ${feed.status || 'updated'} with ${feed.productCount || 0} products`,
        metadata: {
          feedType: feed.feedType,
          productCount: feed.productCount,
          feedUrl: feed.feedUrl,
        },
      })),
      ...(input.orders || []).map((order) => this.operationEvent({
        action: order.forwarded ? 'order_forwarded' : 'order_received',
        source: 'heureka_orders',
        entityId: order.id,
        status: order.status,
        timestamp: order.updatedAt || order.createdAt,
        summary: `Heureka order ${order.heurekaOrderId || order.id} is ${order.status || 'unknown'}`,
        metadata: {
          externalOrderId: order.heurekaOrderId || null,
          centralOrderId: order.orderId || null,
          forwarded: Boolean(order.forwarded),
          total: this.toNumber(order.total) ?? 0,
          currency: order.currency,
        },
      })),
      ...(input.offers || []).map((offer) => this.operationEvent({
        action: offer.isActive === false ? 'listing_inactive' : 'listing_updated',
        source: 'heureka_offers',
        entityId: offer.id,
        status: offer.isActive === false ? 'inactive' : 'active',
        timestamp: offer.updatedAt || offer.createdAt,
        summary: `Heureka listing ${offer.title || offer.productId || offer.id} is ${offer.isActive === false ? 'inactive' : 'active'}`,
        metadata: {
          productId: offer.productId || null,
          stockQuantity: offer.stockQuantity,
          price: this.toNumber(offer.price),
        },
      })),
      ...(input.products || []).map((product) => this.operationEvent({
        action: product.isIncluded ? 'feed_product_included' : 'feed_product_excluded',
        source: 'heureka_products',
        entityId: product.id,
        status: product.isIncluded ? 'included' : 'excluded',
        timestamp: product.updatedAt || product.createdAt,
        summary: `Catalog product ${product.productId} is ${product.isIncluded ? 'included in' : 'excluded from'} Heureka feed`,
        metadata: {
          productId: product.productId,
          isIncluded: Boolean(product.isIncluded),
        },
      })),
      ...(input.settings || []).map((settings) => this.operationEvent({
        action: settings.isActive ? 'settings_active' : 'settings_inactive',
        source: 'heureka_settings',
        entityId: settings.id,
        status: settings.isActive ? 'active' : 'inactive',
        timestamp: settings.updatedAt || settings.createdAt,
        summary: `Feed settings ${settings.feedType || settings.id} are ${settings.isActive ? 'active' : 'inactive'}`,
        metadata: {
          feedType: settings.feedType,
          shopName: settings.shopName,
          currency: settings.currency,
        },
      })),
    ].filter((event) => event.timestamp);

    return events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50);
  }

  private operationEvent(input: { action: string; source: string; entityId: string; status?: string | null; timestamp: any; summary: string; metadata?: Record<string, unknown> }) {
    return {
      eventType: input.action,
      action: input.action,
      source: input.source,
      entityId: input.entityId,
      status: input.status || 'unknown',
      timestamp: input.timestamp,
      summary: input.summary,
      metadata: input.metadata || {},
      durability: 'derived_from_existing_row',
    };
  }

  private serializeOfferEventSource(offer: any) {
    return {
      id: offer.id,
      productId: offer.productId,
      title: offer.title,
      price: this.toNumber(offer.price),
      stockQuantity: offer.stockQuantity,
      isActive: Boolean(offer.isActive),
      createdAt: offer.createdAt,
      updatedAt: offer.updatedAt,
    };
  }

  private serializeFeedProductEventSource(product: any) {
    return {
      id: product.id,
      productId: product.productId,
      isIncluded: Boolean(product.isIncluded),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
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

  private async collectActiveCatalogProducts(maxProducts = 500, authorization?: string) {
    const limit = 100;
    const items: any[] = [];
    let total = 0;

    for (let page = 1; items.length < maxProducts; page += 1) {
      const catalog = await this.catalogClient.searchProducts({ isActive: true, catalogScope: 'effective', page, limit }, { authorization });
      const pageItems = Array.isArray(catalog.items) ? catalog.items : [];
      items.push(...pageItems);
      total = Number(catalog.total || total || items.length);
      if (!pageItems.length || pageItems.length < limit || items.length >= total) break;
    }

    const byId = new Map<string, any>();
    for (const item of items.slice(0, maxProducts)) {
      const productId = this.getCatalogProductId(item);
      if (productId && !byId.has(productId)) byId.set(productId, item);
    }

    return {
      total: total || byId.size,
      items: Array.from(byId.values()),
      truncated: Boolean(total && byId.size < total),
    };
  }

  private async collectBulkReadiness(feedType: string, productIds: string[]) {
    const responses: any[] = [];
    for (let index = 0; index < productIds.length; index += 100) {
      const productIdChunk = productIds.slice(index, index + 100);
      if (!productIdChunk.length) continue;
      responses.push(await this.feedService.getBulkFeedReadiness(productIdChunk, feedType));
    }
    return responses;
  }

  private indexReadinessBlockers(readinessItems: any[]) {
    const byCode: Record<string, string[]> = {};
    for (const item of readinessItems || []) {
      const productId = this.optionalString(item?.productId);
      if (!productId) continue;
      for (const blocker of item?.blockers || []) {
        const code = this.optionalString(blocker?.code);
        if (!code) continue;
        if (!byCode[code]) byCode[code] = [];
        byCode[code].push(productId);
      }
    }

    for (const code of Object.keys(byCode)) {
      byCode[code] = Array.from(new Set(byCode[code])).sort();
    }

    return {
      byCode,
      counts: Object.fromEntries(Object.entries(byCode).sort(([left], [right]) => left.localeCompare(right)).map(([code, ids]) => [code, ids.length])),
    };
  }

  private summarizeReadinessItems(readinessItems: any[]) {
    const summary = { total: 0, ready: 0, warning: 0, blocked: 0, unknown: 0 };
    for (const item of readinessItems || []) {
      const state = this.optionalString(item?.readiness) || 'unknown';
      summary.total += 1;
      if (state === 'ready' || state === 'warning' || state === 'blocked' || state === 'unknown') {
        summary[state] += 1;
      } else {
        summary.unknown += 1;
      }
    }
    return summary;
  }

  private buildReadinessLanes(byCode: Record<string, string[]>) {
    const stockProductIds = Array.from(new Set([...(byCode.ZERO_STOCK || []), ...(byCode.STOCK_UNKNOWN || [])])).sort();
    const mediaProductIds = Array.from(new Set([...(byCode.MISSING_PRIMARY_IMAGE || []), ...(byCode.INVALID_IMAGE_URL || [])])).sort();
    const catalogProductIds = Array.from(new Set([
      ...(byCode.PRODUCT_NOT_FOUND || []),
      ...(byCode.PRODUCT_INACTIVE || []),
      ...(byCode.MISSING_PRODUCT_NAME || []),
      ...(byCode.MISSING_DESCRIPTION || []),
      ...(byCode.MISSING_CATEGORY || []),
      ...(byCode.PRICE_MISSING || []),
      ...(byCode.PRICE_NOT_POSITIVE || []),
    ])).sort();
    const settingsProductIds = Array.from(new Set([...(byCode.SETTINGS_INACTIVE || [])])).sort();

    return {
      stock: {
        status: stockProductIds.length ? 'blocked' : 'ready',
        ownerRole: 'Warehouse/data owner',
        productCount: stockProductIds.length,
        productIds: stockProductIds,
        blockerCodes: ['ZERO_STOCK', 'STOCK_UNKNOWN'].filter((code) => byCode[code]?.length),
        blockers: [
          ...(byCode.ZERO_STOCK?.length ? [`[MISSING: stock for ${byCode.ZERO_STOCK.length} current active products]`] : []),
          ...(byCode.STOCK_UNKNOWN?.length ? [`[MISSING: authoritative Warehouse availability for ${byCode.STOCK_UNKNOWN.length} current active products]`] : []),
          ...(stockProductIds.length ? ['[UNKNOWN: which zero-stock products should be listed on Heureka now]'] : []),
        ],
        nextAction: stockProductIds.length ? 'provide_authoritative_stock_or_exclusion_decision' : 'monitor',
      },
      media: {
        status: mediaProductIds.length ? 'blocked' : 'ready',
        ownerRole: 'Catalog media owner',
        productCount: mediaProductIds.length,
        productIds: mediaProductIds,
        blockerCodes: ['MISSING_PRIMARY_IMAGE', 'INVALID_IMAGE_URL'].filter((code) => byCode[code]?.length),
        blockers: [
          ...(byCode.MISSING_PRIMARY_IMAGE?.length ? [`[MISSING: primary image for ${byCode.MISSING_PRIMARY_IMAGE.length} current active products]`] : []),
          ...(mediaProductIds.length ? ['[MISSING: approved public image URLs or image files for affected products]'] : []),
          ...(byCode.INVALID_IMAGE_URL?.length ? [`[MISSING: public HTTPS image URL replacement for ${byCode.INVALID_IMAGE_URL.length} products]`] : []),
        ],
        nextAction: mediaProductIds.length ? 'attach_approved_public_primary_images' : 'monitor',
      },
      catalogContent: {
        status: catalogProductIds.length ? 'blocked' : 'ready',
        ownerRole: 'Catalog/pricing owner',
        productCount: catalogProductIds.length,
        productIds: catalogProductIds,
        blockerCodes: ['PRODUCT_NOT_FOUND', 'PRODUCT_INACTIVE', 'MISSING_PRODUCT_NAME', 'MISSING_DESCRIPTION', 'MISSING_CATEGORY', 'PRICE_MISSING', 'PRICE_NOT_POSITIVE'].filter((code) => byCode[code]?.length),
        blockers: [
          ...(byCode.PRODUCT_NOT_FOUND?.length ? [`[MISSING: Catalog rows for ${byCode.PRODUCT_NOT_FOUND.length} active products]`] : []),
          ...(byCode.PRODUCT_INACTIVE?.length ? [`[MISSING: active Catalog approval for ${byCode.PRODUCT_INACTIVE.length} products]`] : []),
          ...(byCode.MISSING_PRODUCT_NAME?.length ? [`[MISSING: public product name for ${byCode.MISSING_PRODUCT_NAME.length} products]`] : []),
          ...(byCode.MISSING_DESCRIPTION?.length ? [`[MISSING: public Heureka description for ${byCode.MISSING_DESCRIPTION.length} products]`] : []),
          ...(byCode.MISSING_CATEGORY?.length ? [`[MISSING: public Heureka category text for ${byCode.MISSING_CATEGORY.length} products]`] : []),
          ...((byCode.PRICE_MISSING?.length || byCode.PRICE_NOT_POSITIVE?.length) ? ['[MISSING: public VAT-inclusive price for affected products]'] : []),
        ],
        nextAction: catalogProductIds.length ? 'repair_catalog_marketplace_fields_or_pricing' : 'monitor',
      },
      feedSettings: {
        status: settingsProductIds.length ? 'blocked' : 'ready',
        ownerRole: 'Heureka channel owner',
        productCount: settingsProductIds.length,
        productIds: settingsProductIds,
        blockerCodes: ['SETTINGS_INACTIVE'].filter((code) => byCode[code]?.length),
        blockers: [
          ...(settingsProductIds.length ? ['[MISSING: active Heureka feed settings]'] : []),
        ],
        nextAction: settingsProductIds.length ? 'activate_feed_settings' : 'monitor',
      },
    };
  }

  private buildReadinessBlockedProduct(productId: string, productsById: Map<string, any>, readinessById: Map<string, any>) {
    const product = productsById.get(productId) || {};
    const readiness = readinessById.get(productId) || {};
    const blockerCodes = (readiness.blockers || []).map((blocker: any) => blocker?.code).filter(Boolean);
    return {
      productId,
      sku: product.sku || product.code || null,
      name: product.title || product.name || product.productName || null,
      readiness: readiness.readiness || 'unknown',
      availableStock: readiness.availableStock === undefined ? null : readiness.availableStock,
      settingsActive: readiness.settingsActive === undefined ? null : readiness.settingsActive,
      blockerCodes,
      ownerServices: Array.from(new Set((readiness.blockers || []).map((blocker: any) => blocker?.ownerService).filter(Boolean))),
      nextAction: this.nextActionForReadinessBlockers(blockerCodes),
    };
  }

  private nextActionForReadinessBlockers(blockerCodes: string[]) {
    if (blockerCodes.includes('ZERO_STOCK') || blockerCodes.includes('STOCK_UNKNOWN')) return 'stock_owner_decision';
    if (blockerCodes.includes('MISSING_PRIMARY_IMAGE') || blockerCodes.includes('INVALID_IMAGE_URL')) return 'media_backfill';
    if (blockerCodes.includes('SETTINGS_INACTIVE')) return 'activate_feed_settings';
    return blockerCodes.length ? 'repair_catalog_content' : 'monitor';
  }

  private buildReadinessLaneNextActions(lanes: Record<string, any>) {
    const actions = [];
    if (lanes.stock?.status === 'blocked') actions.push('Stock owner: provide authoritative current stock or exclusion decisions for zero-stock products.');
    if (lanes.media?.status === 'blocked') actions.push('Catalog media owner: attach approved public HTTPS primary images for affected products.');
    if (lanes.catalogContent?.status === 'blocked') actions.push('Catalog/pricing owner: repair missing public marketplace fields and pricing at the Catalog source.');
    if (lanes.feedSettings?.status === 'blocked') actions.push('Heureka channel owner: activate feed settings before publication.');
    return actions;
  }

  private filterDashboardProducts(products: any[], filters: { feedStatus?: string | null; workflowStatus?: string | null; gap?: string | null }) {
    return products.filter((product) => {
      if (filters.feedStatus && filters.feedStatus !== 'all' && product.feedStatus !== filters.feedStatus) {
        return false;
      }
      if (
        filters.workflowStatus &&
        filters.workflowStatus !== 'all' &&
        product.workflowStatus !== filters.workflowStatus &&
        product.heurekaStatus !== filters.workflowStatus
      ) {
        return false;
      }
      if (filters.gap && filters.gap !== 'all') {
        if (filters.gap === 'has_category') return !product.gaps?.includes('category');
        if (filters.gap === 'missing_category') return product.gaps?.includes('category');
        return product.gaps?.includes(filters.gap);
      }
      return true;
    });
  }

  private async buildStockAvailabilityLookup(productIds: string[]): Promise<Map<string, number | null>> {
    const normalizedProductIds = Array.from(new Set(
      productIds.map((productId) => String(productId || '').trim()).filter(Boolean),
    ));
    if (!normalizedProductIds.length) return new Map();

    const availabilityRows = await this.warehouseClient.getAvailabilityBatch(normalizedProductIds);
    const lookup = new Map<string, number | null>();
    for (const row of availabilityRows || []) {
      const productId = String(row?.productId || '').trim();
      if (!productId) continue;
      const totalAvailable = Number(row?.totalAvailable);
      lookup.set(productId, Number.isFinite(totalAvailable) ? totalAvailable : null);
    }
    return lookup;
  }

  private stockFromLookup(stockByProductId: Map<string, number | null>, productId: string): number {
    if (!stockByProductId.has(productId)) return 0;
    const stock = stockByProductId.get(productId);
    return Number.isFinite(Number(stock)) ? Number(stock) : 0;
  }

  private buildDashboardProduct(product: any, context: any) {
    const productId = this.getCatalogProductId(product);
    const pricing = context.pricing || {};
    const offer = context.offer;
    const media = this.normalizeMedia(context.media || []);
    const stock = Number(context.stock || 0);
    const price = this.toNumber(offer?.price ?? pricing.priceVat ?? pricing.priceWithVat ?? pricing.basePrice ?? pricing.price);
    const marketplaceOverrides = this.resolveMarketplaceOverrides(context.marketplaceFields);
    const category = marketplaceOverrides.categoryText || product.categoryText || product.categoryPath || product.categoryName || product.category || null;
    const name = offer?.title || marketplaceOverrides.productName || product.title || product.name || product.productName || 'Untitled product';
    const catalogSource = this.buildCatalogSourceProjection(product, context.sourceSettings, context.actor, context.catalogScope);
    const gaps = this.getProductGaps(product, pricing, media, stock, null, category);
    if (catalogSource.communityVisible === false) gaps.push('catalog_source_resale');
    const quality = this.calculateQuality(gaps);
    const isIncluded = Boolean(context.includedRow?.isIncluded);
    const status = isIncluded
      ? (quality >= 80 && stock > 0 ? 'published' : 'needs_data')
      : 'not_published';
    const workflow = this.buildProductWorkflowProjection({
      gaps,
      isIncluded,
      hasOffer: Boolean(offer),
    });

    return {
      id: productId,
      sku: product.sku || product.code || null,
      ean: product.ean || product.barcode || null,
      name,
      brand: product.brand || product.manufacturer || null,
      category,
      primaryImageUrl: media[0]?.url || null,
      price,
      availableStock: stock,
      feedType: context.feedType || 'heureka_cz',
      isIncluded,
      heurekaStatus: status,
      feedStatus: isIncluded ? 'included' : 'excluded',
      workflowStatus: workflow.workflowStatus,
      nextAction: workflow.nextAction,
      blockers: workflow.blockers,
      listingEditable: workflow.listingEditable,
      canIncludeInFeed: workflow.canIncludeInFeed,
      canConfirmPublish: workflow.canConfirmPublish,
      dataQuality: quality,
      gaps,
      offerId: offer?.id || null,
      catalogMarketplaceProfile: context.catalogMarketplaceProfile || this.buildCatalogMarketplaceProfile(null, context.marketplaceFields),
      catalogScope: context.catalogScope || 'effective',
      catalogSource,
      updatedAt: offer?.updatedAt || context.includedRow?.updatedAt || product.updatedAt || null,
    };
  }

  private buildCatalogSourceProjection(product: any, sourceSettings: any, actor?: DashboardUser, requestedScope?: string) {
    const token = this.optionalString(
      product.catalogSourceToken || product.sourceToken || product.sellerToken || product.ownerToken ||
      product.source?.token || product.seller?.token || product.owner?.token,
    );
    const rawLabel = this.optionalString(
      product.catalogSourceLabel || product.sourceLabel || product.sellerName || product.ownerName ||
      product.source?.label || product.source?.name || product.seller?.name || product.owner?.name,
    );
    const resaleEnabled = this.resolveResaleEnabled(product);
    const ownedByCurrentUser = this.isCurrentUsersCatalogProduct(product, actor);
    const type = this.resolveCatalogSourceType(product, {
      token,
      label: rawLabel,
      resaleEnabled,
      ownedByCurrentUser,
      requestedScope,
    });
    const label = rawLabel || this.catalogSourceTypeLabel(type);
    const communityVisible = this.resolveCommunityVisibility(product, resaleEnabled, token, label, type);
    const productId = this.getCatalogProductId(product);

    return {
      authority: 'catalog-microservice',
      settingsEndpoint: '/api/catalog/settings',
      accessProvisionEndpoint: '/api/catalog/access/provision',
      dashboardProductsUrl: 'https://catalog.alfares.cz/dashboard/products',
      dashboardCreateUrl: 'https://catalog.alfares.cz/dashboard/products/new',
      dashboardSettingsUrl: 'https://catalog.alfares.cz/dashboard/settings',
      settingsAvailable: Boolean(sourceSettings),
      token,
      label,
      type,
      ownedByCurrentUser,
      readOnlyCatalogRecord: !ownedByCurrentUser,
      resaleEnabled,
      communityVisible,
      canToggleResaleInHeureka: ownedByCurrentUser && Boolean(productId),
      resaleMutationPath: ownedByCurrentUser && productId ? `/heureka/dashboard/products/${encodeURIComponent(productId)}/resale` : null,
    };
  }

  private resolveResaleEnabled(product: any): boolean | null {
    const candidates = [
      product.resaleEnabled,
      product.resale?.enabled,
      product.source?.resaleEnabled,
      product.seller?.resaleEnabled,
      product.owner?.resaleEnabled,
    ];
    for (const candidate of candidates) {
      if (candidate === true || candidate === false) return candidate;
    }
    return null;
  }

  private resolveCommunityVisibility(product: any, resaleEnabled: boolean | null, token: string | null, label: string | null, sourceType?: string): boolean | null {
    if (sourceType === 'alfares' || this.isAlfaresProductSource(product, token, label)) return resaleEnabled === false ? false : true;
    if (sourceType === 'own') return resaleEnabled === true;
    if (sourceType === 'community') return resaleEnabled === false ? false : true;
    if (token || label) return resaleEnabled === true;
    return resaleEnabled === false ? false : null;
  }

  private isAlfaresProductSource(product: any, token?: string | null, label?: string | null): boolean {
    if (product.isAlfaresProduct === true || product.alfaresProduct === true) return true;
    const sourceValues = [
      token,
      label,
      product.catalogSource,
      product.catalogSourceToken,
      product.catalogSourceLabel,
      product.sourceType,
      product.sourceKind,
      product.ownerType,
      product.source?.type,
      product.source?.kind,
      product.source?.token,
      product.source?.label,
      product.source?.name,
    ];
    return sourceValues.some((value) => String(value || '').toLowerCase().includes('alfares'));
  }

  private normalizeCatalogSourceFilter(value?: string | null): CatalogSourceFilter {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'own' || normalized === 'alfares' || normalized === 'community') return normalized;
    return 'effective';
  }

  private catalogScopeForSourceFilter(source: CatalogSourceFilter): CatalogSourceFilter {
    return source;
  }

  private buildCatalogSourceOptions(selected: CatalogSourceFilter, sourceSettings: any) {
    const settingsAvailable = Boolean(sourceSettings);
    return [
      {
        value: 'effective',
        catalogScope: 'effective',
        label: 'All enabled Catalog sources',
        copy: 'Own, Alfares and community products enabled in Catalog settings.',
        selected: selected === 'effective',
        settingsAvailable,
      },
      {
        value: 'own',
        catalogScope: 'own',
        label: 'My Catalog products',
        copy: 'Products owned by the signed-in Auth user.',
        selected: selected === 'own',
        settingsAvailable,
      },
      {
        value: 'alfares',
        catalogScope: 'alfares',
        label: 'Alfares products',
        copy: 'Company Catalog products available to the account.',
        selected: selected === 'alfares',
        settingsAvailable,
      },
      {
        value: 'community',
        catalogScope: 'community',
        label: 'Community resale products',
        copy: 'Products other owners shared for resale through Catalog.',
        selected: selected === 'community',
        settingsAvailable,
      },
    ];
  }

  private resolveCatalogSourceType(product: any, context: { token: string | null; label: string | null; resaleEnabled: boolean | null; ownedByCurrentUser: boolean; requestedScope?: string | null }): CatalogSourceFilter | 'unknown' {
    const requestedScope = this.normalizeCatalogSourceFilter(context.requestedScope);
    if (requestedScope === 'own' || context.ownedByCurrentUser) return 'own';
    if (requestedScope === 'alfares' || this.isAlfaresProductSource(product, context.token, context.label)) return 'alfares';
    if (requestedScope === 'community') return 'community';

    const sourceValues = [
      product.catalogSource,
      product.sourceType,
      product.sourceKind,
      product.ownerType,
      product.source?.type,
      product.source?.kind,
      product.source?.visibility,
      product.resale?.visibility,
    ].map((value) => String(value || '').toLowerCase());

    if (sourceValues.some((value) => value.includes('alfares') || value.includes('company'))) return 'alfares';
    if (sourceValues.some((value) => value.includes('own') || value.includes('private'))) return 'own';
    if (sourceValues.some((value) => value.includes('community') || value.includes('resale') || value.includes('shared'))) return 'community';
    if ((context.token || context.label) && context.resaleEnabled !== null) return 'community';
    return 'unknown';
  }

  private catalogSourceTypeLabel(type: CatalogSourceFilter | 'unknown') {
    if (type === 'own') return 'My Catalog product';
    if (type === 'alfares') return 'Alfares';
    if (type === 'community') return 'Community resale';
    return 'Catalog source';
  }

  private isCurrentUsersCatalogProduct(product: any, actor?: DashboardUser): boolean {
    if (!actor) return false;
    const actorValues = [actor.id, actor.email].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean);
    if (!actorValues.length) return false;
    const ownerValues = [
      product.ownerUserId,
      product.owner_user_id,
      product.userId,
      product.user_id,
      product.createdByUserId,
      product.created_by_user_id,
      product.createdBy,
      product.owner?.id,
      product.owner?.userId,
      product.owner?.user_id,
      product.owner?.email,
      product.seller?.userId,
      product.seller?.email,
      product.source?.ownerUserId,
      product.source?.owner_user_id,
      product.source?.userId,
      product.source?.email,
    ].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean);
    return ownerValues.some((value) => actorValues.includes(value));
  }

  private buildProductWorkflowProjection(context: { gaps: string[]; isIncluded: boolean; hasOffer: boolean }) {
    const blockers = (context.gaps || []).map((gap) => ({
      code: String(gap || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
      field: gap,
      message: this.workflowBlockerMessage(gap),
    }));

    if (blockers.length) {
      return {
        workflowStatus: 'blocked',
        nextAction: 'resolve_data_gaps',
        blockers,
        listingEditable: true,
        canIncludeInFeed: false,
        canConfirmPublish: false,
      };
    }

    if (context.isIncluded) {
      return {
        workflowStatus: 'included',
        nextAction: 'monitor_feed',
        blockers,
        listingEditable: true,
        canIncludeInFeed: false,
        canConfirmPublish: false,
      };
    }

    if (context.hasOffer) {
      return {
        workflowStatus: 'draft',
        nextAction: 'include_in_feed',
        blockers,
        listingEditable: true,
        canIncludeInFeed: true,
        canConfirmPublish: true,
      };
    }

    return {
      workflowStatus: 'ready',
      nextAction: 'edit_listing',
      blockers,
      listingEditable: true,
      canIncludeInFeed: true,
      canConfirmPublish: true,
    };
  }

  private workflowBlockerMessage(gap: string) {
    const labels: Record<string, string> = {
      catalog_product_id: 'Catalog product identifier is missing.',
      product_name: 'Product name is missing.',
      description: 'Public product description is missing.',
      ean: 'EAN is missing.',
      manufacturer: 'Manufacturer or brand is missing.',
      category: 'Heureka category mapping is missing.',
      price: 'Price is missing.',
      image: 'Primary product image is missing.',
      stock: 'Warehouse stock is zero or unavailable.',
      catalog_source_resale: 'Catalog source resale is not enabled for community visibility.',
    };
    return labels[gap] || `Missing or invalid field: ${gap}`;
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

  private async serializeOrdersWithCentralLifecycle(orders: any[]) {
    return Promise.all((orders || []).map((order) => this.serializeOrderWithCentralLifecycle(order)));
  }

  private async serializeOrderWithCentralLifecycle(order: any) {
    const centralLifecycle = await this.getCentralOrderLifecycle(order);
    return this.serializeOrder(order, centralLifecycle);
  }

  private async getCentralOrderLifecycle(order: any): Promise<CentralOrderLifecycle> {
    const orderId = this.optionalString(order?.orderId);
    if (!orderId) return this.buildMissingCentralOrderIdLifecycle(order);

    if (!this.orderClient?.getOrderById) {
      return this.buildStaleCentralOrderLifecycle(order, {
        available: false,
        stale: true,
        order: null,
        missing: [ORDER_LIFECYCLE_READ_CONTRACT_MISSING],
        reason: 'order_client_unavailable',
      });
    }

    const read = await this.orderClient.getOrderById(orderId);
    if (!read?.available || !read.order) return this.buildStaleCentralOrderLifecycle(order, read);
    return this.buildAvailableCentralOrderLifecycle(order, read);
  }

  private buildMissingCentralOrderIdLifecycle(order: any): CentralOrderLifecycle {
    const forwarded = Boolean(order.forwarded);
    return {
      contractVersion: 'heureka.central-orders-status-read-model.v1',
      source: 'orders-microservice',
      state: 'missing_id',
      orderId: null,
      centralOrderId: null,
      status: 'unknown',
      stage: 'missing_order_id',
      stale: true,
      forwarded,
      localStatus: order.status || null,
      readAt: new Date().toISOString(),
      missing: ['[MISSING: central Orders id]'],
      reason: forwarded ? 'forwarded_order_missing_central_order_id' : 'heureka_order_not_forwarded_to_orders',
      action: forwarded ? 'repair_forwarded_order_id' : 'forward_or_replay_order_to_orders',
    };
  }

  private buildStaleCentralOrderLifecycle(order: any, read?: Partial<OrderReadResult> | null): CentralOrderLifecycle {
    return {
      contractVersion: 'heureka.central-orders-status-read-model.v1',
      source: 'orders-microservice',
      state: 'stale',
      orderId: order.orderId || null,
      centralOrderId: order.orderId || null,
      status: 'unknown',
      stage: 'stale',
      stale: true,
      forwarded: Boolean(order.forwarded),
      localStatus: order.status || null,
      readAt: new Date().toISOString(),
      httpStatus: read?.httpStatus,
      errorSummary: read?.errorSummary,
      reason: read?.reason || 'orders_lifecycle_read_unavailable',
      action: 'retry_orders_lifecycle_read',
      missing: read?.missing?.length ? read.missing : [ORDER_LIFECYCLE_READ_CONTRACT_MISSING],
    };
  }

  private buildAvailableCentralOrderLifecycle(order: any, read: OrderReadResult): CentralOrderLifecycle {
    const centralOrder = read.order || {};
    const status = this.optionalString(
      centralOrder.lifecycleStatus
      || centralOrder.status
      || centralOrder.orderStatus
      || centralOrder.state
      || centralOrder.currentStatus,
    ) || 'unknown';
    const stage = this.optionalString(
      centralOrder.lifecycleStage
      || centralOrder.stage
      || centralOrder.workflowStage
      || centralOrder.fulfillmentStage
      || centralOrder.statusStage,
    ) || status;
    const reservationStatus = this.optionalString(centralOrder.warehouseHandoff?.status)
      || this.findNestedString(centralOrder, ['reservationStatus', 'warehouseHandoffStatus', 'handoffStatus']);
    const missing = status === 'unknown' ? ['[UNKNOWN: central Orders lifecycle status field]'] : [];

    return {
      contractVersion: 'heureka.central-orders-status-read-model.v1',
      source: 'orders-microservice',
      state: 'available',
      orderId: order.orderId || null,
      centralOrderId: this.optionalString(centralOrder.id) || order.orderId || null,
      status,
      stage,
      stale: missing.length > 0,
      forwarded: Boolean(order.forwarded),
      localStatus: order.status || null,
      readAt: new Date().toISOString(),
      updatedAt: this.optionalString(centralOrder.lifecycleUpdatedAt || centralOrder.statusUpdatedAt || centralOrder.updatedAt),
      reservationStatus,
      warehouseHandoffStatus: reservationStatus,
      httpStatus: read.httpStatus,
      reason: missing.length ? 'orders_read_available_without_lifecycle_status' : 'orders_read_available',
      action: missing.length ? 'verify_orders_lifecycle_status_contract' : 'monitor_orders_lifecycle',
      missing,
    };
  }

  private countCentralLifecycle(orders: any[]) {
    return (orders || []).reduce((counts, order) => {
      const lifecycle = order.centralLifecycle || {};
      if (lifecycle.state === 'available' && !lifecycle.stale) counts.available += 1;
      if (lifecycle.state === 'missing_id') counts.missingId += 1;
      if (lifecycle.stale) counts.stale += 1;
      if (lifecycle.status === 'unknown') counts.unknown += 1;
      return counts;
    }, { available: 0, missingId: 0, stale: 0, unknown: 0 });
  }

  private findNestedString(value: any, keys: string[], depth = 0): string | null {
    if (!value || typeof value !== 'object' || depth > 4) return null;
    const normalizedKeys = keys.map((key) => key.toLowerCase());
    for (const [key, nested] of Object.entries(value)) {
      const normalizedKey = key.toLowerCase();
      if (typeof nested === 'string' && normalizedKeys.includes(normalizedKey)) {
        return this.optionalString(nested);
      }
      if (nested && typeof nested === 'object') {
        const found = this.findNestedString(nested, keys, depth + 1);
        if (found) return found;
      }
    }
    return null;
  }

  private serializeOrder(order: any, centralLifecycle?: CentralOrderLifecycle | null) {
    const localStatus = order.status || null;
    const lifecycleStatus = centralLifecycle?.status || localStatus || 'unknown';
    return {
      id: order.id,
      accountId: order.accountId,
      externalOrderId: order.heurekaOrderId,
      orderId: order.orderId,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      total: this.toNumber(order.total) ?? 0,
      currency: order.currency,
      status: lifecycleStatus,
      localStatus,
      lifecycleStatus,
      lifecycleStage: centralLifecycle?.stage || null,
      centralLifecycle: centralLifecycle || null,
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
