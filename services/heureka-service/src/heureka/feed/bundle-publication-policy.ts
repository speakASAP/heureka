export const HEUREKA_BUNDLE_PUBLICATION_POLICY_VERSION = 'heureka.bundle.publication.policy.v1';
export const CATALOG_BUNDLE_CONTRACT_VERSION = 'catalog.bundle.v1';

export type HeurekaBundlePublicationStatus = 'blocked';
export type HeurekaBundlePublicationDecision = 'block_bundle_publication';
export type HeurekaBundlePublicationBlockerCode =
  | 'BUNDLE_PUBLICATION_UNSUPPORTED'
  | 'BUNDLE_CONTRACT_VERSION_UNSUPPORTED'
  | 'BUNDLE_NOT_SELLABLE_PRODUCT'
  | 'BUNDLE_COMPONENT_POLICY_REQUIRED';

export interface HeurekaBundlePublicationPolicyInput {
  contractVersion?: string | null;
  bundleId?: string | null;
  status?: string | null;
  componentProductIds?: string[];
  visibilityChannels?: string[];
}

export interface HeurekaBundlePublicationBlocker {
  code: HeurekaBundlePublicationBlockerCode;
  ownerService: 'heureka-service' | 'catalog-service' | 'catalog-commerce-integration-owner';
  publicReason: string;
  remediationHint: string;
}

export interface HeurekaBundlePublicationPolicyResult {
  policyVersion: typeof HEUREKA_BUNDLE_PUBLICATION_POLICY_VERSION;
  contractVersion: string | null;
  bundleId: string | null;
  status: HeurekaBundlePublicationStatus;
  decision: HeurekaBundlePublicationDecision;
  canPublishAsFeedItem: false;
  canPublishComponentsIndividually: true;
  willMutateCatalog: false;
  willPublishFeed: false;
  willMutateExternalMarketplace: false;
  blockers: HeurekaBundlePublicationBlocker[];
  allowedAlternatives: string[];
}

const BASE_BLOCKERS: readonly HeurekaBundlePublicationBlocker[] = Object.freeze([
  {
    code: 'BUNDLE_PUBLICATION_UNSUPPORTED',
    ownerService: 'heureka-service',
    publicReason: 'Heureka feed publication is product-item based; Heureka has no approved catalog.bundle.v1 mapping that can serialize one Catalog bundle aggregate as one SHOPITEM.',
    remediationHint: 'Keep the bundle aggregate out of Heureka XML output until a Heureka-specific bundle-as-offer policy is approved and validated.',
  },
  {
    code: 'BUNDLE_NOT_SELLABLE_PRODUCT',
    ownerService: 'catalog-service',
    publicReason: 'catalog.bundle.v1 is not a Catalog product row, SKU, stock item, price record, or marketplace offer identity in v1.',
    remediationHint: 'Publish only component Catalog products that pass the existing Heureka product readiness policy.',
  },
  {
    code: 'BUNDLE_COMPONENT_POLICY_REQUIRED',
    ownerService: 'catalog-commerce-integration-owner',
    publicReason: 'Heureka needs a channel-specific policy for component selection, price copy, delivery/free-shipping claims, stock evidence, category, and external import behavior before any bundle feed publication.',
    remediationHint: 'Define and validate a new Heureka bundle publication contract before enabling bundle feed items or external marketplace publication.',
  },
]);

export function evaluateHeurekaBundlePublicationPolicy(input: HeurekaBundlePublicationPolicyInput = {}): HeurekaBundlePublicationPolicyResult {
  const contractVersion = optionalString(input.contractVersion);
  const blockers = [...BASE_BLOCKERS];

  if (contractVersion && contractVersion !== CATALOG_BUNDLE_CONTRACT_VERSION) {
    blockers.unshift({
      code: 'BUNDLE_CONTRACT_VERSION_UNSUPPORTED',
      ownerService: 'catalog-service',
      publicReason: `Unsupported bundle contract version: ${contractVersion}.`,
      remediationHint: `Use ${CATALOG_BUNDLE_CONTRACT_VERSION} evidence before requesting a Heureka bundle policy review.`,
    });
  }

  return {
    policyVersion: HEUREKA_BUNDLE_PUBLICATION_POLICY_VERSION,
    contractVersion,
    bundleId: optionalString(input.bundleId),
    status: 'blocked',
    decision: 'block_bundle_publication',
    canPublishAsFeedItem: false,
    canPublishComponentsIndividually: true,
    willMutateCatalog: false,
    willPublishFeed: false,
    willMutateExternalMarketplace: false,
    blockers,
    allowedAlternatives: [
      'Publish each component Catalog product individually only after existing Heureka product readiness returns ready or warning.',
      'Use catalog.bundle.v1 for storefront/dashboard merchandising outside the Heureka XML feed until a Heureka bundle policy is approved.',
      'Keep external Heureka shop/import operations blocked for bundles unless owner supplies a channel policy and current external marketplace evidence.',
    ],
  };
}

function optionalString(value: unknown): string | null {
  const text = String(value || '').trim();
  return text || null;
}
