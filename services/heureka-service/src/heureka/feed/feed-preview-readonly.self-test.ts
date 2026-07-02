import { FeedService } from './feed.service';

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${String(expected)}, received ${String(actual)}`);
  }
}

function assertIncludes(actual: string, expected: string, label: string): void {
  if (!actual.includes(expected)) {
    throw new Error(`${label}: expected to include ${expected}`);
  }
}

async function main(): Promise<void> {
  let feedCreateCalls = 0;
  let feedUpdateCalls = 0;
  let operationEventCalls = 0;

  const prisma = {
    heurekaSettings: {
      findUnique: async ({ where }: any) => ({
        feedType: where.feedType,
        isActive: true,
        shopUrl: 'https://heureka.alfares.cz',
        deliveryDays: 3,
        deliveryPrice: 79,
        freeDeliveryThreshold: 1500,
      }),
    },
    heurekaProduct: {
      findMany: async () => ([{ productId: 'synthetic-product-1' }, { productId: 'synthetic-product-2' }]),
    },
    heurekaFeed: {
      create: async () => {
        feedCreateCalls += 1;
        return { id: 'feed-1' };
      },
      update: async () => {
        feedUpdateCalls += 1;
        return { id: 'feed-1' };
      },
    },
  };

  const catalogClient = {
    getProductById: async (productId: string) => ({
      id: productId,
      sku: productId === 'synthetic-product-2' ? 'DUPLICATE-SKU' : 'SYNTHETIC-1',
      title: productId === 'synthetic-product-2' ? 'Blocked Catalog Product' : 'Synthetic Trail Shoe',
      description: 'Synthetic public description.',
      status: 'active',
      categoryText: 'Sport | Running shoes',
      brand: 'Synthetic',
    }),
    getProductPricing: async () => ({ priceVat: '1299.00' }),
    getProductMedia: async (productId: string) => ([{ type: 'image', url: `https://example.test/images/${productId}.jpg`, isPrimary: true }]),
    getHeurekaFeedSnapshot: async () => ({ feedFields: {} }),
    getProductQualityReviewForProduct: async (productId: string) => ({
      policyId: 'catalog.product_quality.v1',
      unavailable: false,
      item: {
        productId,
        canActivate: productId !== 'synthetic-product-2',
        blockingIssues: productId === 'synthetic-product-2'
          ? [{ code: 'duplicate_sku', field: 'sku', severity: 'blocking', message: 'SKU is duplicated.' }]
          : [],
        blockingMissingFields: productId === 'synthetic-product-2' ? ['sku'] : [],
        nextAction: productId === 'synthetic-product-2' ? 'resolve_blockers:sku' : 'ready_for_activation',
      },
      missing: [],
    }),
  };

  const warehouseClient = {
    getAvailabilityBatch: async (productIds: string[]) => productIds.map((productId) => ({
      productId,
      totalAvailable: 12,
    })),
  };

  const logger = {
    setContext: () => undefined,
    log: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  };

  const operationEvents = {
    append: async () => {
      operationEventCalls += 1;
    },
  };

  const service = new FeedService(prisma as any, catalogClient as any, warehouseClient as any, logger as any, operationEvents as any);
  const preview = await service.previewFeed('heureka_cz');

  assertEqual(preview.validation.status, 'valid', 'preview status');
  assertEqual(preview.validation.feedId, 'read-only-preview', 'preview feed id');
  assertEqual(preview.sourceProductCount, 2, 'preview source count');
  assertEqual(preview.publicProductCount, 1, 'preview public count');
  assertIncludes(preview.xml, '<SHOPITEM>', 'preview XML');
  assertIncludes(preview.xml, 'synthetic-product-1', 'preview XML includes quality-clean product');
  assertEqual(preview.xml.includes('synthetic-product-2'), false, 'preview XML excludes Catalog quality blocked product');
  assertEqual(feedCreateCalls, 0, 'preview feed create calls');
  assertEqual(feedUpdateCalls, 0, 'preview feed update calls');
  assertEqual(operationEventCalls, 0, 'preview operation event calls');

  const generated = await service.generateFeedWithLifecycle('heureka_cz');
  assertEqual(generated.validation.status, 'valid', 'lifecycle status');
  assertEqual(feedCreateCalls, 1, 'lifecycle feed create calls');
  assertEqual(feedUpdateCalls, 1, 'lifecycle feed update calls');
  assertEqual(operationEventCalls, 1, 'lifecycle operation event calls');

  console.log('PASS feed-preview-readonly self-test');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
