import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

function assertEqual(actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
}

function assertIncludes(values: readonly string[], expected: string): void {
  if (!values.includes(expected)) {
    throw new Error(`Expected ${expected} in ${values.join(',')}`);
  }
}

async function main(): Promise<void> {
  let stockBatchCalls = 0;
  let lastStockBatchIds: string[] = [];
  let readinessBatchCalls = 0;
  let lastReadinessBatchIds: string[] = [];
  const pricingCalls: string[] = [];
  const mediaCalls: string[] = [];
  const marketplaceCalls: string[] = [];
  const searchQueries: any[] = [];
  const catalogSettingsAuthorizations: Array<string | undefined> = [];

  const catalogClient = {
    searchProducts: async (query: any, context?: any) => {
      searchQueries.push({ query, context });
      return {
      items: [
        {
          id: 'catalog-product-1',
          sku: 'SKU-1',
          title: 'Dashboard Ready Product',
          description: 'Complete public description',
          ean: '8590000000011',
          brand: 'Alfares',
          catalogSourceLabel: 'Alfares',
          updatedAt: '2026-07-01T00:00:00.000Z',
        },
        {
          id: 'catalog-product-2',
          sku: 'SKU-2',
          title: 'Dashboard Zero Stock Product',
          description: 'Complete public description',
          ean: '8590000000028',
          brand: 'Alfares',
          source: { token: 'seller:test', label: 'Test Seller', resaleEnabled: true },
          categoryText: 'Elektronika | Test',
          updatedAt: '2026-07-01T00:00:00.000Z',
        },
      ],
      total: 2,
      page: 1,
      limit: 20,
    };
    },
    getProductPricing: async (productId: string, context?: any) => {
      pricingCalls.push(`${productId}:${context?.authorization || ''}`);
      return { priceVat: '199.00' };
    },
    getProductMedia: async (productId: string, context?: any) => {
      mediaCalls.push(`${productId}:${context?.authorization || ''}`);
      return [{ id: `media-${productId}`, url: `https://example.test/${productId}.jpg`, isPrimary: true }];
    },
    getHeurekaMarketplaceFields: async (productId: string) => {
      marketplaceCalls.push(productId);
      return productId === 'catalog-product-1'
        ? {
            profile: {
              overrides: { categoryText: 'Elektronika | Marketplace Override' },
              manualOverrides: { categoryText: { updatedAt: '2026-07-01T00:00:00.000Z' } },
            },
            propagation: { status: 'manual_review_required', staleManualFields: ['categoryText'] },
            fields: [
              { key: 'categoryText', value: 'Elektronika | Marketplace Override', manualOverride: true, stale: true, requiresManualReview: true },
              { key: 'deliveryDate', value: 0 },
            ],
          }
        : { profile: { overrides: {} }, fields: [] };
    },
    getCatalogSettings: async (context?: any) => {
      catalogSettingsAuthorizations.push(context?.authorization);
      return { sources: [{ token: 'alfares', label: 'Alfares', defaultEnabled: true }] };
    },
  };

  const warehouseClient = {
    getAvailabilityBatch: async (productIds: string[]) => {
      stockBatchCalls += 1;
      lastStockBatchIds = productIds;
      return [
        { productId: 'catalog-product-1', totalAvailable: 7 },
        { productId: 'catalog-product-2', totalAvailable: 0 },
      ];
    },
    getTotalAvailable: async () => {
      throw new Error('Dashboard product list should use Warehouse batch availability instead of N+1 total lookups.');
    },
  };

  const prisma = {
    heurekaProduct: {
      findMany: async () => ([{ productId: 'catalog-product-1', isIncluded: true, updatedAt: '2026-07-01T00:00:00.000Z' }]),
    },
    heurekaOffer: {
      findMany: async () => [],
    },
  };

  const logger = {
    setContext: () => undefined,
    log: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  };

  const feedService = {
    getBulkFeedReadiness: async (productIds: string[], feedType: string) => {
      readinessBatchCalls += 1;
      lastReadinessBatchIds = productIds;
      return {
        contractVersion: 'catalog-feed-readiness.v1',
        feedType,
        summary: { total: 2, ready: 1, warning: 0, blocked: 1, unknown: 0 },
        items: [
          { productId: 'catalog-product-1', readiness: 'ready', availableStock: 7, settingsActive: true, blockers: [] },
          {
            productId: 'catalog-product-2',
            readiness: 'blocked',
            availableStock: 0,
            settingsActive: true,
            blockers: [
              { code: 'ZERO_STOCK', ownerService: 'warehouse-service', severity: 'blocker' },
              { code: 'MISSING_PRIMARY_IMAGE', ownerService: 'catalog-media-service', severity: 'blocker' },
            ],
          },
        ],
      };
    },
  };

  const service = new DashboardService(
    prisma as any,
    catalogClient as any,
    warehouseClient as any,
    feedService as any,
    {} as any,
    logger as any,
  );

  const response = await service.listProducts(
    { id: 'user-1', email: 'user@example.test', roles: [] },
    { page: 1, limit: 20, feedType: 'heureka_cz' },
    'Bearer human-token',
  );
  const disabledSellerProjection = (service as any).buildDashboardProduct(
    {
      id: 'catalog-product-3',
      sku: 'SKU-3',
      title: 'Disabled Seller Product',
      description: 'Complete public description',
      ean: '8590000000035',
      brand: 'Seller Brand',
      categoryText: 'Elektronika | Test',
      source: { token: 'seller:disabled', label: 'Disabled Seller', resaleEnabled: false },
      updatedAt: '2026-07-01T00:00:00.000Z',
    },
    {
      stock: 5,
      pricing: { priceVat: '299.00' },
      media: [{ id: 'media-disabled', url: 'https://example.test/disabled.jpg', isPrimary: true }],
      sourceSettings: {},
      catalogScope: 'effective',
    },
  );

  assertEqual(searchQueries[0].query.catalogScope, 'effective');
  assertEqual(searchQueries[0].context.authorization, 'Bearer human-token');
  assertEqual(catalogSettingsAuthorizations[0], 'Bearer human-token');
  assertEqual(stockBatchCalls, 1);
  assertEqual(lastStockBatchIds.join(','), 'catalog-product-1,catalog-product-2');
  assertEqual(pricingCalls.join(','), 'catalog-product-1:Bearer human-token,catalog-product-2:Bearer human-token');
  assertEqual(mediaCalls.join(','), 'catalog-product-1:Bearer human-token,catalog-product-2:Bearer human-token');
  assertEqual(marketplaceCalls.join(','), 'catalog-product-1,catalog-product-2');
  assertEqual(response.catalogScope, 'effective');
  assertEqual(response.catalogSourceFilter, 'effective');
  assertEqual(response.catalogSettingsAuthority.settingsEndpoint, '/api/catalog/settings');
  assertEqual(response.catalogSettingsAuthority.dashboardCreateUrl, 'https://catalog.alfares.cz/dashboard/products/new');
  assertEqual(response.sourceOptions.length, 4);
  assertEqual(response.products.length, 2);
  assertEqual(response.products[0].availableStock, 7);
  assertEqual(response.products[0].category, 'Elektronika | Marketplace Override');
  assertEqual(response.products[0].catalogMarketplaceProfile.manualOverrideSummary.propagationStatus, 'manual_review_required');
  assertEqual(response.products[0].catalogMarketplaceProfile.manualOverrideSummary.reviewRequired, true);
  assertEqual(response.products[0].catalogMarketplaceProfile.manualOverrideSummary.manualFieldCount, 1);
  assertEqual(response.products[0].catalogMarketplaceProfile.manualOverrideSummary.staleFieldCount, 1);
  assertEqual(response.products[0].catalogMarketplaceProfile.manualOverrideSummary.staleFields.join(','), 'categoryText');
  assertEqual(response.products[0].catalogSource.label, 'Alfares');
  assertEqual(response.products[0].catalogSource.type, 'alfares');
  assertEqual(response.products[0].catalogSource.dashboardProductsUrl, 'https://catalog.alfares.cz/dashboard/products');
  assertEqual(response.products[0].catalogSource.canToggleResaleInHeureka, false);
  assertEqual(response.products[0].catalogSource.communityVisible, true);
  assertEqual(response.products[0].heurekaStatus, 'published');
  assertEqual(response.products[0].workflowStatus, 'included');
  assertEqual(response.products[0].nextAction, 'monitor_feed');
  assertEqual(response.products[0].canConfirmPublish, false);
  assertEqual(response.products[0].gaps.includes('category'), false);
  assertEqual(response.products[1].catalogSource.label, 'Test Seller');
  assertEqual(response.products[1].catalogSource.type, 'community');
  assertEqual(response.products[1].catalogSource.resaleEnabled, true);
  assertEqual(response.products[1].catalogSource.communityVisible, true);
  assertEqual(response.products[1].availableStock, 0);
  assertEqual(response.products[1].heurekaStatus, 'not_published');
  assertEqual(response.products[1].workflowStatus, 'blocked');
  assertEqual(response.products[1].nextAction, 'resolve_data_gaps');
  assertEqual(response.products[1].canIncludeInFeed, false);
  assertIncludes(response.products[1].gaps, 'stock');
  assertEqual(disabledSellerProjection.catalogSource.type, 'community');
  assertEqual(disabledSellerProjection.catalogSource.communityVisible, false);
  assertEqual(disabledSellerProjection.catalogSource.resaleMutationPath, null);
  assertEqual(disabledSellerProjection.workflowStatus, 'blocked');
  assertEqual(disabledSellerProjection.canIncludeInFeed, false);
  assertIncludes(disabledSellerProjection.gaps, 'catalog_source_resale');
  assertEqual(response.products[1].blockers[0].code, 'STOCK');

  const ownProjection = (service as any).buildDashboardProduct(
    {
      id: 'catalog-product-4',
      sku: 'SKU-4',
      title: 'Owned Catalog Product',
      description: 'Complete public description',
      ean: '8590000000042',
      brand: 'Owner Brand',
      categoryText: 'Elektronika | Test',
      ownerUserId: 'user-1',
      resaleEnabled: true,
      updatedAt: '2026-07-01T00:00:00.000Z',
    },
    {
      stock: 5,
      pricing: { priceVat: '399.00' },
      media: [{ id: 'media-owned', url: 'https://example.test/owned.jpg', isPrimary: true }],
      sourceSettings: {},
      catalogScope: 'effective',
      actor: { id: 'user-1', email: 'user@example.test', roles: [] },
    },
  );
  assertEqual(ownProjection.catalogSource.type, 'own');
  assertEqual(ownProjection.catalogSource.ownedByCurrentUser, true);
  assertEqual(ownProjection.catalogSource.readOnlyCatalogRecord, false);
  assertEqual(ownProjection.catalogSource.resaleEnabled, true);
  assertEqual(ownProjection.catalogSource.canToggleResaleInHeureka, true);
  assertEqual(ownProjection.catalogSource.resaleMutationPath, '/heureka/dashboard/products/catalog-product-4/resale');

  const communityScopedResponse = await service.listProducts(
    { id: 'user-1', email: 'user@example.test', roles: [] },
    { page: 1, limit: 20, feedType: 'heureka_cz', source: 'community' },
    'Bearer human-token',
  );
  assertEqual(searchQueries[1].query.catalogScope, 'community');
  assertEqual(communityScopedResponse.catalogScope, 'community');
  assertEqual(communityScopedResponse.catalogSourceFilter, 'community');
  assertEqual(communityScopedResponse.filters.source, 'community');

  const blockedResponse = await service.listProducts(
    { id: 'user-1', email: 'user@example.test', roles: [] },
    { page: 1, limit: 20, feedType: 'heureka_cz', workflowStatus: 'blocked' },
    'Bearer human-token',
  );
  assertEqual(blockedResponse.products.length, 1);
  assertEqual(blockedResponse.products[0].id, 'catalog-product-2');
  assertEqual(blockedResponse.filters.returned, 1);

  const lanes = await service.getReadinessLanes(
    { id: 'user-1', email: 'user@example.test', roles: [] },
    'heureka_cz',
    'Bearer human-token',
  );
  assertEqual(readinessBatchCalls, 1);
  assertEqual(searchQueries[3].context.authorization, 'Bearer human-token');
  assertEqual(lastReadinessBatchIds.join(','), 'catalog-product-1,catalog-product-2');
  assertEqual(lanes.readiness.summary.ready, 1);
  assertEqual(lanes.readiness.summary.blocked, 1);
  assertEqual(lanes.lanes.stock.status, 'blocked');
  assertEqual(lanes.lanes.stock.productCount, 1);
  assertEqual(lanes.lanes.media.status, 'blocked');
  assertEqual(lanes.lanes.media.productCount, 1);
  assertEqual(lanes.lanes.catalogContent.status, 'ready');
  assertEqual(lanes.blockedProducts.length, 1);
  assertEqual(lanes.blockedProducts[0].nextAction, 'stock_owner_decision');
  assertEqual(lanes.readOnly, true);
  assertEqual(Array.isArray(lanes.mutations), true);
  assertEqual(lanes.mutations.length, 0);

  let controllerQuery: any = null;
  let controllerReadinessFeedType: string | null = null;
  let controllerListAuthorization: string | undefined;
  let controllerIncludeAuthorization: string | undefined;
  const controller = new DashboardController({
    listProducts: async (_user: any, query: any, authorization?: string) => {
      controllerQuery = query;
      controllerListAuthorization = authorization;
      return { products: [], total: 0, filters: query };
    },
    getReadinessLanes: async (_user: any, feedType: string) => {
      controllerReadinessFeedType = feedType;
      return { feedType, lanes: {} };
    },
    setProductIncluded: async (_user: any, _productId: string, _include: boolean, authorization?: string) => {
      controllerIncludeAuthorization = authorization;
      return { ok: true };
    },
  } as any);
  await controller.products(
    { user: { id: 'user-1', email: 'user@example.test', roles: [] }, headers: { authorization: 'Bearer human-token' } } as any,
    '',
    '1',
    '20',
    'heureka_cz',
    'excluded',
    'blocked',
    'stock',
    'community',
  );
  assertEqual(controllerQuery.feedStatus, 'excluded');
  assertEqual(controllerQuery.workflowStatus, 'blocked');
  assertEqual(controllerQuery.gap, 'stock');
  assertEqual(controllerQuery.source, 'community');
  assertEqual(controllerListAuthorization, 'Bearer human-token');
  await controller.readinessLanes(
    { user: { id: 'user-1', email: 'user@example.test', roles: [] }, headers: { authorization: 'Bearer human-token' } } as any,
    'heureka_sk',
  );
  assertEqual(controllerReadinessFeedType, 'heureka_sk');
  await controller.includeProduct(
    { user: { id: 'user-1', email: 'user@example.test', roles: [] }, headers: { authorization: 'Bearer human-token' } } as any,
    'catalog-product-1',
    { include: true },
  );
  assertEqual(controllerIncludeAuthorization, 'Bearer human-token');

  console.log('PASS dashboard-list-products self-test');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
