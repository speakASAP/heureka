import * as assert from "assert/strict";
import { BadRequestException } from '@nestjs/common';
import { HeurekaOrdersService } from './orders.service';

const account = { id: '11111111-1111-4111-8111-111111111111', name: 'heureka-cz', isActive: true, createdAt: new Date() };
const product = { id: '22222222-2222-4222-8222-222222222222', sku: 'SKU-H', title: 'Catalog product' };
const warehouseId = '44444444-4444-4444-8444-444444444444';

function makeService(overrides: any = {}) {
  const calls: any[] = [];
  const prisma = {
    heurekaAccount: {
      findUnique: async ({ where }: any) => where.id === account.id ? account : null,
      findFirst: async () => overrides.noAccount ? null : account,
    },
    heurekaOffer: {
      findUnique: async ({ where }: any) => where.id === '33333333-3333-4333-8333-333333333333'
        ? { id: where.id, productId: product.id, title: 'Mapped offer', price: 199 }
        : null,
    },
    heurekaOrder: {
      findFirst: async () => overrides.existing || null,
      create: async ({ data }: any) => ({ id: 'local-order-1', createdAt: new Date(), updatedAt: new Date(), ...data }),
      update: async ({ data }: any) => ({ id: 'local-order-1', accountId: account.id, heurekaOrderId: 'H-1001', createdAt: new Date(), updatedAt: new Date(), ...data }),
      findMany: async () => [],
      findUnique: async () => null,
    },
  };
  const orderClient = {
    createOrder: async (payload: any) => {
      calls.push(payload);
      return { id: 'central-order-1' };
    },
  };
  const catalogClient = {
    getProductById: async (productId: string) => {
      if (productId !== product.id) throw new Error('not found');
      return product;
    },
  };
  const warehouseClient = {
    getStockByProduct: async () => overrides.stockRows ?? [{ productId: product.id, warehouseId, quantity: 6, reserved: 0, available: 6 }],
  };
  const logger = { setContext() {}, log() {}, warn() {}, error() {} };
  return { service: new HeurekaOrdersService(prisma as any, orderClient as any, catalogClient as any, warehouseClient as any, logger as any), calls };
}

async function run() {
  {
    const { service } = makeService();
    await assert.rejects(() => service.listOrders({ roles: [] }, 'true'), /Heureka order read requires admin role/);
    await service.listOrders({ roles: ['app:heureka-service:admin'] }, 'true');
    await assert.rejects(() => service.getOrder({ roles: [] }, 'local-order-1'), /Heureka order read requires admin role/);
  }

  {
    const { service, calls } = makeService();
    const result = await service.ingestOrder({
      externalOrderId: 'H-1001',
      accountId: account.id,
      orderedAt: '2026-06-27T08:00:00.000Z',
      customer: { email: 'customer@example.invalid', phone: '+420000000000' },
      items: [{ catalogProductId: product.id, quantity: 2, unitPrice: 100, totalPrice: 200 }],
      totals: { subtotal: 200, shippingCost: 0, taxAmount: 0, total: 200, currency: 'CZK' },
    });
    assert.equal(result.forwarded, true);
    assert.equal(result.orderId, 'central-order-1');
    assert.equal(calls[0].channel, 'heureka');
    assert.equal(calls[0].externalOrderId, 'H-1001');
    assert.equal(calls[0].channelAccountId, account.id);
    assert.equal(calls[0].items[0].productId, product.id);
    assert.equal(calls[0].items[0].quantity, 2);
    assert.equal(calls[0].items[0].warehouseId, warehouseId);
    assert.equal(calls[0].totals.total, 200);
  }

  {
    const { service, calls } = makeService();
    await service.ingestOrder({
      externalOrderId: 'H-1002',
      items: [{ offerId: '33333333-3333-4333-8333-333333333333', quantity: 1 }],
    });
    assert.equal(calls[0].items[0].productId, product.id);
    assert.equal(calls[0].items[0].title, 'Mapped offer');
    assert.equal(calls[0].items[0].unitPrice, 199);
    assert.equal(calls[0].items[0].warehouseId, warehouseId);
  }

  {
    const explicitWarehouseId = '55555555-5555-4555-8555-555555555555';
    const { service, calls } = makeService({
      stockRows: [
        { productId: product.id, warehouseId, quantity: 6, reserved: 0, available: 6 },
        { productId: product.id, warehouseId: explicitWarehouseId, quantity: 8, reserved: 1, available: 7 },
      ],
    });
    await service.ingestOrder({
      externalOrderId: 'H-1002-W',
      items: [{ catalogProductId: product.id, warehouseId: explicitWarehouseId, quantity: 2, unitPrice: 100 }],
    });
    assert.equal(calls[0].items[0].warehouseId, explicitWarehouseId);
  }

  {
    const { service, calls } = makeService({ stockRows: [] });
    await assert.rejects(
      () => service.ingestOrder({ externalOrderId: 'H-1002-MISSING-WH', items: [{ catalogProductId: product.id, quantity: 1, unitPrice: 10 }] }),
      /\[MISSING: warehouseId\]/,
    );
    assert.equal(calls.length, 0);
  }

  {
    const { service, calls } = makeService({
      stockRows: [
        { productId: product.id, warehouseId, quantity: 6, reserved: 0, available: 6 },
        { productId: product.id, warehouseId: '55555555-5555-4555-8555-555555555555', quantity: 8, reserved: 1, available: 7 },
      ],
    });
    await assert.rejects(
      () => service.ingestOrder({ externalOrderId: 'H-1002-AMBIGUOUS-WH', items: [{ catalogProductId: product.id, quantity: 1, unitPrice: 10 }] }),
      /multiple Warehouse routes/,
    );
    assert.equal(calls.length, 0);
  }

  {
    const { service, calls } = makeService({ existing: { id: 'existing-local', accountId: account.id, heurekaOrderId: 'H-1001', orderId: 'central-existing', forwarded: true, status: 'pending', total: 10, currency: 'CZK' } });
    const result = await service.ingestOrder({ externalOrderId: 'H-1001', items: [{ catalogProductId: product.id, title: 'Existing', quantity: 1, unitPrice: 10 }] });
    assert.equal(result.forwarding.replay, true);
    assert.equal(result.orderId, 'central-existing');
    assert.equal(calls.length, 0);
  }

  {
    const { service } = makeService();
    await assert.rejects(
      () => service.ingestOrder({ externalOrderId: 'H-1003', items: [{ productId: 'heureka-local-row-1', quantity: 1, unitPrice: 10 }] }),
      BadRequestException,
    );
  }

  {
    const { service } = makeService({ noAccount: true });
    await assert.rejects(
      () => service.ingestOrder({ externalOrderId: 'H-1004', items: [{ catalogProductId: product.id, quantity: 1, unitPrice: 10 }] }),
      /Heureka account mapping/,
    );
  }

  process.stdout.write('heureka orders.service.spec: PASS\n');
}

run().catch((error) => {
  process.stderr.write(`heureka orders.service.spec: FAIL\n${error.stack || error.message}\n`);
  process.exit(1);
});
