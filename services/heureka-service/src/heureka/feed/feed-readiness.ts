export const CATALOG_FEED_READINESS_CONTRACT_VERSION = 'catalog-feed-readiness.v1';
export const CATALOG_PRODUCT_QUALITY_POLICY_ID = 'catalog.product_quality.v1';

export type CatalogFeedReadinessState = 'ready' | 'warning' | 'blocked' | 'unknown';
export type CatalogFeedReadinessSeverity = 'warning' | 'blocker';
export type CatalogFeedReadinessOwnerService =
  | 'catalog-service'
  | 'catalog-media-service'
  | 'catalog-pricing-service'
  | 'warehouse-service'
  | 'heureka-service'
  | 'source-owner';

export type CatalogProductQualityBlockingIssueCode =
  | 'missing_sku'
  | 'duplicate_sku'
  | 'missing_title'
  | 'missing_description'
  | 'missing_current_price'
  | 'missing_image'
  | 'placeholder_image_only'
  | 'archived_product'
  | 'invalid_lifecycle_for_quality'
  | 'catalog_quality_unavailable';

export type CatalogFeedReadinessBlockerCode =
  | 'PRODUCT_NOT_FOUND'
  | 'PRODUCT_INACTIVE'
  | 'MISSING_PRODUCT_NAME'
  | 'MISSING_DESCRIPTION'
  | 'MISSING_CATEGORY'
  | 'MISSING_PRIMARY_IMAGE'
  | 'INVALID_IMAGE_URL'
  | 'PRICE_MISSING'
  | 'PRICE_NOT_POSITIVE'
  | 'ZERO_STOCK'
  | 'STOCK_UNKNOWN'
  | 'SETTINGS_INACTIVE'
  | 'XML_RENDER_INVALID'
  | 'SENSITIVE_FIELD_EXPOSURE'
  | 'GENERATION_SLA_RISK'
  | CatalogProductQualityBlockingIssueCode;

export interface CatalogProductQualityIssueSnapshot {
  code?: string;
  message?: string;
  severity?: string;
  field?: string;
  source?: string;
}

export interface CatalogProductQualitySnapshot {
  policyId?: string;
  unavailable?: boolean;
  canActivate?: boolean | null;
  blockingIssues?: Array<CatalogProductQualityIssueSnapshot | string>;
  blockingMissingFields?: string[];
  nextAction?: string | null;
  missing?: string[];
}

export interface CatalogFeedReadinessBlocker {
  code: CatalogFeedReadinessBlockerCode;
  severity: CatalogFeedReadinessSeverity;
  ownerService: CatalogFeedReadinessOwnerService;
  publicReason: string;
  remediationHint: string;
}

export interface CatalogFeedReadinessSnapshot {
  productId: string;
  productFound: boolean;
  productActive?: boolean;
  name?: string | null;
  description?: string | null;
  category?: string | null;
  primaryImageUrl?: string | null;
  priceVat?: number | string | null;
  availableStock?: number | null;
  settingsActive?: boolean;
  renderableXml?: boolean;
  candidateFeedFields?: string[];
  generationEstimateMs?: number;
  catalogQuality?: CatalogProductQualitySnapshot | null;
}

export interface CatalogFeedReadinessItem {
  productId: string;
  readiness: CatalogFeedReadinessState;
  availableStock?: number | null;
  settingsActive?: boolean;
  blockers: CatalogFeedReadinessBlocker[];
  catalogQuality?: {
    policyId: string;
    unavailable: boolean;
    canActivate: boolean | null;
    blockingIssues: CatalogProductQualityIssueSnapshot[];
    blockingMissingFields: string[];
    nextAction: string | null;
    missing: string[];
  };
  feedEligibility: {
    includedInDryRun: boolean;
    willMutateCatalog: false;
    willPublishFeed: false;
  };
}

export interface CatalogFeedReadinessResponse {
  contractVersion: typeof CATALOG_FEED_READINESS_CONTRACT_VERSION;
  feedType: string;
  snapshotHash: string;
  generatedAt: string;
  summary: {
    total: number;
    ready: number;
    blocked: number;
    warning: number;
    unknown: number;
  };
  items: CatalogFeedReadinessItem[];
}

