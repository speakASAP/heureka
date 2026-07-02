#!/usr/bin/env node
'use strict';

const CONTRACT_VERSION = 'heureka-blocked-product-lanes.v1';
const DEFAULT_HEUREKA_BASE_URL = 'http://127.0.0.1:3800';
const DEFAULT_CATALOG_BASE_URL = 'http://catalog-microservice:3200';
const DEFAULT_WAREHOUSE_BASE_URL = 'http://warehouse-microservice:3201';
const DEFAULT_FEED_TYPE = 'heureka_cz';
const MAX_READINESS_BATCH_SIZE = 100;

function env(name, fallback) {
  const value = String(process.env[name] || '').trim();
  return value || fallback;
}

function numberEnv(name, fallback, min, max) {
  const parsed = Number(process.env[name]);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function optionalString(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function getCatalogInternalToken() {
  return optionalString(
    process.env.CATALOG_INTERNAL_SERVICE_TOKEN ||
    process.env.HEUREKA_INTERNAL_SERVICE_TOKEN ||
    process.env.INTERNAL_SERVICE_TOKEN ||
    process.env.JWT_TOKEN,
  );
}

function getWarehouseToken() {
  return optionalString(
    process.env.WAREHOUSE_SERVICE_TOKEN ||
    process.env.JWT_TOKEN ||
    process.env.SERVICE_TOKEN,
  );
}

function catalogHeaders() {
  const token = getCatalogInternalToken();
  return token ? {
    'x-internal-service-token': token,
    'x-service-name': 'heureka-service',
  } : {};
}

function warehouseHeaders() {
  const token = getWarehouseToken();
  return token ? {
    Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
  } : {};
}

function jsonHeaders(headers = {}) {
  return {
    ...headers,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

async function requestJson(url, options = {}) {
  const timeoutMs = numberEnv('HEUREKA_VERIFY_TIMEOUT_MS', 15000, 1000, 120000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const label = options.label || url;

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
    const text = await response.text();
    let payload = null;
    if (text.trim()) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { raw: text.slice(0, 500) };
      }
    }
    if (!response.ok) {
      const preview = typeof payload?.message === 'string'
        ? payload.message
        : JSON.stringify(payload || {}).slice(0, 500);
      throw new Error(`${label} returned HTTP ${response.status}: ${preview}`);
    }
    return payload || {};
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`${label} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function extractItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.products)) return payload.data.products;
  return [];
}

function extractTotal(payload, fallback) {
  const candidates = [
    payload?.pagination?.total,
    payload?.data?.pagination?.total,
    payload?.total,
    payload?.data?.total,
  ];
  for (const value of candidates) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function productIdOf(product) {
  return optionalString(product?.id || product?.productId || product?.uuid || product?.catalogProductId);
}

function productSkuOf(product) {
  return optionalString(product?.sku || product?.SKU || product?.code || product?.productCode);
}

function productNameOf(product) {
  return optionalString(product?.title || product?.name || product?.productName);
}

function productCategoryOf(product) {
  return optionalString(product?.categoryText || product?.categoryPath || product?.categoryName || product?.category);
}

async function fetchActiveCatalogProducts(catalogBaseUrl) {
  const pageSize = numberEnv('HEUREKA_VERIFY_CATALOG_PAGE_SIZE', 100, 1, 100);
  const maxProducts = numberEnv('HEUREKA_VERIFY_MAX_PRODUCTS', 1000, 1, 10000);
  const headers = catalogHeaders();
  const products = [];
  let total = null;

  for (let page = 1; products.length < maxProducts; page += 1) {
    const url = new URL(`${catalogBaseUrl}/api/products`);
    url.searchParams.set('isActive', 'true');
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', String(pageSize));
    const payload = await requestJson(url.toString(), {
      headers,
      label: `Catalog active products page ${page}`,
    });
    const items = extractItems(payload).filter((product) => productIdOf(product));
    products.push(...items);
    total = extractTotal(payload, total === null ? products.length : total);
    if (!items.length || items.length < pageSize) break;
    if (total !== null && products.length >= total) break;
  }

  const byId = new Map();
  for (const product of products.slice(0, maxProducts)) {
    const id = productIdOf(product);
    if (id && !byId.has(id)) byId.set(id, product);
  }

  return {
    total: total === null ? byId.size : total,
    items: Array.from(byId.values()),
    truncated: total !== null && byId.size < total,
  };
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function fetchBulkReadiness(heurekaBaseUrl, feedType, productIds) {
  const responses = [];
  const items = [];
  for (const productIdChunk of chunk(productIds, MAX_READINESS_BATCH_SIZE)) {
    const payload = await requestJson(`${heurekaBaseUrl}/heureka/feed/readiness/bulk`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: { feedType, productIds: productIdChunk },
      label: `Heureka readiness bulk ${productIdChunk.length} products`,
    });
    const data = payload?.data || payload;
    responses.push(data);
    items.push(...extractItems(data));
  }
  return { responses, items };
}

async function fetchWarehouseAvailability(warehouseBaseUrl, productIds) {
  const rows = [];
  for (const productIdChunk of chunk(productIds, MAX_READINESS_BATCH_SIZE)) {
    const payload = await requestJson(`${warehouseBaseUrl}/api/stock/availability/batch`, {
      method: 'POST',
      headers: jsonHeaders(warehouseHeaders()),
      body: { productIds: productIdChunk },
      label: `Warehouse availability batch ${productIdChunk.length} products`,
    });
    rows.push(...extractItems(payload));
  }
  const byProductId = new Map();
  for (const row of rows) {
    const productId = optionalString(row?.productId);
    if (!productId) continue;
    const totalAvailable = Number(row?.totalAvailable);
    byProductId.set(productId, Number.isFinite(totalAvailable) ? totalAvailable : null);
  }
  return { rows, byProductId };
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  });
  await Promise.all(workers);
  return results;
}

function snapshotImageUrl(snapshot) {
  return optionalString(
    snapshot?.feedFields?.IMGURL ||
    snapshot?.content?.feedFields?.IMGURL ||
    snapshot?.data?.feedFields?.IMGURL ||
    snapshot?.data?.content?.feedFields?.IMGURL,
  );
}

async function fetchMediaEvidence(catalogBaseUrl, feedType, productIds) {
  const headers = catalogHeaders();
  const concurrency = numberEnv('HEUREKA_VERIFY_MEDIA_CONCURRENCY', 5, 1, 20);
  const detailLimit = numberEnv('HEUREKA_VERIFY_MEDIA_DETAIL_LIMIT', 100, 1, 1000);
  const ids = productIds.slice(0, detailLimit);
  const evidence = await mapLimit(ids, concurrency, async (productId) => {
    const result = { productId, mediaCount: 0, primaryMediaUrls: [], feedSnapshotImgUrl: null, error: null };
    try {
      const mediaPayload = await requestJson(`${catalogBaseUrl}/api/media/product/${encodeURIComponent(productId)}`, {
        headers,
        label: `Catalog media ${productId}`,
      });
      const mediaItems = extractItems(mediaPayload);
      result.mediaCount = mediaItems.length;
      result.primaryMediaUrls = mediaItems
        .filter((item) => item?.isPrimary || item?.primary)
        .map((item) => optionalString(item?.url || item?.publicUrl || item?.src))
        .filter(Boolean)
        .slice(0, 3);

      const snapshotPayload = await requestJson(`${catalogBaseUrl}/api/products/${encodeURIComponent(productId)}/heureka-feed-snapshot?feedType=${encodeURIComponent(feedType)}`, {
        headers,
        label: `Catalog Heureka feed snapshot ${productId}`,
      });
      result.feedSnapshotImgUrl = snapshotImageUrl(snapshotPayload?.data || snapshotPayload);
    } catch (error) {
      result.error = String(error?.message || error);
    }
    return result;
  });

  return {
    inspected: evidence.length,
    truncated: productIds.length > ids.length,
    items: evidence,
  };
}

function indexReadinessItems(items) {
  const byProductId = new Map();
  const byBlockerCode = {};
  const summary = { total: 0, ready: 0, warning: 0, blocked: 0, unknown: 0 };

  for (const item of items) {
    const productId = optionalString(item?.productId);
    if (!productId) continue;
    byProductId.set(productId, item);
    const state = optionalString(item?.readiness) || 'unknown';
    summary.total += 1;
    if (Object.prototype.hasOwnProperty.call(summary, state)) summary[state] += 1;
    else summary.unknown += 1;

    for (const blocker of item?.blockers || []) {
      const code = optionalString(blocker?.code);
      if (!code) continue;
      if (!byBlockerCode[code]) byBlockerCode[code] = [];
      byBlockerCode[code].push(productId);
    }
  }

  for (const code of Object.keys(byBlockerCode)) {
    byBlockerCode[code] = Array.from(new Set(byBlockerCode[code])).sort();
  }

  return { byProductId, byBlockerCode, summary };
}

function blockerCounts(byBlockerCode) {
  return Object.fromEntries(
    Object.entries(byBlockerCode)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([code, ids]) => [code, ids.length]),
  );
}

function productEvidence(productIds, productsById, readinessById, warehouseById) {
  return productIds.map((productId) => {
    const product = productsById.get(productId) || {};
    const readiness = readinessById.get(productId) || {};
    return {
      productId,
      sku: productSkuOf(product),
      name: productNameOf(product),
      category: productCategoryOf(product),
      readiness: readiness.readiness || null,
      blockers: (readiness.blockers || []).map((blocker) => blocker.code).filter(Boolean),
      readinessAvailableStock: readiness.availableStock === undefined ? null : readiness.availableStock,
      warehouseTotalAvailable: warehouseById.has(productId) ? warehouseById.get(productId) : null,
    };
  });
}

function buildLanes(byBlockerCode, warehouseRows, productIds) {
  const zeroStock = byBlockerCode.ZERO_STOCK || [];
  const stockUnknown = byBlockerCode.STOCK_UNKNOWN || [];
  const missingImage = byBlockerCode.MISSING_PRIMARY_IMAGE || [];
  const invalidImage = byBlockerCode.INVALID_IMAGE_URL || [];
  const catalogMissingImage = byBlockerCode.missing_image || [];
  const catalogPlaceholderImage = byBlockerCode.placeholder_image_only || [];
  const productNotFound = byBlockerCode.PRODUCT_NOT_FOUND || [];
  const missingDescription = byBlockerCode.MISSING_DESCRIPTION || [];
  const missingCategory = byBlockerCode.MISSING_CATEGORY || [];
  const missingName = byBlockerCode.MISSING_PRODUCT_NAME || [];
  const missingPrice = [...(byBlockerCode.PRICE_MISSING || []), ...(byBlockerCode.PRICE_NOT_POSITIVE || [])];
  const catalogSku = [...(byBlockerCode.missing_sku || []), ...(byBlockerCode.duplicate_sku || [])];
  const catalogTitle = byBlockerCode.missing_title || [];
  const catalogDescription = byBlockerCode.missing_description || [];
  const catalogPrice = byBlockerCode.missing_current_price || [];
  const catalogLifecycle = [...(byBlockerCode.archived_product || []), ...(byBlockerCode.invalid_lifecycle_for_quality || [])];
  const catalogQualityUnavailable = byBlockerCode.catalog_quality_unavailable || [];

  return {
    stock: {
      status: zeroStock.length || stockUnknown.length ? 'blocked' : 'ready',
      zeroStockProductIds: zeroStock,
      stockUnknownProductIds: stockUnknown,
      warehouseRows: warehouseRows.length,
      warehouseRowsMissing: productIds.filter((productId) => !warehouseRows.some((row) => row?.productId === productId)),
      blockers: [
        ...(zeroStock.length ? [`[MISSING: stock for ${zeroStock.length} current active products]`] : []),
        ...(stockUnknown.length ? [`[MISSING: authoritative Warehouse availability for ${stockUnknown.length} current active products]`] : []),
        ...(zeroStock.length ? ['[UNKNOWN: which zero-stock products should be listed on Heureka now]'] : []),
      ],
      ownerRole: 'Warehouse/data owner',
      allowedAction: 'Provide authoritative current stock or explicitly keep products excluded from Heureka feed.',
      forbiddenAction: 'Do not fabricate stock quantities from order history.',
    },
    media: {
      status: missingImage.length || invalidImage.length || catalogMissingImage.length || catalogPlaceholderImage.length ? 'blocked' : 'ready',
      missingPrimaryImageProductIds: Array.from(new Set([...missingImage, ...catalogMissingImage])).sort(),
      placeholderOnlyImageProductIds: catalogPlaceholderImage,
      invalidImageProductIds: invalidImage,
      blockers: [
        ...(missingImage.length ? [`[MISSING: primary image for ${missingImage.length} current active products]`] : []),
        ...(catalogMissingImage.length ? [`[MISSING: Catalog product-quality image for ${catalogMissingImage.length} products]`] : []),
        ...(catalogPlaceholderImage.length ? [`[MISSING: non-placeholder Catalog image for ${catalogPlaceholderImage.length} products]`] : []),
        ...(missingImage.length || catalogMissingImage.length || catalogPlaceholderImage.length ? ['[MISSING: approved public image URLs or image files for affected products]'] : []),
        ...(invalidImage.length ? [`[MISSING: public HTTPS image URL replacement for ${invalidImage.length} products]`] : []),
      ],
      ownerRole: 'Catalog media owner',
      allowedAction: 'Attach approved public HTTPS primary images in Catalog media or Catalog Heureka feed snapshot.',
      forbiddenAction: 'Do not invent product images or use private/non-public URLs.',
    },
    catalogContent: {
      status: productNotFound.length || missingName.length || missingDescription.length || missingCategory.length || missingPrice.length || catalogSku.length || catalogTitle.length || catalogDescription.length || catalogPrice.length || catalogLifecycle.length || catalogQualityUnavailable.length ? 'blocked' : 'ready',
      productNotFoundProductIds: productNotFound,
      missingNameProductIds: missingName,
      missingSkuProductIds: Array.from(new Set(catalogSku)).sort(),
      missingTitleProductIds: catalogTitle,
      missingDescriptionProductIds: Array.from(new Set([...missingDescription, ...catalogDescription])).sort(),
      missingCategoryProductIds: missingCategory,
      missingPriceProductIds: Array.from(new Set([...missingPrice, ...catalogPrice])).sort(),
      lifecycleBlockedProductIds: Array.from(new Set(catalogLifecycle)).sort(),
      catalogQualityUnavailableProductIds: catalogQualityUnavailable,
      blockers: [
        ...(productNotFound.length ? [`[MISSING: Catalog rows for ${productNotFound.length} active products]`] : []),
        ...(missingName.length ? [`[MISSING: public product name for ${missingName.length} products]`] : []),
        ...(missingDescription.length ? [`[MISSING: public Heureka description for ${missingDescription.length} products]`] : []),
        ...(missingCategory.length ? [`[MISSING: public Heureka category text for ${missingCategory.length} products]`] : []),
        ...(missingPrice.length ? [`[MISSING: public VAT-inclusive price for ${new Set(missingPrice).size} products]`] : []),
        ...(catalogSku.length ? [`[MISSING: Catalog product-quality SKU repair for ${new Set(catalogSku).size} products]`] : []),
        ...(catalogTitle.length ? [`[MISSING: Catalog product-quality title for ${catalogTitle.length} products]`] : []),
        ...(catalogDescription.length ? [`[MISSING: Catalog product-quality description for ${catalogDescription.length} products]`] : []),
        ...(catalogPrice.length ? [`[MISSING: Catalog product-quality current price for ${catalogPrice.length} products]`] : []),
        ...(catalogLifecycle.length ? [`[MISSING: Catalog lifecycle approval for ${new Set(catalogLifecycle).size} products]`] : []),
        ...(catalogQualityUnavailable.length ? [`[MISSING: Catalog product quality review response for ${catalogQualityUnavailable.length} products]`] : []),
      ],
      ownerRole: 'Catalog/pricing owner',
      allowedAction: 'Repair mandatory Catalog product quality blockers, public marketplace fields, and pricing through guarded Catalog workflows.',
      forbiddenAction: 'Do not patch feed XML directly around missing Catalog source data.',
    },
  };
}

async function main() {
  const heurekaBaseUrl = trimTrailingSlash(env('HEUREKA_VERIFY_BASE_URL', DEFAULT_HEUREKA_BASE_URL));
  const catalogBaseUrl = trimTrailingSlash(env('CATALOG_SERVICE_URL', DEFAULT_CATALOG_BASE_URL));
  const warehouseBaseUrl = trimTrailingSlash(env('WAREHOUSE_SERVICE_URL', DEFAULT_WAREHOUSE_BASE_URL));
  const feedType = env('HEUREKA_VERIFY_FEED_TYPE', DEFAULT_FEED_TYPE);
  const failOnBlocked = String(process.env.HEUREKA_VERIFY_FAIL_ON_BLOCKED || '').toLowerCase() === 'true';

  const catalog = await fetchActiveCatalogProducts(catalogBaseUrl);
  const products = catalog.items;
  const productIds = products.map(productIdOf).filter(Boolean);
  const productsById = new Map(products.map((product) => [productIdOf(product), product]));

  if (!productIds.length) {
    throw new Error('No active Catalog products were returned; cannot verify Heureka blocker lanes.');
  }

  const [readiness, warehouse] = await Promise.all([
    fetchBulkReadiness(heurekaBaseUrl, feedType, productIds),
    fetchWarehouseAvailability(warehouseBaseUrl, productIds),
  ]);

  const indexed = indexReadinessItems(readiness.items);
  const counts = blockerCounts(indexed.byBlockerCode);
  const lanes = buildLanes(indexed.byBlockerCode, warehouse.rows, productIds);
  const blockedProductIds = Array.from(new Set(
    Object.values(indexed.byBlockerCode).flat(),
  )).sort();
  const mediaEvidenceIds = Array.from(new Set([
    ...(indexed.byBlockerCode.MISSING_PRIMARY_IMAGE || []),
    ...(indexed.byBlockerCode.INVALID_IMAGE_URL || []),
  ])).sort();
  const mediaEvidence = mediaEvidenceIds.length
    ? await fetchMediaEvidence(catalogBaseUrl, feedType, mediaEvidenceIds)
    : { inspected: 0, truncated: false, items: [] };

  const output = {
    contractVersion: CONTRACT_VERSION,
    generatedAt: new Date().toISOString(),
    readOnly: true,
    mutations: [],
    feedType,
    inputs: {
      heurekaBaseUrl,
      catalogBaseUrl,
      warehouseBaseUrl,
      activeCatalogProductsReturned: productIds.length,
      activeCatalogProductsReportedTotal: catalog.total,
      activeCatalogProductsTruncated: catalog.truncated,
    },
    readiness: {
      contractVersions: Array.from(new Set(readiness.responses.map((response) => response.contractVersion).filter(Boolean))),
      summary: indexed.summary,
      blockerCounts: counts,
      responseCount: readiness.responses.length,
    },
    lanes,
    mediaEvidence,
    blockedProducts: productEvidence(blockedProductIds, productsById, indexed.byProductId, warehouse.byProductId),
    nextActions: [
      ...(lanes.stock.status === 'blocked' ? ['Stock owner: provide authoritative current stock or exclusion decisions for zero-stock products.'] : []),
      ...(lanes.media.status === 'blocked' ? ['Catalog media owner: attach approved public HTTPS primary images for affected products.'] : []),
      ...(lanes.catalogContent.status === 'blocked' ? ['Catalog/pricing owner: repair mandatory Catalog product quality blockers and public marketplace fields at the Catalog source.'] : []),
    ],
  };

  console.log(JSON.stringify(output, null, 2));

  if (failOnBlocked && blockedProductIds.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    contractVersion: CONTRACT_VERSION,
    generatedAt: new Date().toISOString(),
    readOnly: true,
    success: false,
    error: String(error?.message || error),
  }, null, 2));
  process.exit(2);
});
