import { buildCatalogFeedReadinessResponse, evaluateCatalogFeedReadiness } from './feed-readiness';

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

const readySnapshot = {
  productId: 'synthetic-product-1',
  productFound: true,
  productActive: true,
  name: 'Synthetic Trail Shoe',
  description: 'Synthetic public description.',
  category: 'Sport | Running shoes',
  primaryImageUrl: 'https://example.test/images/synthetic-trail-shoe.jpg',
  priceVat: '1299.00',
  availableStock: 12,
  settingsActive: true,
  renderableXml: true,
  candidateFeedFields: ['ITEM_ID', 'PRODUCTNAME', 'PRICE_VAT'],
  catalogQuality: {
    policyId: 'catalog.product_quality.v1',
    canActivate: true,
    blockingIssues: [],
    blockingMissingFields: [],
    nextAction: 'ready_for_activation',
  },
};

const ready = evaluateCatalogFeedReadiness(readySnapshot);
assertEqual(ready.readiness, 'ready');
assertEqual(ready.feedEligibility.includedInDryRun, true);
assertEqual(ready.feedEligibility.willMutateCatalog, false);
assertEqual(ready.feedEligibility.willPublishFeed, false);

const blocked = evaluateCatalogFeedReadiness({
  ...readySnapshot,
  productId: 'synthetic-product-2',
  category: '',
  primaryImageUrl: 'http://example.test/images/synthetic.jpg',
  priceVat: 0,
  availableStock: 0,
  candidateFeedFields: ['ITEM_ID', 'INTERNAL_MARGIN'],
});
assertEqual(blocked.readiness, 'blocked');
assertIncludes(blocked.blockers.map((blocker) => blocker.code), 'MISSING_CATEGORY');
assertIncludes(blocked.blockers.map((blocker) => blocker.code), 'INVALID_IMAGE_URL');
assertIncludes(blocked.blockers.map((blocker) => blocker.code), 'PRICE_NOT_POSITIVE');
assertIncludes(blocked.blockers.map((blocker) => blocker.code), 'ZERO_STOCK');
assertIncludes(blocked.blockers.map((blocker) => blocker.code), 'SENSITIVE_FIELD_EXPOSURE');

const catalogBlocked = evaluateCatalogFeedReadiness({
  ...readySnapshot,
  productId: 'synthetic-product-quality-blocked',
  catalogQuality: {
    policyId: 'catalog.product_quality.v1',
    canActivate: false,
    blockingIssues: [
      { code: 'missing_title', field: 'title', message: 'Title is missing.' },
      { code: 'missing_current_price', field: 'price', message: 'Current price is missing.' },
    ],
    blockingMissingFields: ['title', 'price'],
    nextAction: 'resolve_blockers:title,price',
  },
});
assertEqual(catalogBlocked.readiness, 'blocked');
assertIncludes(catalogBlocked.blockers.map((blocker) => blocker.code), 'missing_title');
assertIncludes(catalogBlocked.blockers.map((blocker) => blocker.code), 'missing_current_price');
assertEqual(catalogBlocked.catalogQuality?.policyId, 'catalog.product_quality.v1');
assertEqual(catalogBlocked.feedEligibility.includedInDryRun, false);

const catalogUnavailable = evaluateCatalogFeedReadiness({ ...readySnapshot, productId: 'synthetic-product-quality-unavailable', catalogQuality: null });
assertEqual(catalogUnavailable.readiness, 'blocked');
assertIncludes(catalogUnavailable.blockers.map((blocker) => blocker.code), 'catalog_quality_unavailable');

const warning = evaluateCatalogFeedReadiness({ ...readySnapshot, productId: 'synthetic-product-3', description: '', generationEstimateMs: 60_001 });
assertEqual(warning.readiness, 'warning');
assertIncludes(warning.blockers.map((blocker) => blocker.code), 'MISSING_DESCRIPTION');
assertIncludes(warning.blockers.map((blocker) => blocker.code), 'GENERATION_SLA_RISK');

const unknown = evaluateCatalogFeedReadiness({ productId: 'synthetic-product-4', productFound: false });
assertEqual(unknown.readiness, 'unknown');
assertIncludes(unknown.blockers.map((blocker) => blocker.code), 'PRODUCT_NOT_FOUND');

const generatedAt = new Date('2026-06-13T20:00:00.000Z');
const response = buildCatalogFeedReadinessResponse('heureka_cz', [readySnapshot, { ...readySnapshot, productId: 'synthetic-product-5', availableStock: 0 }], generatedAt);
assertEqual(response.contractVersion, 'catalog-feed-readiness.v1');
assertEqual(response.summary.total, 2);
assertEqual(response.summary.ready, 1);
assertEqual(response.summary.blocked, 1);
assertEqual(response.items[0].productId, 'synthetic-product-1');
const repeated = buildCatalogFeedReadinessResponse('heureka_cz', [readySnapshot, { ...readySnapshot }], generatedAt);
assertEqual(repeated.items.length, 2);
assertEqual(repeated.items[0].productId, 'synthetic-product-1');
assertEqual(repeated.items[1].productId, 'synthetic-product-1');
const replay = buildCatalogFeedReadinessResponse('heureka_cz', [readySnapshot, { ...readySnapshot, productId: 'synthetic-product-5', availableStock: 0 }], new Date('2026-06-13T21:00:00.000Z'));
assertEqual(response.snapshotHash, replay.snapshotHash);

console.log('PASS feed-readiness self-test');