const MAX_READINESS_BATCH_SIZE = 100;
const GENERATION_SLA_WARNING_MS = 60_000;
const SENSITIVE_FIELD_PATTERN = /(?:COST|MARGIN|PROFIT|SUPPLIER|WHOLESALE|PAYMENT_API_KEY|API_KEY|SECRET|TOKEN|PASSWORD|CUSTOMER)/i;

const BLOCKERS: Record<CatalogFeedReadinessBlockerCode, CatalogFeedReadinessBlocker> = Object.freeze({
  PRODUCT_NOT_FOUND: {
    code: 'PRODUCT_NOT_FOUND',
    severity: 'blocker',
    ownerService: 'catalog-service',
    publicReason: 'Catalog product was not found for the requested id.',
    remediationHint: 'Confirm the product exists and retry readiness with the catalog id.',
  },
  PRODUCT_INACTIVE: {
    code: 'PRODUCT_INACTIVE',
    severity: 'blocker',
    ownerService: 'catalog-service',
    publicReason: 'Product is not active for marketplace publication.',
    remediationHint: 'Activate the product in catalog when it is approved for public sale.',
  },
  MISSING_PRODUCT_NAME: {
    code: 'MISSING_PRODUCT_NAME',
    severity: 'blocker',
    ownerService: 'catalog-service',
    publicReason: 'Product has no public name for XML output.',
    remediationHint: 'Add a public product name in catalog.',
  },
  MISSING_DESCRIPTION: {
    code: 'MISSING_DESCRIPTION',
    severity: 'warning',
    ownerService: 'catalog-service',
    publicReason: 'Product has no public description.',
    remediationHint: 'Add a public-safe product description in catalog.',
  },
  MISSING_CATEGORY: {
    code: 'MISSING_CATEGORY',
    severity: 'blocker',
    ownerService: 'catalog-service',
    publicReason: 'Product has no public Heureka category text.',
    remediationHint: 'Map the product to a public category path in catalog.',
  },
  MISSING_PRIMARY_IMAGE: {
    code: 'MISSING_PRIMARY_IMAGE',
    severity: 'blocker',
    ownerService: 'catalog-media-service',
    publicReason: 'Product has no public primary image URL.',
    remediationHint: 'Attach a public primary image in catalog media.',
  },
  INVALID_IMAGE_URL: {
    code: 'INVALID_IMAGE_URL',
    severity: 'blocker',
    ownerService: 'catalog-media-service',
    publicReason: 'Product image URL is not usable in public XML.',
    remediationHint: 'Replace the image URL with a public HTTPS URL.',
  },
  PRICE_MISSING: {
    code: 'PRICE_MISSING',
    severity: 'blocker',
    ownerService: 'catalog-pricing-service',
    publicReason: 'Product has no public price.',
    remediationHint: 'Publish a current public VAT-inclusive price.',
  },
  PRICE_NOT_POSITIVE: {
    code: 'PRICE_NOT_POSITIVE',
    severity: 'blocker',
    ownerService: 'catalog-pricing-service',
    publicReason: 'Product price is zero or negative.',
    remediationHint: 'Correct the public selling price before feed inclusion.',
  },
  ZERO_STOCK: {
    code: 'ZERO_STOCK',
    severity: 'blocker',
    ownerService: 'warehouse-service',
    publicReason: 'Product has no available stock.',
    remediationHint: 'Replenish stock or keep the product excluded from the feed.',
  },
  STOCK_UNKNOWN: {
    code: 'STOCK_UNKNOWN',
    severity: 'blocker',
    ownerService: 'warehouse-service',
    publicReason: 'Available stock could not be determined.',
    remediationHint: 'Restore warehouse stock lookup or replay readiness with a complete snapshot.',
  },
  SETTINGS_INACTIVE: {
    code: 'SETTINGS_INACTIVE',
    severity: 'blocker',
    ownerService: 'heureka-service',
    publicReason: 'Feed settings are missing or inactive.',
    remediationHint: 'Activate the feed settings before running readiness.',
  },
  XML_RENDER_INVALID: {
    code: 'XML_RENDER_INVALID',
    severity: 'blocker',
    ownerService: 'heureka-service',
    publicReason: 'Product data would render invalid feed XML.',
    remediationHint: 'Fix the source public fields identified by validation and replay readiness.',
  },
  SENSITIVE_FIELD_EXPOSURE: {
    code: 'SENSITIVE_FIELD_EXPOSURE',
    severity: 'blocker',
    ownerService: 'source-owner',
    publicReason: 'Candidate feed data includes a non-public field.',
    remediationHint: 'Remove internal cost, margin, supplier-private, customer, or secret values from the source contract before feed use.',
  },
  GENERATION_SLA_RISK: {
    code: 'GENERATION_SLA_RISK',
    severity: 'warning',
    ownerService: 'heureka-service',
    publicReason: 'Synthetic dry-run indicates feed generation may exceed the 60 second SLA.',
    remediationHint: 'Reduce batch size, improve upstream latency, or run performance validation before release.',
  },
  missing_sku: {
    code: 'missing_sku',
    severity: 'blocker',
    ownerService: 'catalog-service',
    publicReason: 'Catalog product quality policy blocks products without a SKU.',
    remediationHint: 'Add a non-empty SKU in Catalog before Heureka feed inclusion.',
  },
  duplicate_sku: {
    code: 'duplicate_sku',
    severity: 'blocker',
    ownerService: 'catalog-service',
    publicReason: 'Catalog product quality policy blocks duplicate SKUs in the owner/source scope.',
    remediationHint: 'Resolve the duplicate SKU in Catalog before Heureka feed inclusion.',
  },
  missing_title: {
    code: 'missing_title',
    severity: 'blocker',
    ownerService: 'catalog-service',
    publicReason: 'Catalog product quality policy blocks products without a title.',
    remediationHint: 'Add a title in Catalog before Heureka feed inclusion.',
  },
  missing_description: {
    code: 'missing_description',
    severity: 'blocker',
    ownerService: 'catalog-service',
    publicReason: 'Catalog product quality policy blocks products without a description.',
    remediationHint: 'Add a public-safe description in Catalog before Heureka feed inclusion.',
  },
  missing_current_price: {
    code: 'missing_current_price',
    severity: 'blocker',
    ownerService: 'catalog-pricing-service',
    publicReason: 'Catalog product quality policy blocks products without a current positive price.',
    remediationHint: 'Publish a current positive price in Catalog before Heureka feed inclusion.',
  },
  missing_image: {
    code: 'missing_image',
    severity: 'blocker',
    ownerService: 'catalog-media-service',
    publicReason: 'Catalog product quality policy blocks products without an image.',
    remediationHint: 'Attach an approved non-placeholder image in Catalog media.',
  },
  placeholder_image_only: {
    code: 'placeholder_image_only',
    severity: 'blocker',
    ownerService: 'catalog-media-service',
    publicReason: 'Catalog product quality policy blocks products that only have placeholder image evidence.',
    remediationHint: 'Replace placeholder media with an approved real product image.',
  },
  archived_product: {
    code: 'archived_product',
    severity: 'blocker',
    ownerService: 'catalog-service',
    publicReason: 'Catalog product quality policy blocks archived products.',
    remediationHint: 'Keep archived products excluded from Heureka or restore them through Catalog approval.',
  },
  invalid_lifecycle_for_quality: {
    code: 'invalid_lifecycle_for_quality',
    severity: 'blocker',
    ownerService: 'catalog-service',
    publicReason: 'Catalog product lifecycle does not satisfy product quality activation policy.',
    remediationHint: 'Resolve Catalog quality blockers before activating or including this product.',
  },
  catalog_quality_unavailable: {
    code: 'catalog_quality_unavailable',
    severity: 'blocker',
    ownerService: 'catalog-service',
    publicReason: 'Catalog product quality review contract could not be read.',
    remediationHint: 'Restore Catalog product quality review access before Heureka feed inclusion.',
  },
});

