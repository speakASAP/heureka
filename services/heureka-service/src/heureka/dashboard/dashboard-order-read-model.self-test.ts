import * as assert from "assert/strict";
import { ORDER_LIFECYCLE_READ_CONTRACT_MISSING } from '@heureka/shared';
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
  const now = new Date('2026-07-02T10:00:00.000Z');
  const orders = [
    { id: 'heureka-1', accountId: 'account-1', heurekaOrderId: 'H-1', orderId: 'central-1', customerEmail: 'buyer@example.test', customerPhone: null, total: '120.00', currency: 'CZK', status: 'pending', forwarded: true, createdAt: now, updatedAt: now },
    { id: 'heureka-2', accountId: 'account-1', heurekaOrderId: 'H-2', orderId: null, customerEmail: null, customerPhone: '+420000000000', total: '80.00', currency: 'CZK', status: 'confirmed', forwarded: false, createdAt: now, updatedAt: now },
    { id: 'heureka-3', accountId: 'account-1', heurekaOrderId: 'H-3', orderId: 'central-stale', customerEmail: null, customerPhone: null, total: '50.00', currency: 'CZK', status: 'pending', forwarded: true, createdAt: now, updatedAt: now },
  ];
  const prisma = {
    heurekaOrder: {
      findMany: async () => orders,
      count: async ({ where }: any = {}) => {
        if (where?.status) return orders.filter((order) => order.status === where.status).length;
        if (where?.forwarded === true) return orders.filter((order) => order.forwarded).length;
        return orders.length;
      },
      findUnique: async ({ where }: any) => orders.find((order) => order.id === where.id) || null,
    },
  };
  const orderClient = {
    getOrderById: async (orderId: string) => {
      if (orderId === 'central-1') {
        return {
          available: true,
          stale: false,
          order: {
            id: 'central-1',
            status: 'paid',
            lifecycleStage: 'warehouse_reserved',
            warehouseHandoff: { status: 'reserved' },
            updatedAt: '2026-07-02T09:59:00.000Z',
          },
          missing: [],
          httpStatus: 200,
        };
      }
      return {
        available: false,
        stale: true,
        order: null,
        missing: [ORDER_LIFECYCLE_READ_CONTRACT_MISSING],
        httpStatus: 403,
        reason: 'orders_read_http_403',
      };
    },
  };
  const logger = { setContext: () => undefined, log: () => undefined, warn: () => undefined, error: () => undefined };
  const service = new DashboardService(
    prisma as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    logger as any,
    undefined,
    orderClient as any,
  );

  await assert.rejects(
    () => service.listOrders({ id: 'user-1', email: 'user@example.test', roles: [] }, { limit: '10', status: 'all' }),
    /Heureka admin access required/,
  );

  const list = await service.listOrders({ id: 'admin-1', email: 'admin@example.test', roles: ['app:heureka-service:admin'] }, { limit: '10', status: 'all' });
  assertEqual(list.orders.length, 3);
  assertEqual(list.orders[0].status, 'paid');
  assertEqual(list.orders[0].localStatus, 'pending');
  assertEqual(list.orders[0].centralLifecycle.stage, 'warehouse_reserved');
  assertEqual(list.orders[0].centralLifecycle.reservationStatus, 'reserved');
  assertEqual(list.orders[1].status, 'unknown');
  assertEqual(list.orders[1].centralLifecycle.state, 'missing_id');
  assertIncludes(list.orders[1].centralLifecycle.missing, '[MISSING: central Orders id]');
  assertEqual(list.orders[2].centralLifecycle.state, 'stale');
  assertIncludes(list.orders[2].centralLifecycle.missing, ORDER_LIFECYCLE_READ_CONTRACT_MISSING);
  assertEqual(list.centralStatusCounts.available, 1);
  assertEqual(list.centralStatusCounts.missingId, 1);
  assertEqual(list.centralStatusCounts.stale, 2);

  const detail = await service.getOrderDetail({ id: 'admin-1', email: 'admin@example.test', roles: ['app:heureka-service:admin'] }, 'heureka-1');
  assertEqual(detail.status, 'paid');
  assertEqual(detail.centralLifecycle.source, 'orders-microservice');
  assertEqual(detail.centralLifecycle.stale, false);

  const adminOrderStats = await (service as any).getAdminOrderLifecycleStats(10);
  assertEqual(adminOrderStats.contractVersion, 'heureka.admin-orders-delivery-stats.v1');
  assertEqual(adminOrderStats.totalLocalOrders, 3);
  assertEqual(adminOrderStats.centralStatusCounts.available, 1);
  assertEqual(adminOrderStats.centralStatusCounts.missingId, 1);
  assertEqual(adminOrderStats.deliveryStats.warehouseReserved, 1);
  assertEqual(adminOrderStats.deliveryStats.unknownDeliverySignal, 2);
  assertIncludes(adminOrderStats.missing, '[MISSING: central Orders id]');
  assertIncludes(adminOrderStats.missing, ORDER_LIFECYCLE_READ_CONTRACT_MISSING);

  console.log('PASS dashboard-order-read-model self-test');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
