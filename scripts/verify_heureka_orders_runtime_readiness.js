#!/usr/bin/env node
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');

const runtimeMode = process.argv.includes('--runtime');
const root = process.env.HEUREKA_SOURCE_ROOT || (__dirname === '/' ? process.cwd() : path.resolve(__dirname, '..'));

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
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

function verifySourceContracts() {
  const orderClient = read('shared/clients/order-client.service.ts');
  const deployment = read('k8s/deployment.yaml');
  const configmap = read('k8s/configmap.yaml');
  const contract = read('23_documentation_contracts/HEUREKA_ORDER_INGESTION_CONTRACT.md');
  const smokeDoc = read('docs/orchestrator/TASK-ORDERS-007-heureka-orders-smoke-readiness.md');
  const publicController = read('services/heureka-service/src/public/public.controller.ts');

  assert.match(orderClient, /const CREATE_ORDER_CONTRACT_VERSION = 'orders\.create\.v1'/);
  assert.match(orderClient, /process\.env\.ORDERS_SERVICE_URL/);
  assert.match(orderClient, /process\.env\.ORDERS_MICROSERVICE_URL/);
  assert.match(orderClient, /process\.env\.ORDER_SERVICE_URL/);
  assert.match(orderClient, /process\.env\.ORDERS_SERVICE_TOKEN/);
  assert.match(orderClient, /process\.env\.HEUREKA_INTERNAL_SERVICE_TOKEN/);
  assert.match(orderClient, /process\.env\.INTERNAL_SERVICE_TOKEN/);
  assert.match(orderClient, /process\.env\.JWT_TOKEN/);
  assert.match(orderClient, /headers\['x-internal-service-token'\]/);
  assert.match(orderClient, /headers\['x-service-name'\] = 'heureka-service'/);

  assert.match(deployment, /name: JWT_TOKEN/);
  assert.match(deployment, /name: HEUREKA_INTERNAL_SERVICE_TOKEN/);
  assert.match(deployment, /key: CATALOG_INTERNAL_SERVICE_TOKEN/);
  assert.match(deployment, /name: WAREHOUSE_SERVICE_TOKEN/);
  assert.match(deployment, /name: warehouse-microservice-secret/);
  assert.match(deployment, /key: CLIPLOT_WAREHOUSE_SERVICE_TOKEN/);
  assert.match(configmap, /ORDER_SERVICE_URL: "http:\/\/orders-microservice:3203"/);
  assert.match(configmap, /WAREHOUSE_SERVICE_URL: "http:\/\/warehouse-microservice:3201"/);


  const requiredLifecycleStages = [
    'ordered_unpaid',
    'payment_failed',
    'paid_not_delivered',
    'warehouse_fulfillment_requested',
    'warehouse_collecting',
    'warehouse_forming',
    'warehouse_formed',
    'handed_to_delivery',
    'in_delivery',
    'received',
    'not_received',
    'returned',
    'cancelled',
  ];
  for (const stage of requiredLifecycleStages) {
    assert.ok(publicController.includes(stage), `Missing dashboard lifecycle label coverage: ${stage}`);
  }
  assert.ok(publicController.includes('ORDER_STATUS_POLL_MS = 30000'), 'Dashboard orders polling must remain enabled');
  assert.ok(publicController.includes("document.addEventListener('visibilitychange'"), 'Dashboard orders polling must pause/resume on visibility changes');

  for (const required of [
    'orders.create.v1',
    'POST /heureka/orders/ingest',
    'stable `externalOrderId`',
    'stable `channelAccountId`',
    '`items[].warehouseId`',
  ]) {
    assert.ok(contract.includes(required), `Missing order contract text: ${required}`);
  }

  assert.ok(smokeDoc.includes('preflight missing markers: none'), 'Final Orders smoke result is not recorded');
  assert.ok(smokeDoc.includes('reservation statuses: `reserved`'), 'Warehouse reservation status evidence is not recorded');
  assert.ok(smokeDoc.includes('missing markers: none'), 'Final Orders smoke still has missing markers');
}

const report = {
  contractVersion: 'heureka-orders-runtime-readiness.v1',
  readOnly: true,
  mode: runtimeMode ? 'runtime' : 'source',
  mutations: [],
  source: {
    orderClientContract: 'orders.create.v1',
    orderServiceUrlFallbacks: ['ORDERS_SERVICE_URL', 'ORDERS_MICROSERVICE_URL', 'ORDER_SERVICE_URL'],
    orderAuthSources: ['ORDERS_SERVICE_TOKEN', 'HEUREKA_INTERNAL_SERVICE_TOKEN', 'INTERNAL_SERVICE_TOKEN', 'JWT_TOKEN'],
    manifestEnvRefs: {
      ORDER_SERVICE_URL: 'heureka-config',
      HEUREKA_INTERNAL_SERVICE_TOKEN: 'catalog-microservice-secret/CATALOG_INTERNAL_SERVICE_TOKEN',
      JWT_TOKEN: 'heureka-service-secret/JWT_TOKEN',
      WAREHOUSE_SERVICE_TOKEN: 'warehouse-microservice-secret/CLIPLOT_WAREHOUSE_SERVICE_TOKEN',
    },
    sourceContractsVerified: !runtimeMode,
    runtimeModeNote: runtimeMode ? 'source assertions skipped; run without --runtime in the repository to verify source files' : null,
  },
  blockers: [],
};

if (!runtimeMode) {
  verifySourceContracts();
  report.source.finalSmokeEvidenceRecorded = true;
}

if (runtimeMode) {
  const runtimeKeys = [
    'ORDER_SERVICE_URL',
    'ORDERS_SERVICE_URL',
    'ORDERS_MICROSERVICE_URL',
    'JWT_TOKEN',
    'ORDERS_SERVICE_TOKEN',
    'HEUREKA_INTERNAL_SERVICE_TOKEN',
    'INTERNAL_SERVICE_TOKEN',
    'WAREHOUSE_SERVICE_TOKEN',
  ];
  const ordersUrl = firstPresent(['ORDERS_SERVICE_URL', 'ORDERS_MICROSERVICE_URL', 'ORDER_SERVICE_URL']);
  const internalToken = firstPresent(['HEUREKA_INTERNAL_SERVICE_TOKEN', 'INTERNAL_SERVICE_TOKEN', 'JWT_TOKEN']);
  const warehouseToken = firstPresent(['WAREHOUSE_SERVICE_TOKEN', 'JWT_TOKEN', 'SERVICE_TOKEN']);
  report.runtime = {
    envPresence: envPresence(runtimeKeys),
    resolvedOrdersUrlSource: ordersUrl?.key || null,
    resolvedInternalTokenSource: internalToken?.key || null,
    resolvedWarehouseTokenSource: warehouseToken?.key || null,
  };
  if (!ordersUrl) report.blockers.push('[MISSING: Orders service URL runtime env]');
  if (!internalToken) report.blockers.push('[MISSING: Heureka-to-Orders internal token runtime env]');
  if (!warehouseToken) report.blockers.push('[MISSING: Warehouse token runtime env for order route preflight]');
}

if (report.blockers.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(report, null, 2));