export function evaluateCatalogFeedReadiness(snapshot: CatalogFeedReadinessSnapshot): CatalogFeedReadinessItem {
  const blockers: CatalogFeedReadinessBlocker[] = [];

  if (!snapshot.productFound) {
    blockers.push(BLOCKERS.PRODUCT_NOT_FOUND);
    return buildItem(snapshot, blockers, 'unknown');
  }

  blockers.push(...catalogProductQualityBlockers(snapshot.catalogQuality));
  if (snapshot.productActive === false) blockers.push(BLOCKERS.PRODUCT_INACTIVE);
  if (!hasText(snapshot.name)) blockers.push(BLOCKERS.MISSING_PRODUCT_NAME);
  if (!hasText(snapshot.description)) blockers.push(BLOCKERS.MISSING_DESCRIPTION);
  if (!hasText(snapshot.category)) blockers.push(BLOCKERS.MISSING_CATEGORY);
  if (!hasText(snapshot.primaryImageUrl)) blockers.push(BLOCKERS.MISSING_PRIMARY_IMAGE);
  if (hasText(snapshot.primaryImageUrl) && !isPublicHttpsUrl(String(snapshot.primaryImageUrl))) blockers.push(BLOCKERS.INVALID_IMAGE_URL);
  if (snapshot.priceVat === undefined || snapshot.priceVat === null || snapshot.priceVat === '') blockers.push(BLOCKERS.PRICE_MISSING);
  if (snapshot.priceVat !== undefined && snapshot.priceVat !== null && snapshot.priceVat !== '' && Number(snapshot.priceVat) <= 0) blockers.push(BLOCKERS.PRICE_NOT_POSITIVE);
  if (snapshot.availableStock === undefined || snapshot.availableStock === null || !Number.isFinite(Number(snapshot.availableStock))) blockers.push(BLOCKERS.STOCK_UNKNOWN);
  if (Number.isFinite(Number(snapshot.availableStock)) && Number(snapshot.availableStock) <= 0) blockers.push(BLOCKERS.ZERO_STOCK);
  if (snapshot.settingsActive === false) blockers.push(BLOCKERS.SETTINGS_INACTIVE);
  if (snapshot.renderableXml === false) blockers.push(BLOCKERS.XML_RENDER_INVALID);
  if ((snapshot.candidateFeedFields || []).some((field) => SENSITIVE_FIELD_PATTERN.test(field))) blockers.push(BLOCKERS.SENSITIVE_FIELD_EXPOSURE);
  if (Number(snapshot.generationEstimateMs || 0) > GENERATION_SLA_WARNING_MS) blockers.push(BLOCKERS.GENERATION_SLA_RISK);

  return buildItem(snapshot, blockers);
}

