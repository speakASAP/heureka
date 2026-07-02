import { strict as assert } from 'assert';
import { CatalogProductEventsSubscriber } from './catalog-product-events.subscriber';

const productId = '33333333-3333-4333-8333-333333333333';

function makeLogger() {
  return { log: () => undefined, warn: () => undefined, error: () => undefined } as any;
}

async function main() {
  const calls: any = { upserts: [], offerUpdates: [], events: [] };
  const prisma = {
    heurekaProduct: {
      upsert: async (args: any) => {
        calls.upserts.push(args);
        return { id: 'feed-product-1', productId, isIncluded: false };
      },
    },
    heurekaOffer: {
      updateMany: async (args: any) => {
        calls.offerUpdates.push(args);
        return { count: 1 };
      },
    },
    heurekaOperationEvent: {
      create: async (args: any) => {
        calls.events.push(args);
        return args.data;
      },
    },
  } as any;
  const service = new CatalogProductEventsSubscriber(makeLogger(), prisma);

  await (service as any).handleCatalogProductEvent({ eventId: 'catalog-deleted-1', type: 'catalog.product.deleted.v1', productId });

  assert.equal(calls.upserts.length, 1);
  assert.equal(calls.upserts[0].update.isIncluded, false);
  assert.deepEqual(calls.offerUpdates[0].data, { stockQuantity: 0, isActive: false });
  assert.equal(calls.events[0].data.requestSummary.reason, 'catalog_product_deleted');
  assert.equal(calls.events[0].data.blockedReasons[1], '[MISSING: confirmed Heureka feed approval/import removal behavior]');

  await (service as any).handleCatalogProductEvent({ eventId: 'catalog-updated-1', type: 'catalog.product.updated.v1', productId, afterSellable: true });
  assert.equal(calls.upserts.length, 1);

  console.log('PASS heureka catalog-product-events subscriber spec');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
