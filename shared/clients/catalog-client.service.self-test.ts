import { of } from 'rxjs';
import { CatalogClientService } from './catalog-client.service';

function assertEqual(actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  }
}

function assertTruthy(value: unknown, message: string): void {
  if (!value) throw new Error(message);
}

async function main(): Promise<void> {
  const previousCatalogToken = process.env.CATALOG_INTERNAL_SERVICE_TOKEN;
  const previousHeurekaToken = process.env.HEUREKA_INTERNAL_SERVICE_TOKEN;
  const previousInternalToken = process.env.INTERNAL_SERVICE_TOKEN;
  const previousJwtToken = process.env.JWT_TOKEN;
  const previousCatalogUrl = process.env.CATALOG_SERVICE_URL;
  process.env.CATALOG_SERVICE_URL = 'http://catalog.test';
  delete process.env.CATALOG_INTERNAL_SERVICE_TOKEN;
  process.env.HEUREKA_INTERNAL_SERVICE_TOKEN = 'heureka-service-token';
  delete process.env.INTERNAL_SERVICE_TOKEN;
  delete process.env.JWT_TOKEN;

  const calls: Array<{ method: string; url: string; config?: any; body?: any }> = [];
  const httpService = {
    get: (url: string, config?: any) => {
      calls.push({ method: 'GET', url, config });
      return of({ data: { success: true, data: { id: 'product-1' }, pagination: { total: 1, page: 1, limit: 20 } } });
    },
    post: (url: string, body: any, config?: any) => {
      calls.push({ method: 'POST', url, body, config });
      return of({ data: { success: true, data: { id: 'product-1' } } });
    },
    put: (url: string, body: any, config?: any) => {
      calls.push({ method: 'PUT', url, body, config });
      return of({ data: { success: true, data: { id: 'product-1' } } });
    },
  };
  const logger = { error: () => undefined, warn: () => undefined };
  const client = new CatalogClientService(httpService as any, logger as any);

  await client.getProductById('product 1');
  await client.getProductBySku('sku/1');
  await client.searchProducts({ isActive: true, catalogScope: 'effective', limit: 5 });
  await client.getProductPricing('product 1');
  await client.getProductMedia('product 1');
  await client.getHeurekaFeedSnapshot('product 1', 'heureka_cz');
  await client.createProduct({ sku: 'sku-1' });
  await client.updateProduct('product 1', { title: 'Title' });
  await client.getCatalogSettings();

  assertEqual(calls.length, 9);
  for (const call of calls) {
    assertEqual(call.config?.headers?.['x-internal-service-token'], 'heureka-service-token');
    assertEqual(call.config?.headers?.['x-service-name'], 'heureka-service');
    assertEqual(call.config?.headers?.Authorization, undefined);
  }
  assertTruthy(calls[0].url.endsWith('/api/products/product%201'), 'product id should be encoded');
  assertTruthy(calls[1].url.endsWith('/api/products/sku/sku%2F1'), 'sku should be encoded');
  assertTruthy(calls[2].url.includes('catalogScope=effective'), 'effective catalog scope should be forwarded');
  assertTruthy(calls[5].url.includes('/api/products/product%201/heureka-feed-snapshot?feedType=heureka_cz'), 'feed snapshot id should be encoded');
  assertTruthy(calls[8].url.endsWith('/api/catalog/settings'), 'catalog settings endpoint should be used');

  await client.searchProducts({ isActive: true, catalogScope: 'effective', limit: 1 }, { authorization: 'human-token' });
  await client.getProductById('product 1', { authorization: 'Bearer human-token', catalogScope: 'effective' });
  await client.getCatalogSettings({ authorization: 'human-token' });
  await client.provisionCatalogAccess('human-token', 'heureka-service');

  assertEqual(calls.length, 13);
  for (const call of calls.slice(9)) {
    assertEqual(call.config?.headers?.Authorization, 'Bearer human-token');
    assertEqual(call.config?.headers?.['x-internal-service-token'], undefined);
  }
  assertTruthy(calls[10].url.includes('/api/products/product%201?catalogScope=effective'), 'human product detail should use effective scope');
  assertEqual(calls[12].body.sourceApplication, 'heureka-service');
  assertTruthy(calls[12].url.endsWith('/api/catalog/access/provision'), 'catalog provisioning endpoint should be used');

  if (previousCatalogToken === undefined) delete process.env.CATALOG_INTERNAL_SERVICE_TOKEN; else process.env.CATALOG_INTERNAL_SERVICE_TOKEN = previousCatalogToken;
  if (previousHeurekaToken === undefined) delete process.env.HEUREKA_INTERNAL_SERVICE_TOKEN; else process.env.HEUREKA_INTERNAL_SERVICE_TOKEN = previousHeurekaToken;
  if (previousInternalToken === undefined) delete process.env.INTERNAL_SERVICE_TOKEN; else process.env.INTERNAL_SERVICE_TOKEN = previousInternalToken;
  if (previousJwtToken === undefined) delete process.env.JWT_TOKEN; else process.env.JWT_TOKEN = previousJwtToken;
  if (previousCatalogUrl === undefined) delete process.env.CATALOG_SERVICE_URL; else process.env.CATALOG_SERVICE_URL = previousCatalogUrl;

  console.log('PASS catalog-client auth self-test');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