export function buildCatalogFeedReadinessResponse(feedType: string, snapshots: CatalogFeedReadinessSnapshot[], generatedAt: Date = new Date()): CatalogFeedReadinessResponse {
  if (snapshots.length > MAX_READINESS_BATCH_SIZE) {
    throw new Error(`Catalog feed readiness supports at most ${MAX_READINESS_BATCH_SIZE} products per request.`);
  }

  const items = snapshots.map(evaluateCatalogFeedReadiness);
  const summary = items.reduce((acc, item) => {
    acc[item.readiness] += 1;
    acc.total += 1;
    return acc;
  }, { total: 0, ready: 0, blocked: 0, warning: 0, unknown: 0 });

  return {
    contractVersion: CATALOG_FEED_READINESS_CONTRACT_VERSION,
    feedType,
    snapshotHash: buildReadinessHash(feedType, snapshots, items),
    generatedAt: generatedAt.toISOString(),
    summary,
    items,
  };
}

function buildItem(snapshot: CatalogFeedReadinessSnapshot, blockers: CatalogFeedReadinessBlocker[], forcedState?: CatalogFeedReadinessState): CatalogFeedReadinessItem {
  const hasBlockingIssue = blockers.some((blocker) => blocker.severity === 'blocker');
  const hasWarning = blockers.some((blocker) => blocker.severity === 'warning');
  const readiness = forcedState || (hasBlockingIssue ? 'blocked' : hasWarning ? 'warning' : 'ready');
  return {
    productId: snapshot.productId,
    readiness,
    availableStock: snapshot.availableStock === undefined ? null : snapshot.availableStock,
    settingsActive: snapshot.settingsActive,
    blockers,
    catalogQuality: publicCatalogQuality(snapshot.catalogQuality),
    feedEligibility: {
      includedInDryRun: readiness === 'ready' || readiness === 'warning',
      willMutateCatalog: false,
      willPublishFeed: false,
    },
  };
}

