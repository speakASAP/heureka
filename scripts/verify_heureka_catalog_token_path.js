#!/usr/bin/env node
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');

const runtimeMode = process.argv.includes('--runtime');
const requireCatalogSource = process.argv.includes('--require-catalog-source');
const root = process.env.HEUREKA_SOURCE_ROOT || (__dirname === '/' ? process.cwd() : path.resolve(__dirname, '..'));
const catalogRoot = process.env.CATALOG_REPO_ROOT || path.resolve(root, '..', 'catalog-microservice');

function read(base, relativePath) {
  return fs.readFileSync(path.join(base, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function firstPresent(keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value && String(value).trim()) return { key, length: String(value).length };
  }
  return null;
}

function envPresence(keys) {
  return Object.fromEntries(keys.map((key) => [key, {
    present: Boolean(process.env[key]),
    length: process.env[key] ? String(process.env[key]).length : 0,
  }]));
}

function verifyHeurekaSource() {
  const guard = read(root, 'services/heureka-service/src/heureka/feed/feed-mutation.guard.ts');
  const orderGuard = read(root, 'services/heureka-service/src/heureka/orders/order-ingestion.guard.ts');
  const feedController = read(root, 'services/heureka-service/src/heureka/feed/feed.controller.ts');
  const productsController = read(root, 'services/heureka-service/src/heureka/feed/products.controller.ts');

  assert.match(guard, /\/auth\/validate/);
  assert.match(guard, /internal:heureka-service:feed/);
  assert.match(guard, /Missing bearer token/);
  assert.doesNotMatch(guard, /process\.env\.HEUREKA_INTERNAL_SERVICE_TOKEN/);
  assert.doesNotMatch(guard, /process\.env\.INTERNAL_SERVICE_TOKEN/);
  assert.doesNotMatch(guard, /request\.headers\[['\"]x-internal-service-token['\"]\]/);
  assert.doesNotMatch(guard, /request\.headers\[['\"]x-service-name['\"]\]/);
  assert.doesNotMatch(guard, /timingSafeEqual/);

  assert.match(orderGuard, /\/auth\/validate/);
  assert.match(orderGuard, /internal:heureka-service:orders/);
  assert.doesNotMatch(orderGuard, /process\.env\.HEUREKA_INTERNAL_SERVICE_TOKEN/);

  assert.match(feedController, /@Post\('regenerate'\)[\s\S]*@UseGuards\(HeurekaFeedMutationGuard\)/);
  assert.match(productsController, /@Post\(':productId\/include'\)[\s\S]*@UseGuards\(HeurekaFeedMutationGuard\)/);
  assert.match(productsController, /@Delete\(':productId\/exclude'\)[\s\S]*@UseGuards\(HeurekaFeedMutationGuard\)/);
}

function verifyCatalogSource(report) {
  const catalogService = path.join(catalogRoot, 'src/products/products.service.ts');
  const catalogExternalSecret = path.join(catalogRoot, 'k8s/external-secret.yaml');
  if (!fs.existsSync(catalogService) || !fs.existsSync(catalogExternalSecret)) {
    if (requireCatalogSource) {
      report.blockers.push(`[MISSING: Catalog source repo at ${catalogRoot}]`);
    }
    report.catalogSource = { checked: false, root: catalogRoot, reason: 'not available in this workspace' };
    return;
  }

  const service = read(catalogRoot, 'src/products/products.service.ts');
  assert.match(service, /\/heureka\/products\/\$\{encodeURIComponent\(id\)\}\/include/);
  const stillStatic =
    /process\.env\.HEUREKA_INTERNAL_SERVICE_TOKEN/.test(service) ||
    /'x-internal-service-token':\s*token/.test(service);
  report.catalogSource = {
    checked: true,
    root: catalogRoot,
    heurekaCallerAuth: stillStatic
      ? '[OPEN: catalog outbound still uses static Heureka token headers; must send Auth RS256 Bearer with role internal:heureka-service:feed]'
      : 'Auth Bearer expected',
  };
  if (stillStatic && requireCatalogSource) {
    report.blockers.push(
      '[OPEN: catalog-microservice Heureka caller must migrate to Auth RS256 Bearer (internal:heureka-service:feed)]',
    );
  }
}

const report = {
  contractVersion: 'heureka-catalog-token-path.v1',
  readOnly: true,
  mode: runtimeMode ? 'runtime' : 'source',
  mutations: [],
  blockers: [],
  source: {
    guard: 'HeurekaFeedMutationGuard',
    auth: 'POST /auth/validate',
    requiredRoles: ['internal:heureka-service:feed'],
    rejectedLegacy: ['HEUREKA_INTERNAL_SERVICE_TOKEN', 'INTERNAL_SERVICE_TOKEN', 'JWT_TOKEN', 'x-internal-service-token', 'x-service-name'],
    catalogSourceRoot: catalogRoot,
  },
};

if (!runtimeMode) {
  verifyHeurekaSource();
  verifyCatalogSource(report);
}

if (runtimeMode) {
  const runtimeKeys = [
    'AUTH_SERVICE_URL',
    'HEUREKA_SERVICE_TOKEN',
  ];
  report.runtime = {
    envPresence: envPresence(runtimeKeys),
    note: 'Inbound guards validate Auth RS256 Bearer via /auth/validate; static HEUREKA_INTERNAL_SERVICE_TOKEN is deleted',
  };
  if (!process.env.AUTH_SERVICE_URL) {
    report.blockers.push('[MISSING: AUTH_SERVICE_URL for Auth validate]');
  }
}

if (report.blockers.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(report, null, 2));
