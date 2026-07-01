#!/usr/bin/env node
'use strict';

const crypto = require('crypto');

const CONTRACT_VERSION = 'heureka-external-readiness.v1';
const DEFAULT_PUBLIC_FEED_URL = 'https://heureka.alfares.cz/heureka/feed?type=heureka_cz';
const OWNER_BLOCKERS = [
  '[UNKNOWN: shop approval]',
  '[UNKNOWN: current external Heureka import/feed-validity result]',
  '[MISSING: owner-supplied e-shop registration legal/company fields]',
  '[MISSING: Heureka merchant/API key approval evidence]',
];

function env(name, fallback = '') {
  const value = String(process.env[name] || '').trim();
  return value || fallback;
}

function numberEnv(name, fallback, min, max) {
  const parsed = Number(process.env[name]);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function booleanEnv(name, fallback = false) {
  const value = String(process.env[name] || '').trim().toLowerCase();
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value);
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function countMatches(text, pattern) {
  return Array.from(String(text || '').matchAll(pattern)).length;
}

function timeoutSignal(label) {
  const timeoutMs = numberEnv('HEUREKA_EXTERNAL_VERIFY_TIMEOUT_MS', 15000, 1000, 120000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timer), timeoutMs };
}

async function fetchText(url, options = {}) {
  const { signal, clear, timeoutMs } = timeoutSignal(options.label || url);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: options.headers || {},
      redirect: 'follow',
      signal,
    });
    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      url: response.url || url,
      headers: response.headers,
      body: text,
      timeoutMs,
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`${options.label || url} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clear();
  }
}

function feedStatusFromResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const heurekaFeedStatus = response.headers.get('x-heureka-feed-status') || null;
  const body = response.body || '';
  const shopItemCount = countMatches(body, /<SHOPITEM\b/gi);
  const imgUrlCount = countMatches(body, /<IMGURL\b/gi);
  const hasXmlEnvelope = /<SHOP\b/i.test(body) && /<\/SHOP>/i.test(body);
  const errors = [];

  if (!response.ok) errors.push(`Public feed returned HTTP ${response.status}`);
  if (!/xml/i.test(contentType)) errors.push(`Public feed content-type is not XML: ${contentType || '[missing]'}`);
  if (!hasXmlEnvelope) errors.push('Public feed body does not contain a SHOP XML envelope');
  if (shopItemCount < 1) errors.push('Public feed contains no SHOPITEM entries');
  if (heurekaFeedStatus && !['valid', 'ready', 'ok'].includes(heurekaFeedStatus.toLowerCase())) {
    errors.push(`Public feed status header is ${heurekaFeedStatus}`);
  }

  return {
    status: errors.length ? 'blocked' : 'ready',
    url: response.url,
    httpStatus: response.status,
    contentType,
    heurekaFeedStatus,
    contentLength: Buffer.byteLength(body),
    bodySha256: sha256(body),
    shopItemCount,
    imgUrlCount,
    hasXmlEnvelope,
    errors,
  };
}

async function verifyPublicFeed() {
  const url = env('HEUREKA_EXTERNAL_FEED_URL', DEFAULT_PUBLIC_FEED_URL);
  try {
    const response = await fetchText(url, {
      label: 'Heureka public XML feed',
      headers: { Accept: 'application/xml,text/xml,*/*' },
    });
    return feedStatusFromResponse(response);
  } catch (error) {
    return {
      status: 'blocked',
      url,
      httpStatus: null,
      contentType: null,
      heurekaFeedStatus: null,
      contentLength: 0,
      bodySha256: null,
      shopItemCount: 0,
      imgUrlCount: 0,
      hasXmlEnvelope: false,
      errors: [error.message],
    };
  }
}

async function verifyOptionalReadinessLanes() {
  const url = env('HEUREKA_EXTERNAL_READINESS_LANES_URL');
  const bearer = env('HEUREKA_EXTERNAL_READINESS_BEARER');
  if (!url) {
    return {
      status: 'skipped',
      reason: '[MISSING: HEUREKA_EXTERNAL_READINESS_LANES_URL]',
    };
  }
  if (!bearer) {
    return {
      status: 'skipped',
      url,
      reason: '[MISSING: HEUREKA_EXTERNAL_READINESS_BEARER]',
    };
  }

  try {
    const response = await fetchText(url, {
      label: 'Heureka protected readiness lanes',
      headers: {
        Accept: 'application/json',
        Authorization: bearer.startsWith('Bearer ') ? bearer : `Bearer ${bearer}`,
      },
    });
    let payload = null;
    try {
      payload = JSON.parse(response.body || '{}');
    } catch (error) {
      return {
        status: 'blocked',
        url: response.url,
        httpStatus: response.status,
        errors: [`Protected readiness lanes did not return JSON: ${error.message}`],
      };
    }

    const data = payload?.data || payload;
    return {
      status: response.ok ? 'checked' : 'blocked',
      url: response.url,
      httpStatus: response.status,
      contractVersion: data?.contractVersion || payload?.contractVersion || null,
      readOnly: data?.readOnly ?? payload?.readOnly ?? null,
      activeProductCount: data?.summary?.activeProductCount ?? data?.activeProductCount ?? null,
      readyProductCount: data?.summary?.readyProductCount ?? data?.readyProductCount ?? null,
      blockedProductCount: data?.summary?.blockedProductCount ?? data?.blockedProductCount ?? null,
      blockerCounts: data?.summary?.blockerCounts || data?.blockerCounts || null,
      errors: response.ok ? [] : [`Protected readiness lanes returned HTTP ${response.status}`],
    };
  } catch (error) {
    return {
      status: 'blocked',
      url,
      httpStatus: null,
      errors: [error.message],
    };
  }
}

function externalOnboardingStatus(publicFeed) {
  const blockers = [...OWNER_BLOCKERS];
  if (publicFeed.status !== 'ready') {
    blockers.unshift('[MISSING: valid public Heureka XML feed]');
  }

  return {
    status: blockers.length ? 'blocked' : 'ready',
    blockers,
    ownerOnlyEvidenceRequired: [
      'Heureka shop administration status screenshot/export or API response showing approved shop/import state.',
      'Owner-supplied legal/company registration fields used in the external Heureka account.',
      'Merchant/API-key approval evidence, stored only in the approved secret manager if needed.',
    ],
    forbiddenActions: [
      'Do not submit external Heureka forms without owner approval.',
      'Do not print or commit merchant/API secrets.',
      'Do not infer legal/company fields from unrelated repositories.',
    ],
  };
}

async function main() {
  const publicFeed = await verifyPublicFeed();
  const readinessLanes = await verifyOptionalReadinessLanes();
  const externalOnboarding = externalOnboardingStatus(publicFeed);
  const failOnOwnerBlockers = booleanEnv('HEUREKA_EXTERNAL_FAIL_ON_OWNER_BLOCKERS', false);

  const result = {
    contractVersion: CONTRACT_VERSION,
    generatedAt: new Date().toISOString(),
    readOnly: true,
    mutations: [],
    publicFeed,
    protectedReadinessLanes: readinessLanes,
    externalOnboarding,
    validation: {
      passedPublicFeed: publicFeed.status === 'ready',
      ownerBlockersRemain: externalOnboarding.blockers.length > 0,
      failOnOwnerBlockers,
    },
    nextActions: [
      'Owner checks current Heureka shop/import status in Heureka administration or an approved API.',
      'Owner supplies missing legal/company registration evidence and merchant approval record.',
      'After stock/media owner lanes change, rerun verify:heureka-blocked-product-lanes and this verifier.',
    ],
  };

  console.log(JSON.stringify(result, null, 2));

  if (publicFeed.status !== 'ready') {
    process.exit(1);
  }
  if (failOnOwnerBlockers && externalOnboarding.blockers.length > 0) {
    process.exit(2);
  }
}

main().catch((error) => {
  console.error(`heureka external readiness verification failed: ${error.stack || error.message}`);
  process.exit(1);
});