function catalogProductQualityBlockers(quality: CatalogProductQualitySnapshot | null | undefined): CatalogFeedReadinessBlocker[] {
  if (!quality || quality.unavailable) {
    return [BLOCKERS.catalog_quality_unavailable];
  }

  return normalizeCatalogQualityIssues(quality.blockingIssues || []).map((issue) => {
    const code = issue.code || 'catalog_quality_unavailable';
    const known = (BLOCKERS as Record<string, CatalogFeedReadinessBlocker>)[code];
    if (known) {
      return {
        ...known,
        publicReason: issue.message || known.publicReason,
      };
    }
    return {
      code: code as CatalogFeedReadinessBlockerCode,
      severity: 'blocker',
      ownerService: ownerServiceForCatalogQualityIssue(issue),
      publicReason: issue.message || `Catalog product quality policy blocks this product: ${code}.`,
      remediationHint: quality.nextAction || 'Resolve the Catalog product quality blocker before Heureka feed inclusion.',
    };
  });
}

function publicCatalogQuality(quality: CatalogProductQualitySnapshot | null | undefined): CatalogFeedReadinessItem['catalogQuality'] {
  if (!quality) {
    return {
      policyId: CATALOG_PRODUCT_QUALITY_POLICY_ID,
      unavailable: true,
      canActivate: null,
      blockingIssues: [],
      blockingMissingFields: [],
      nextAction: null,
      missing: ['[MISSING: Catalog product quality review item]'],
    };
  }
  return {
    policyId: quality.policyId || CATALOG_PRODUCT_QUALITY_POLICY_ID,
    unavailable: Boolean(quality.unavailable),
    canActivate: typeof quality.canActivate === 'boolean' ? quality.canActivate : null,
    blockingIssues: normalizeCatalogQualityIssues(quality.blockingIssues || []),
    blockingMissingFields: Array.isArray(quality.blockingMissingFields) ? quality.blockingMissingFields.map((item) => String(item || '').trim()).filter(Boolean) : [],
    nextAction: hasText(quality.nextAction) ? String(quality.nextAction) : null,
    missing: Array.isArray(quality.missing) ? quality.missing.map((item) => String(item || '').trim()).filter(Boolean) : [],
  };
}

function normalizeCatalogQualityIssues(issues: Array<CatalogProductQualityIssueSnapshot | string>): CatalogProductQualityIssueSnapshot[] {
  return (Array.isArray(issues) ? issues : []).map((issue) => {
    if (typeof issue === 'string') return { code: issue };
    return {
      code: hasText(issue?.code) ? String(issue.code) : undefined,
      message: hasText(issue?.message) ? String(issue.message) : undefined,
      severity: hasText(issue?.severity) ? String(issue.severity) : undefined,
      field: hasText(issue?.field) ? String(issue.field) : undefined,
      source: hasText(issue?.source) ? String(issue.source) : undefined,
    };
  }).filter((issue) => hasText(issue.code));
}

function ownerServiceForCatalogQualityIssue(issue: CatalogProductQualityIssueSnapshot): CatalogFeedReadinessOwnerService {
  const code = String(issue.code || '').toLowerCase();
  const field = String(issue.field || '').toLowerCase();
  if (code.includes('price') || field === 'price') return 'catalog-pricing-service';
  if (code.includes('image') || field === 'image') return 'catalog-media-service';
  return 'catalog-service';
}

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function isPublicHttpsUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

function buildReadinessHash(feedType: string, snapshots: CatalogFeedReadinessSnapshot[], items: CatalogFeedReadinessItem[]): string {
  const stablePayload = JSON.stringify({
    feedType,
    snapshots: snapshots.map((snapshot) => ({
      productId: snapshot.productId,
      productFound: snapshot.productFound,
      productActive: snapshot.productActive,
      name: snapshot.name || '',
      description: snapshot.description || '',
      category: snapshot.category || '',
      primaryImageUrl: snapshot.primaryImageUrl || '',
      priceVat: snapshot.priceVat === undefined || snapshot.priceVat === null ? '' : String(snapshot.priceVat),
      availableStock: snapshot.availableStock === undefined || snapshot.availableStock === null ? null : Number(snapshot.availableStock),
      settingsActive: snapshot.settingsActive,
      renderableXml: snapshot.renderableXml,
      candidateFeedFields: [...(snapshot.candidateFeedFields || [])].sort(),
      generationEstimateMs: snapshot.generationEstimateMs || 0,
    })),
    results: items.map((item) => ({ productId: item.productId, readiness: item.readiness, blockerCodes: item.blockers.map((blocker) => blocker.code) })),
  });
  return `fnv1a:${fnv1a(stablePayload)}`;
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
