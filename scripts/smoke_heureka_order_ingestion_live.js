#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');

const DEFAULT_PRODUCT_ID = '884c1c5e-fe94-46c7-aab1-78bcc424e7ee';
const DEFAULT_HEUREKA_BASE_URL = 'http://127.0.0.1:3800';
const DEFAULT_ORDER_SERVICE_URL = 'http://orders-microservice:3203';
const DEFAULT_CATALOG_SERVICE_URL = 'http://catalog-microservice:3200';
const DEFAULT_WAREHOUSE_SERVICE_URL = 'http://warehouse-microservice:3201';
const CHANNEL = 'heureka';

function firstPresent(names) {
  for (const name of names) {
    const value = (process.env[name] || '').trim();
    if (value) return { name, value };
  }
  return null;
}

function bearer(value) {
  return value.startsWith('Bearer ') ? value : `Bearer ${value}`;
}

function bool(value) {
  return value === true || value === 'true' || value === '1' || value === 'yes';
}

function jsonLine(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function redact(text) {
  return String(text || '')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, 'Bearer [REDACTED]')
    .replace(/x-internal-service-token["': ]+[A-Za-z0-9._~+/=-]+/gi, 'x-internal-service-token:[REDACTED]')
    .slice(0, 280);
}

async function fetchJson(url, options = {}) {
  const timeoutMs = Number(process.env.HEUREKA_ORDER_SMOKE_TIMEOUT_MS || 12000);
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  return {
    status: response.status,
    ok: response.ok,
    data,
    errorSummary: response.ok ? undefined : redact(text),
  };
}

function warehouseHeaders() {
  const token = firstPresent(['WAREHOUSE_SERVICE_TOKEN', 'JWT_TOKEN', 'SERVICE_TOKEN']);
  return token ? { Authorization: bearer(token.value) } : {};
}

function catalogHeaders() {
  const token = firstPresent(['CATALOG_INTERNAL_SERVICE_TOKEN', 'HEUREKA_INTERNAL_SERVICE_TOKEN', 'INTERNAL_SERVICE_TOKEN', 'JWT_TOKEN']);
  if (!token) return {};
  return {
    'x-internal-service-token': token.value,
    'x-service-name': 'heureka-service',
  };
}

function internalHeaders() {
  const token = firstPresent(['HEUREKA_INTERNAL_SERVICE_TOKEN', 'INTERNAL_SERVICE_TOKEN', 'JWT_TOKEN']);
  if (!token) return null;
  return {
    'content-type': 'application/json',
    'x-internal-service-token': token.value,
    'x-service-name': 'heureka-service',
  };
}

function ordersHeaders() {
  const headers = {};
  const adminToken = firstPresent(['HEUREKA_ORDER_SMOKE_ORDERS_ADMIN_TOKEN', 'ORDERS_ADMIN_TOKEN']);
  if (adminToken) {
    headers.Authorization = bearer(adminToken.value);
    return headers;
  }

  const ordersToken = firstPresent(['ORDERS_SERVICE_TOKEN']);
  if (ordersToken) headers.Authorization = bearer(ordersToken.value);

  const internalToken = firstPresent(['HEUREKA_INTERNAL_SERVICE_TOKEN', 'INTERNAL_SERVICE_TOKEN', 'JWT_TOKEN']);
  if (internalToken) {
    headers['x-internal-service-token'] = internalToken.value;
    headers['x-service-name'] = 'heureka-service';
  }
  return headers;
}

async function cancelSyntheticOrder(orderServiceUrl, orderId) {
  if (!orderId) {
    return {
      status: 0,
      ok: false,
      missing: ['[MISSING: orderId for synthetic cleanup]'],
    };
  }

  const response = await fetchJson(`${orderServiceUrl}/api/orders/${orderId}/status`, {
    method: 'PUT',
    headers: {
      ...ordersHeaders(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      status: 'cancelled',
      approval: {
        approved: true,
        approvalType: 'human',
        reasonCode: 'SYNTHETIC_SMOKE_CLEANUP',
        sideEffectsHandled: {
          payment: true,
          warehouse: true,
          notification: true,
          crm: true,
          channel: true,
        },
      },
    }),
  }).catch((error) => ({
    status: 0,
    ok: false,
    errorSummary: redact(error.message),
  }));

  return {
    status: response.status,
    ok: response.ok,
    missing: response.ok ? [] : ['[MISSING: synthetic order cleanup cancelled status]'],
    errorSummary: response.errorSummary,
  };
}

function routeSummaries(rows, quantity) {
  return rows
    .map((row) => ({
      warehouseId: row?.warehouseId || row?.warehouse?.id || null,
      available: Number(row?.available),
    }))
    .filter((row) => row.warehouseId && Number.isFinite(row.available) && row.available >= quantity)
    .map((row) => ({ warehouseId: row.warehouseId, available: row.available }));
}

function findReservationStatuses(value, output = []) {
  if (!value || output.length >= 10) return output;
  if (Array.isArray(value)) {
    for (const item of value) findReservationStatuses(item, output);
    return output;
  }
  if (typeof value !== 'object') return output;

  if (value.warehouseHandoff && typeof value.warehouseHandoff === 'object' && typeof value.warehouseHandoff.status === 'string') {
    output.push(value.warehouseHandoff.status);
  }

  for (const [key, nested] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    if (
      typeof nested === 'string' &&
      (normalizedKey === 'reservationstatus' ||
        normalizedKey === 'warehousehandoffstatus' ||
        normalizedKey === 'handoffstatus')
    ) {
      output.push(nested);
    } else if (nested && typeof nested === 'object') {
      findReservationStatuses(nested, output);
    }
  }

  return output;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

async function checkHeurekaTables() {
  const requiredTables = ['heureka_accounts', 'heureka_orders', 'heureka_offers'];
  let PrismaClient;
  try {
    ({ PrismaClient } = require('/app/shared/node_modules/.prisma/client'));
  } catch {
    try {
      ({ PrismaClient } = require('@prisma/client'));
    } catch (error) {
      return {
        ok: false,
        checked: false,
        presentTables: [],
        missingTables: requiredTables,
        errorSummary: redact(error.message),
      };
    }
  }

  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('heureka_accounts', 'heureka_orders', 'heureka_offers')
    `;
    const presentTables = rows.map((row) => row.table_name).sort();
    const present = new Set(presentTables);
    const missingTables = requiredTables.filter((table) => !present.has(table));
    return {
      ok: missingTables.length === 0,
      checked: true,
      presentTables,
      missingTables,
    };
  } catch (error) {
    return {
      ok: false,
      checked: false,
      presentTables: [],
      missingTables: requiredTables,
      errorSummary: redact(error.message),
    };
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

function externalOrderIdShape(value) {
  return value.replace(/[0-9a-f]{8}$/i, '<8-hex>').replace(/\d{8}T?\d{6}/, '<timestamp>');
}

async function collectPreflight() {
  const productId = (process.env.HEUREKA_ORDER_SMOKE_PRODUCT_ID || DEFAULT_PRODUCT_ID).trim();
  const requestedWarehouseId = (process.env.HEUREKA_ORDER_SMOKE_WAREHOUSE_ID || '').trim();
  const quantity = Number(process.env.HEUREKA_ORDER_SMOKE_QUANTITY || 1);
  const heurekaBaseUrl = (process.env.HEUREKA_ORDER_SMOKE_BASE_URL || DEFAULT_HEUREKA_BASE_URL).replace(/\/$/, '');
  const orderServiceUrl = (process.env.ORDER_SERVICE_URL || process.env.ORDERS_SERVICE_URL || process.env.ORDERS_MICROSERVICE_URL || DEFAULT_ORDER_SERVICE_URL).replace(/\/$/, '');
  const catalogServiceUrl = (process.env.CATALOG_SERVICE_URL || DEFAULT_CATALOG_SERVICE_URL).replace(/\/$/, '');
  const warehouseServiceUrl = (process.env.WAREHOUSE_SERVICE_URL || DEFAULT_WAREHOUSE_SERVICE_URL).replace(/\/$/, '');
  const missing = [];

  if (!Number.isInteger(quantity) || quantity <= 0) {
    missing.push('[MISSING: positive smoke quantity]');
  }
  if (!firstPresent(['HEUREKA_INTERNAL_SERVICE_TOKEN', 'INTERNAL_SERVICE_TOKEN', 'JWT_TOKEN'])) {
    missing.push('[MISSING: Heureka internal service token]');
  }
  if (!firstPresent(['WAREHOUSE_SERVICE_TOKEN', 'JWT_TOKEN', 'SERVICE_TOKEN'])) {
    missing.push('[MISSING: Warehouse service token]');
  }

  const health = await fetchJson(`${heurekaBaseUrl}/health`).catch((error) => ({
    status: 0,
    ok: false,
    errorSummary: redact(error.message),
  }));
  if (!health.ok) missing.push('[MISSING: healthy Heureka runtime]');

  const dbSchema = await checkHeurekaTables();
  for (const table of dbSchema.missingTables) {
    missing.push(`[MISSING: public.${table}]`);
  }

  const catalog = await fetchJson(`${catalogServiceUrl}/api/products/${productId}`, {
    headers: catalogHeaders(),
  }).catch((error) => ({
    status: 0,
    ok: false,
    errorSummary: redact(error.message),
  }));
  if (!catalog.ok) missing.push('[MISSING: catalogProductId]');

  const warehouse = await fetchJson(`${warehouseServiceUrl}/api/stock/${productId}`, {
    headers: warehouseHeaders(),
  }).catch((error) => ({
    status: 0,
    ok: false,
    data: null,
    errorSummary: redact(error.message),
  }));
  const warehouseRows = Array.isArray(warehouse.data?.data) ? warehouse.data.data : [];
  const reservableRoutes = routeSummaries(warehouseRows, quantity);
  const selectedWarehouseId = requestedWarehouseId || (reservableRoutes.length === 1 ? reservableRoutes[0].warehouseId : '');

  if (!warehouse.ok || reservableRoutes.length === 0) {
    missing.push('[MISSING: warehouseId]');
  } else if (requestedWarehouseId && !reservableRoutes.some((route) => route.warehouseId === requestedWarehouseId)) {
    missing.push('[MISSING: requested warehouseId reservable route]');
  } else if (!requestedWarehouseId && reservableRoutes.length !== 1) {
    missing.push('[MISSING: canonical warehouseId]');
  }

  return {
    event: 'heureka-order-smoke-preflight',
    channel: CHANNEL,
    endpoint: '/heureka/orders/ingest',
    orderServiceUrlPresent: Boolean(orderServiceUrl),
    productId,
    quantity,
    catalogStatus: catalog.status,
    catalogProductPresent: catalog.ok,
    warehouseStatus: warehouse.status,
    reservableRouteCount: reservableRoutes.length,
    selectedWarehouseId: selectedWarehouseId || null,
    healthStatus: health.status,
    dbSchemaChecked: dbSchema.checked,
    dbPresentTables: dbSchema.presentTables,
    dbMissingTables: dbSchema.missingTables.map((table) => `public.${table}`),
    missing,
    _runtime: {
      heurekaBaseUrl,
      orderServiceUrl,
      productId,
      quantity,
      selectedWarehouseId,
    },
  };
}

function makeSmokeBody(preflight) {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:.]/g, '').replace('Z', '').slice(0, 15);
  const generatedExternalOrderId = `heureka-smoke-${timestamp}-${crypto.randomUUID().slice(0, 8)}`;
  const externalOrderId = (process.env.HEUREKA_ORDER_SMOKE_EXTERNAL_ORDER_ID || generatedExternalOrderId).trim();
  const channelAccountId = (process.env.HEUREKA_ORDER_SMOKE_CHANNEL_ACCOUNT_ID || '').trim() || undefined;

  return {
    externalOrderId,
    channelAccountId,
    orderedAt: now.toISOString(),
    status: 'pending',
    items: [
      {
        catalogProductId: preflight._runtime.productId,
        warehouseId: preflight._runtime.selectedWarehouseId,
        sku: 'HEUREKA-SMOKE',
        title: 'Heureka Orders Smoke Item',
        quantity: preflight._runtime.quantity,
        unitPrice: 1,
        totalPrice: preflight._runtime.quantity,
      },
    ],
    totals: {
      subtotal: preflight._runtime.quantity,
      shippingCost: 0,
      taxAmount: 0,
      total: preflight._runtime.quantity,
      currency: 'CZK',
    },
    payment: { method: 'smoke', status: 'pending' },
    shipping: { method: 'smoke' },
  };
}

async function run() {
  const execute = process.argv.includes('--execute') || bool(process.env.HEUREKA_ORDER_SMOKE_EXECUTE);
  const preflight = await collectPreflight();
  const publicPreflight = { ...preflight };
  delete publicPreflight._runtime;
  jsonLine(publicPreflight);

  if (preflight.missing.length > 0) {
    process.exitCode = 2;
    return;
  }

  if (!execute) {
    jsonLine({
      event: 'heureka-order-smoke-ready',
      execute: false,
      missing: ['[MISSING: explicit smoke execution flag]'],
    });
    return;
  }

  const headers = internalHeaders();
  if (!headers) {
    jsonLine({
      event: 'heureka-order-smoke-live',
      channel: CHANNEL,
      missing: ['[MISSING: Heureka internal service token]'],
    });
    process.exitCode = 2;
    return;
  }

  const body = makeSmokeBody(preflight);
  const ingestUrl = `${preflight._runtime.heurekaBaseUrl}/heureka/orders/ingest`;
  const first = await fetchJson(ingestUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const second = await fetchJson(ingestUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const firstOrder = first.data?.data || {};
  const secondOrder = second.data?.data || {};
  const orderId = firstOrder.orderId || firstOrder.forwarding?.orderId || null;
  const secondOrderId = secondOrder.orderId || secondOrder.forwarding?.orderId || null;
  const orderReadback = orderId
    ? await fetchJson(`${preflight._runtime.orderServiceUrl}/api/orders/${orderId}`, { headers: ordersHeaders() }).catch((error) => ({
        status: 0,
        ok: false,
        data: null,
        errorSummary: redact(error.message),
      }))
    : { status: 0, ok: false, data: null };
  const reservationStatuses = unique(findReservationStatuses([first.data, second.data, orderReadback.data]));
  const cleanup = await cancelSyntheticOrder(preflight._runtime.orderServiceUrl, orderId);
  const missing = [...cleanup.missing];

  if (!first.ok) missing.push('[MISSING: successful first order ingest]');
  if (!second.ok) missing.push('[MISSING: successful idempotent replay]');
  if (!orderId) missing.push('[MISSING: orderId]');
  if (!secondOrder.forwarding?.replay) missing.push('[MISSING: idempotent replay flag]');
  if (orderId && secondOrderId && orderId !== secondOrderId) missing.push('[MISSING: stable idempotent orderId]');
  if (!reservationStatuses.length) missing.push('[MISSING: reservationStatus]');
  if (reservationStatuses.length && !reservationStatuses.includes('reserved')) {
    missing.push('[MISSING: reserved warehouse handoff]');
  }

  jsonLine({
    event: 'heureka-order-smoke-live',
    channel: CHANNEL,
    externalOrderIdShape: externalOrderIdShape(body.externalOrderId),
    idempotencyKeyShape: 'orders.create.v1 + heureka + channelAccountId + externalOrderId',
    firstPostStatus: first.status,
    secondPostStatus: second.status,
    orderIdPresent: Boolean(orderId),
    secondReplay: Boolean(secondOrder.forwarding?.replay),
    sameOrderId: Boolean(orderId && secondOrderId && orderId === secondOrderId),
    ordersReadbackStatus: orderReadback.status,
    reservationStatusPresent: reservationStatuses.length > 0,
    reservationStatuses,
    firstErrorSummary: first.errorSummary,
    secondErrorSummary: second.errorSummary,
    readbackErrorSummary: orderReadback.errorSummary,
    cleanupStatus: cleanup.status,
    cleanupCancelled: cleanup.ok,
    cleanupErrorSummary: cleanup.errorSummary,
    missing,
  });

  if (missing.length > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  jsonLine({
    event: 'heureka-order-smoke-error',
    missing: ['[MISSING: smoke runner completed without exception]'],
    errorSummary: redact(error && error.stack ? error.stack : error.message),
  });
  process.exit(1);
});
