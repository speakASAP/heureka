const assert = require('assert/strict');

const DEFAULT_PRODUCT_ID = '884c1c5e-fe94-46c7-aab1-78bcc424e7ee';

function readCsvEnv(name, fallback) {
  const value = process.env[name] || fallback;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function baseUrl(name, fallback) {
  return (process.env[name] || fallback).replace(/\/+$/, '');
}

function bearerHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readJson(url, options = {}) {
  const response = await fetch(url, options);
  const body = await response.text();
  let json = null;
  try {
    json = body ? JSON.parse(body) : null;
  } catch (error) {
    throw new Error(`Expected JSON from ${url}, received ${response.status}: ${body.slice(0, 160)}`);
  }
  if (!response.ok) {
    const message = json?.message || json?.error || body.slice(0, 160);
    throw new Error(`Request failed ${response.status} for ${url}: ${message}`);
  }
  return json;
}

function firstReadinessItem(payload, productId) {
  const items = payload?.data?.items || payload?.items || [];
  return items.find((item) => item.productId === productId) || items[0] || null;
}

function warehouseAvailable(payload) {
  if (Number.isFinite(Number(payload?.totalAvailable))) return Number(payload.totalAvailable);
  if (Number.isFinite(Number(payload?.data?.totalAvailable))) return Number(payload.data.totalAvailable);
  if (Number.isFinite(Number(payload?.available))) return Number(payload.available);
  if (Number.isFinite(Number(payload?.data?.available))) return Number(payload.data.available);
  throw new Error('Warehouse total response did not include a numeric available total');
}

async function verifyProduct(productId, config) {
  const readinessUrl = `${config.heurekaBaseUrl}/heureka/feed/readiness/products/${encodeURIComponent(productId)}?feedType=${encodeURIComponent(config.feedType)}`;
  const warehouseUrl = `${config.warehouseBaseUrl}/api/stock/${encodeURIComponent(productId)}/total`;

  const [readiness, warehouse] = await Promise.all([
    readJson(readinessUrl),
    readJson(warehouseUrl, { headers: bearerHeaders(config.warehouseToken) }),
  ]);

  const item = firstReadinessItem(readiness, productId);
  assert.ok(item, `Heureka readiness returned no item for ${productId}`);

  const readinessAvailable = item.availableStock === null || item.availableStock === undefined
    ? null
    : Number(item.availableStock);
  const warehouseTotalAvailable = warehouseAvailable(warehouse);
  const blockerCodes = Array.isArray(item.blockers) ? item.blockers.map((blocker) => blocker.code) : [];

  assert.equal(item.productId, productId);
  assert.equal(readinessAvailable, warehouseTotalAvailable, `Heureka readiness stock differs from Warehouse for ${productId}`);
  if (warehouseTotalAvailable > 0) {
    assert.ok(!blockerCodes.includes('STOCK_UNKNOWN'), `Heureka readiness reports STOCK_UNKNOWN for ${productId}`);
    assert.ok(!blockerCodes.includes('ZERO_STOCK'), `Heureka readiness reports ZERO_STOCK for ${productId}`);
  }

  return {
    productId,
    warehouseTotalAvailable,
    readinessAvailable,
    readiness: item.readiness,
    blockerCodes,
  };
}

async function main() {
  const config = {
    heurekaBaseUrl: baseUrl('HEUREKA_VERIFY_BASE_URL', 'http://127.0.0.1:3800'),
    warehouseBaseUrl: baseUrl('WAREHOUSE_SERVICE_URL', 'http://warehouse-microservice:3201'),
    warehouseToken: process.env.WAREHOUSE_SERVICE_TOKEN || process.env.JWT_TOKEN || process.env.SERVICE_TOKEN || '',
    feedType: process.env.HEUREKA_VERIFY_FEED_TYPE || 'heureka_cz',
  };
  const productIds = readCsvEnv('HEUREKA_VERIFY_PRODUCT_IDS', DEFAULT_PRODUCT_ID);

  const products = [];
  for (const productId of productIds) {
    products.push(await verifyProduct(productId, config));
  }

  const summary = {
    contract: 'heureka-stock-readiness-live.v1',
    feedType: config.feedType,
    checkedProductCount: products.length,
    products,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(`heureka stock readiness live verification failed: ${error.stack || error.message}`);
  process.exit(1);
});
