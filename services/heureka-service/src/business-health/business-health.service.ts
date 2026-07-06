import { Injectable } from '@nestjs/common';
import { HeurekaChannelReadbackBusinessHealthEnvelope } from './business-health.types';

const CONTRACT_ID = 'heureka.channel_readback_business_health.v1' as const;
const BUSINESS_HEALTH_CONTRACT = 'stock-order-marketplace-business-health.v1' as const;
const ENDPOINT = '/heureka/business-health/channel-readback' as const;

@Injectable()
export class BusinessHealthService {
  getChannelReadbackEnvelope(): HeurekaChannelReadbackBusinessHealthEnvelope {
    return {
      service: 'heureka',
      contractId: CONTRACT_ID,
      businessHealthContract: BUSINESS_HEALTH_CONTRACT,
      endpoint: ENDPOINT,
      status: 'warn',
      generatedAt: new Date().toISOString(),
      summary: 'Heureka source-owned channel readback and availability convergence contract exists; live feed/provider readback remains runtime-packet gated.',
      channel: 'heureka',
      evidenceMode: 'source-only',
      invariant: {
        feedAvailabilityMustConvergeToWarehouseAndCatalog: true,
        sellableFeedQuantityMustNotExceedWarehouseAvailability: true,
        feedMustNotExposeUnavailableCatalogProducts: true,
        externalReadbackRequiredBeforeRuntimePass: true,
        providerPolicyRequiredForExternalMutation: true,
      },
      runtimeBoundary: {
        runtimeDataQueried: false,
        productionDbQueried: false,
        liveSyntheticMutationAuthorized: false,
        externalMarketplaceReadQueried: false,
        externalMarketplaceMutationAuthorized: false,
        feedRegenerationAuthorized: false,
        localFeedMutationAuthorized: false,
        warehouseQueried: false,
        catalogQueried: false,
        ordersQueried: false,
      },
      mutationFlags: {
        mutatesHeureka: false,
        mutatesExternalFeed: false,
        mutatesLocalFeed: false,
        mutatesMarketplaceListing: false,
        mutatesWarehouse: false,
        mutatesCatalog: false,
        mutatesOrders: false,
        mutatesPayments: false,
        changesSecretsOrEnv: false,
      },
      sourceRefs: [
        {
          path: 'services/heureka-service/src/heureka/feed/feed.controller.ts',
          reason: 'Defines public feed, read-only preview, readiness, and guarded feed regeneration routes that shape Heureka channel readback boundaries.',
        },
        {
          path: 'services/heureka-service/src/heureka/feed/feed.service.ts',
          reason: 'Owns feed generation, preview, feed status, and product feed readiness behavior used by future runtime evidence.',
        },
        {
          path: 'services/heureka-service/src/heureka/feed/feed-readiness.ts',
          reason: 'Defines Catalog/Warehouse-backed product readiness, blockers, read-only eligibility, and XML render safety policy.',
        },
        {
          path: 'services/heureka-service/src/heureka/feed/feed-availability-reconciliation.service.ts',
          reason: 'Documents availability convergence from Catalog and Warehouse into local Heureka feed inclusion while keeping safe refresh policy blocked unless approved.',
        },
        {
          path: 'scripts/verify_heureka_stock_readiness_live.js',
          reason: 'Existing live stock-readiness verifier compares Heureka readiness with Warehouse totals and must remain gated for approved runtime packets only.',
        },
        {
          path: 'scripts/verify_heureka_external_readiness.js',
          reason: 'Existing external-readiness verifier checks public XML feed and optional protected readiness lanes without mutating external Heureka.',
        },
        {
          path: 'docs/orchestrator/2026-07-05-runtime-gate-packet-handoff.md',
          reason: 'Runtime gate handoff preserves the owner-approved packet boundary for live Heureka readback, feed, and account proof.',
        },
        {
          path: 'docs/orchestrator/TASK-010-data-owner-handoff.md',
          reason: 'Owner/data handoff records Heureka feed readiness, external evidence requirements, and owner-only onboarding blockers.',
        },
      ],
      checkedSourceContracts: [
        'catalog-feed-readiness.v1',
        'heureka-stock-readiness-live.v1',
        'heureka-external-readiness.v1',
        'heureka.availability_reconciliation.source.v1',
        'stock-order-marketplace-business-health.v1',
      ],
      blockers: [
        '[MISSING: approved live Heureka readback packet]',
        '[MISSING: target product/feed/account for Heureka channel readback proof]',
        '[MISSING: provider/feed/category policy for Heureka external import and availability convergence]',
        '[MISSING: approved reconciliation rule that maps Warehouse/Catalog availability to Heureka feed sellable quantity without feed regeneration or external mutation side effects]',
      ],
      intentChain: {
        vision: '01_vision/[MISSING: Heureka business health vision artifact]',
        goalImpact: '22_goal_impact/[MISSING: business-health Heureka channel readback goal impact]',
        system: '04_systems/[MISSING: Heureka service system artifact]',
        feature: '10_features/[MISSING: Heureka business-health channel readback feature artifact]',
        task: '11_tasks/[MISSING: Heureka business-health channel readback task]',
        executionPlan: 'docs/orchestrator/2026-07-06-heureka-business-health-handoff.md',
        codingPrompt: 'Codex prompt 2026-07-06 Heureka service-owned business-health evidence envelope',
        code: [
          'services/heureka-service/src/business-health/business-health.controller.ts',
          'services/heureka-service/src/business-health/business-health.service.ts',
          'services/heureka-service/src/business-health/business-health.types.ts',
        ],
        validation: [
          'scripts/verify-business-health-heureka-channel-contract.js',
          'npm --prefix services/heureka-service run build',
          'git diff --check',
        ],
      },
    };
  }
}
