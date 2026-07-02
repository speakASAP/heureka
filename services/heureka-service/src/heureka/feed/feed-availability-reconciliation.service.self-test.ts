import { strict as assert } from 'assert';
import { HeurekaAvailabilityReconciliationService } from './feed-availability-reconciliation.service';

const productId = '33333333-3333-4333-8333-333333333333';

function makeHarness(input: {
  feedProducts: any[];
  offers: any[];
  catalogProducts?: Record<string, any>;
  warehouseAvailable?: Record<string, number>;
}) {
  const feedProducts = input.feedProducts.map((row) => ({ ...row }));
  const offers = input.offers.map((row) => ({ ...row }));
  const calls: any = { upserts: [], offerUpdates: [], events: [] };
  const prisma = {
    heurekaProduct: {
      findMany: async () => feedProducts.filter((row) => row.isIncluded === true),
      upsert: async (args: any) => {
        calls.upserts.push(args);
        const index = feedProducts.findIndex((row) => row.productId === args.where.productId);
        if (index === -1) {
          const created = { id: `feed-product-${feedProducts.length + 1}`, ...args.create };
          feedProducts.push(created);
          return created;
        }
        feedProducts[index] = { ...feedProducts[index], ...args.update };
        return feedProducts[index];
      },
    },
    heurekaOffer: {
      findMany: async () => offers.filter((offer) => offer.productId && (offer.isActive === true || Number(offer.stockQuantity) > 0)),
      updateMany: async (args: any) => {
        calls.offerUpdates.push(args);
        let count = 0;
        for (const offer of offers) {
          if (offer.productId === args.where.productId) {
            Object.assign(offer, args.data);
            count += 1;
          }
        }
        return { count };
      },
    },
  } as any;
  const catalogClient = {
    getProductById: async (id: string) => {
      if (!(id in (input.catalogProducts || {}))) throw new Error('Product not found');
      return input.catalogProducts?.[id];
    },
  } as any;
  const warehouseClient = {
    getTotalAvailable: async (id: string) => input.warehouseAvailable?.[id] ?? 0,
  } as any;
  const logger = { setContext: () => undefined, log: () => undefined, warn: () => undefined, error: () => undefined } as any;
  const operationEvents = {
    append: async (event: any) => {
      calls.events.push(event);
      return event;
    },
  } as any;
  const service = new HeurekaAvailabilityReconciliationService(prisma, catalogClient, warehouseClient, logger, operationEvents);
  return { service, calls, feedProducts, offers };
}

async function main() {
  {
    const { service, calls } = makeHarness({
      feedProducts: [{ id: 'feed-product-1', productId, isIncluded: true }],
      offers: [{ id: 'offer-1', productId, stockQuantity: 2, isActive: true }],
      catalogProducts: {},
      warehouseAvailable: { [productId]: 4 },
    });

    const result = await service.reconcile({ now: new Date('2026-07-02T10:00:00.000Z') });

    assert.equal(result.excluded, 1);
    assert.equal(calls.upserts[0].update.isIncluded, false);
    assert.deepEqual(calls.offerUpdates[0].data, { stockQuantity: 0, isActive: false });
    assert.equal(calls.events[0].action, 'availability_reconciliation_applied');
    assert.equal(calls.events[0].blockedReasons[0], 'catalog_product_missing');
    assert.equal(calls.events[0].blockedReasons[1], '[MISSING: confirmed Heureka feed approval/import removal behavior]');
  }

  {
    const { service, calls } = makeHarness({
      feedProducts: [{ id: 'feed-product-1', productId, isIncluded: true }],
      offers: [{ id: 'offer-1', productId, stockQuantity: 9, isActive: true }],
      catalogProducts: { [productId]: { id: productId, isActive: true, status: 'active', isSellable: true } },
      warehouseAvailable: { [productId]: 0 },
    });

    const result = await service.reconcile();

    assert.equal(result.excluded, 1);
    assert.equal(result.offersUpdated, 1);
    assert.equal(calls.events[0].requestSummary.reason, 'warehouse_stock_unavailable');
  }

  {
    const { service, calls } = makeHarness({
      feedProducts: [{ id: 'feed-product-1', productId, isIncluded: true }],
      offers: [{ id: 'offer-1', productId, stockQuantity: 1, isActive: true }],
      catalogProducts: { [productId]: { id: productId, isActive: false } },
      warehouseAvailable: { [productId]: 6 },
    });

    const first = await service.reconcile();
    const second = await service.reconcile();

    assert.equal(first.excluded, 1);
    assert.equal(second.scanned, 0);
    assert.equal(second.excluded, 0);
    assert.equal(calls.upserts.length, 1);
    assert.equal(calls.offerUpdates.length, 1);
  }

  console.log('PASS heureka availability reconciliation service self-test');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
