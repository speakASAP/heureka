const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const requiredFiles = [
  'services/heureka-service/src/business-health/business-health.controller.ts',
  'services/heureka-service/src/business-health/business-health.module.ts',
  'services/heureka-service/src/business-health/business-health.service.ts',
  'services/heureka-service/src/business-health/business-health.types.ts',
  'services/heureka-service/src/app.module.ts',
  'docs/orchestrator/2026-07-06-heureka-business-health-handoff.md',
];

const requiredSnippets = {
  'services/heureka-service/src/business-health/business-health.controller.ts': [
    "@Controller('business-health')",
    "@Get('channel-readback')",
    'getChannelReadback',
  ],
  'services/heureka-service/src/business-health/business-health.service.ts': [
    "const CONTRACT_ID = 'heureka.channel_readback_business_health.v1' as const;",
    "const BUSINESS_HEALTH_CONTRACT = 'stock-order-marketplace-business-health.v1' as const;",
    "const ENDPOINT = '/heureka/business-health/channel-readback' as const;",
    "status: 'warn'",
    "evidenceMode: 'source-only'",
    'feedAvailabilityMustConvergeToWarehouseAndCatalog: true',
    'sellableFeedQuantityMustNotExceedWarehouseAvailability: true',
    'feedMustNotExposeUnavailableCatalogProducts: true',
    'externalReadbackRequiredBeforeRuntimePass: true',
    'runtimeDataQueried: false',
    'productionDbQueried: false',
    'liveSyntheticMutationAuthorized: false',
    'externalMarketplaceReadQueried: false',
    'externalMarketplaceMutationAuthorized: false',
    'feedRegenerationAuthorized: false',
    'localFeedMutationAuthorized: false',
    'warehouseQueried: false',
    'catalogQueried: false',
    'ordersQueried: false',
    'mutatesHeureka: false',
    'mutatesExternalFeed: false',
    'mutatesLocalFeed: false',
    'mutatesMarketplaceListing: false',
    'mutatesWarehouse: false',
    'mutatesCatalog: false',
    'mutatesOrders: false',
    'mutatesPayments: false',
    'changesSecretsOrEnv: false',
    '[MISSING: approved live Heureka readback packet]',
    '[MISSING: target product/feed/account for Heureka channel readback proof]',
    '[MISSING: provider/feed/category policy for Heureka external import and availability convergence]',
    'services/heureka-service/src/heureka/feed/feed.controller.ts',
    'services/heureka-service/src/heureka/feed/feed.service.ts',
    'services/heureka-service/src/heureka/feed/feed-readiness.ts',
    'services/heureka-service/src/heureka/feed/feed-availability-reconciliation.service.ts',
    'scripts/verify_heureka_stock_readiness_live.js',
    'scripts/verify_heureka_external_readiness.js',
    'docs/orchestrator/2026-07-05-runtime-gate-packet-handoff.md',
    'docs/orchestrator/TASK-010-data-owner-handoff.md',
  ],
  'services/heureka-service/src/business-health/business-health.types.ts': [
    'HeurekaChannelReadbackBusinessHealthEnvelope',
    "contractId: 'heureka.channel_readback_business_health.v1'",
    "businessHealthContract: 'stock-order-marketplace-business-health.v1'",
    "endpoint: '/heureka/business-health/channel-readback'",
    'runtimeDataQueried: false',
    'productionDbQueried: false',
    'liveSyntheticMutationAuthorized: false',
    'feedRegenerationAuthorized: false',
  ],
  'services/heureka-service/src/app.module.ts': [
    "import { BusinessHealthModule } from './business-health/business-health.module';",
    'BusinessHealthModule',
  ],
  'docs/orchestrator/2026-07-06-heureka-business-health-handoff.md': [
    'Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation',
    'GET /heureka/business-health/channel-readback',
    'heureka.channel_readback_business_health.v1',
    '[MISSING: approved live Heureka readback packet]',
    'No live Heureka/provider calls',
  ],
};

const forbiddenSnippets = [
  'regenerateFeedWithLifecycle(',
  'includeProductInFeed(',
  'excludeProductFromFeed(',
  'generateFeedWithLifecycle(',
  'fetch(',
  'axios.',
  'prisma.',
  'warehouseClient.',
  'catalogClient.',
  'ordersClient.',
  'process.env.HEUREKA_API_KEY',
  'process.env.HEUREKA_MERCHANT_ID',
  'process.env.DATABASE_URL',
];

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

for (const file of requiredFiles) {
  read(file);
}

for (const [file, snippets] of Object.entries(requiredSnippets)) {
  const content = read(file);
  for (const snippet of snippets) {
    if (!content.includes(snippet)) {
      throw new Error(`Missing snippet in ${file}: ${snippet}`);
    }
  }
}

const serviceContent = read('services/heureka-service/src/business-health/business-health.service.ts');
for (const snippet of forbiddenSnippets) {
  if (serviceContent.includes(snippet)) {
    throw new Error(`Forbidden live/runtime pattern in business health service: ${snippet}`);
  }
}

console.log(JSON.stringify({
  status: 'pass',
  contractId: 'heureka.channel_readback_business_health.v1',
  endpoint: '/heureka/business-health/channel-readback',
  checkedFiles: requiredFiles.length,
  checkedSourceRefs: 8,
  forbiddenPatternsChecked: forbiddenSnippets.length,
}, null, 2));
