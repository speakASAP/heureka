export type HeurekaBusinessHealthStatus = 'pass' | 'warn' | 'blocked';

export interface HeurekaBusinessHealthSourceRef {
  path: string;
  reason: string;
}

export interface HeurekaBusinessHealthRuntimeBoundary {
  runtimeDataQueried: false;
  productionDbQueried: false;
  liveSyntheticMutationAuthorized: false;
  externalMarketplaceReadQueried: false;
  externalMarketplaceMutationAuthorized: false;
  feedRegenerationAuthorized: false;
  localFeedMutationAuthorized: false;
  warehouseQueried: false;
  catalogQueried: false;
  ordersQueried: false;
}

export interface HeurekaChannelReadbackBusinessHealthEnvelope {
  service: 'heureka';
  contractId: 'heureka.channel_readback_business_health.v1';
  businessHealthContract: 'stock-order-marketplace-business-health.v1';
  endpoint: '/heureka/business-health/channel-readback';
  status: HeurekaBusinessHealthStatus;
  generatedAt: string;
  summary: string;
  channel: 'heureka';
  evidenceMode: 'source-only';
  invariant: {
    feedAvailabilityMustConvergeToWarehouseAndCatalog: true;
    sellableFeedQuantityMustNotExceedWarehouseAvailability: true;
    feedMustNotExposeUnavailableCatalogProducts: true;
    externalReadbackRequiredBeforeRuntimePass: true;
    providerPolicyRequiredForExternalMutation: true;
  };
  runtimeBoundary: HeurekaBusinessHealthRuntimeBoundary;
  mutationFlags: {
    mutatesHeureka: false;
    mutatesExternalFeed: false;
    mutatesLocalFeed: false;
    mutatesMarketplaceListing: false;
    mutatesWarehouse: false;
    mutatesCatalog: false;
    mutatesOrders: false;
    mutatesPayments: false;
    changesSecretsOrEnv: false;
  };
  sourceRefs: HeurekaBusinessHealthSourceRef[];
  checkedSourceContracts: string[];
  blockers: string[];
  intentChain: {
    vision: string;
    goalImpact: string;
    system: string;
    feature: string;
    task: string;
    executionPlan: string;
    codingPrompt: string;
    code: string[];
    validation: string[];
  };
}
