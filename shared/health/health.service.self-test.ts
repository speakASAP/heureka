import assert = require('assert/strict');
import { HealthService } from './health.service';

const envKeys = [
  'AUTH_SERVICE_URL',
  'CATALOG_SERVICE_URL',
  'WAREHOUSE_SERVICE_URL',
  'ORDER_SERVICE_URL',
  'LOGGING_SERVICE_URL',
  'NOTIFICATION_SERVICE_URL',
  'HEALTH_DEPENDENCY_TIMEOUT_MS',
];

const previousEnv = new Map(envKeys.map((key) => [key, process.env[key]]));
const previousFetch = globalThis.fetch;

function restoreEnv() {
  for (const [key, value] of previousEnv.entries()) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

async function main() {
  const requestedUrls: string[] = [];
  (globalThis as any).fetch = async (url: string) => {
    requestedUrls.push(String(url));
    return {
      ok: true,
      status: 200,
    };
  };

  process.env.AUTH_SERVICE_URL = 'http://auth.test';
  process.env.CATALOG_SERVICE_URL = 'http://catalog.test';
  process.env.WAREHOUSE_SERVICE_URL = 'http://warehouse.test';
  process.env.ORDER_SERVICE_URL = 'http://orders.test';
  process.env.LOGGING_SERVICE_URL = 'http://logging.test/api/logs';
  process.env.NOTIFICATION_SERVICE_URL = 'http://notifications.test';

  const prisma = {
    $queryRaw: async () => [{ ok: 1 }],
  };
  const service = new HealthService(prisma as any);

  const basic = await service.getHealthStatus('heureka-service');
  assert.equal(basic.status, 'ok');
  assert.equal(basic.service, 'heureka-service');
  assert.equal(Object.prototype.hasOwnProperty.call(basic, 'dependencies'), false);

  const dependencyHealth = await service.getDependencyHealthStatus('heureka-service');
  assert.equal(dependencyHealth.contractVersion, 'heureka.dependency-health.v1');
  assert.equal(dependencyHealth.status, 'ok');
  assert.equal(dependencyHealth.readOnly, true);
  assert.deepEqual(dependencyHealth.mutations, []);
  assert.equal(dependencyHealth.dependencies.database.status, 'ok');
  assert.equal(dependencyHealth.dependencies.catalog.status, 'ok');
  assert.equal(dependencyHealth.dependencies.warehouse.status, 'ok');
  assert.equal(dependencyHealth.dependencies.orders.status, 'ok');
  assert.ok(requestedUrls.includes('http://catalog.test/health'));
  assert.ok(requestedUrls.includes('http://warehouse.test/health'));
  assert.ok(requestedUrls.includes('http://orders.test/health'));
  assert.ok(requestedUrls.includes('http://logging.test/health'));

  const failingDb = new HealthService({
    $queryRaw: async () => {
      throw new Error('database unavailable');
    },
  } as any);
  const unhealthy = await failingDb.getDependencyHealthStatus('heureka-service', {
    dependencies: [{ name: 'database', kind: 'database', critical: true }],
  });
  assert.equal(unhealthy.status, 'unhealthy');
  assert.equal(unhealthy.dependencies.database.status, 'error');

  console.log('PASS health-service dependency self-test');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    restoreEnv();
    (globalThis as any).fetch = previousFetch;
  });
