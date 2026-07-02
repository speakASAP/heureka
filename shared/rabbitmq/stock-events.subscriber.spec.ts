import { strict as assert } from 'assert';
import { StockEventsSubscriber } from './stock-events.subscriber';

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
        return { count: 2 };
      },
    },
    heurekaOperationEvent: {
      create: async (args: any) => {
        calls.events.push(args);
        return args.data;
      },
    },
  } as any;
  const service = new StockEventsSubscriber(makeLogger(), prisma);

  await (service as any).handleStockEvent({ eventId: 'stock-out-1', type: 'stock.out', productId, available: 4 });

  assert.equal(calls.upserts.length, 1);
  assert.equal(calls.upserts[0].update.isIncluded, false);
  assert.deepEqual(calls.offerUpdates[0].data, { stockQuantity: 0, isActive: false });
  assert.equal(calls.events[0].data.idempotencyKey, `warehouse-stock:stock-out-1:${productId}`);
  assert.equal(calls.events[0].data.blockedReasons[0], '[MISSING: confirmed Heureka feed approval/import removal behavior]');

  await (service as any).handleStockEvent({ eventId: 'stock-updated-1', type: 'stock.updated', productId, available: 8 });
  assert.equal(calls.upserts.length, 1);
  assert.deepEqual(calls.offerUpdates[1].data, { stockQuantity: 8 });

  console.log('PASS heureka stock-events subscriber spec');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
