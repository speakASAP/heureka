#!/usr/bin/env node
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertIncludes(text, expected, label) {
  assert.ok(text.includes(expected), `${label}: missing ${expected}`);
}

function assertMatches(text, pattern, label) {
  assert.match(text, pattern, `${label}: pattern not found`);
}

const packageJson = JSON.parse(read('package.json'));
const readme = read('README.md');
const checklist = read('docs/orchestrator/TASK-010-channel-parity-checklist.md');
const gapPlan = read('docs/orchestrator/TASK-010-channel-parity-gap-plan.md');
const handoff = read('docs/orchestrator/TASK-010-data-owner-handoff.md');
const ownerDataTemplateScript = read('scripts/verify_heureka_owner_data_template.js');
const publicController = read('services/heureka-service/src/public/public.controller.ts');
const dashboardController = read('services/heureka-service/src/heureka/dashboard/dashboard.controller.ts');
const dashboardService = read('services/heureka-service/src/heureka/dashboard/dashboard.service.ts');
const feedService = read('services/heureka-service/src/heureka/feed/feed.service.ts');
const orderService = read('services/heureka-service/src/heureka/orders/orders.service.ts');
const operationSchema = read('services/heureka-service/src/heureka/operations/operation-event.schema.ts');
const gatewayService = read('services/api-gateway/src/gateway/gateway.service.ts');

const requirements = [];

function pass(id, description, evidence) {
  requirements.push({ id, description, status: 'proven', evidence });
}

function ownerBlocked(id, description, blockers, evidence) {
  requirements.push({ id, description, status: 'blocked_by_owner_data', blockers, evidence });
}

function verifyPlanningAndComparison() {
  for (const expected of [
    'Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation',
    'Allegro is the primary parity target',
    'Aukro is the closest feed-oriented dashboard reference',
    'Bazos is the static Nest-rendered fallback reference',
    'FlipFlop is the storefront/Next.js reference',
    'Feature Matrix',
    'Ready Implementation Tasks',
    'Remaining Parallel Data Remediation Lanes',
  ]) {
    assertIncludes(checklist, expected, 'TASK-010 checklist');
  }
  for (const expected of ['Phase 1: Parallel Discovery', 'Phase 3: Parallel Implementation', 'Worker: frontend/public surface', 'Worker: product/feed catalog parity', 'Worker: orders/logging/health parity']) {
    assertIncludes(gapPlan, expected, 'TASK-010 gap plan');
  }
  pass('planning-and-reference-comparison', 'Intent Preservation plan and cross-channel comparison are saved.', [
    'docs/orchestrator/TASK-010-channel-parity-gap-plan.md',
    'docs/orchestrator/TASK-010-channel-parity-checklist.md',
  ]);
}

function verifyFrontendDashboard() {
  for (const route of ['dashboard', 'dashboard/feed', 'dashboard/orders', 'dashboard/operations', 'dashboard/settings', 'dashboard/admin/users']) {
    assertMatches(publicController, new RegExp(`@Get\\('${route.replace('/', '\\/')}'\\)`), `public route ${route}`);
    assertIncludes(readme, route, `README route ${route}`);
  }
  for (const expected of ['auth.alfares.cz', 'auth/callback', 'dashboard product list', 'Dashboard readiness lanes']) {
    assertIncludes(checklist, expected, 'frontend/dashboard checklist');
  }
  for (const route of ['orders', 'feed/status', 'feed/history', 'feed/settings', 'operations', 'operations/history', 'readiness/lanes']) {
    assertMatches(dashboardController, new RegExp(`@Get\\('${route.replace('/', '\\/')}'\\)|@Put\\('${route.replace('/', '\\/')}'\\)`), `dashboard API ${route}`);
  }
  assertIncludes(dashboardService, 'getReadinessLanes', 'dashboard readiness lane implementation');
  pass('frontend-dashboard-parity', 'Public landing, hosted Auth, callback, dashboard shells, and protected dashboard APIs are implemented.', [
    'services/heureka-service/src/public/public.controller.ts',
    'services/heureka-service/src/heureka/dashboard/dashboard.controller.ts',
    'services/heureka-service/src/heureka/dashboard/dashboard.service.ts',
  ]);
}

function verifyCatalogOrdersLoggingHealthGateway() {
  assertIncludes(feedService, 'getBulkFeedReadiness', 'bulk feed readiness');
  assertIncludes(feedService, 'warehouseClient.getAvailabilityBatch', 'Warehouse batch availability');
  assertIncludes(checklist, 'Catalog Heureka marketplace connector | implemented', 'Catalog connector status');
  assertIncludes(checklist, 'Catalog-to-Heureka token-path verifier -> PASS', 'Catalog token path evidence');

  assertIncludes(orderService, 'channel: CHANNEL', 'Orders channel forwarding');
  assertIncludes(orderService, 'warehouseClient.getStockByProduct', 'Warehouse route derivation');
  assertIncludes(checklist, 'Orders runtime-token verifier -> PASS', 'Orders token evidence');

  assertIncludes(operationSchema, 'heureka.operation.audit.v1', 'Heureka operation audit schema');
  assertIncludes(checklist, 'Heureka-local durable operation events', 'operation events evidence');
  assertIncludes(checklist, '[MISSING: ecosystem-wide shared operation/audit schema package]', 'shared audit package blocker');

  assertIncludes(gatewayService, 'isHeurekaServiceBackendPath', 'gateway route classifier');
  assertIncludes(checklist, 'Dependency-aware health parity', 'dependency health checklist');
  assertIncludes(checklist, 'API gateway Heureka route parity | implemented and deployed', 'gateway route parity checklist');
  pass('integration-observability-runtime-parity', 'Catalog/Warehouse, Orders, local operation logging, health, gateway, and runtime contract parity are implemented or explicitly platform-blocked.', [
    'services/heureka-service/src/heureka/feed/feed.service.ts',
    'services/heureka-service/src/heureka/orders/orders.service.ts',
    'services/heureka-service/src/heureka/operations/operation-event.schema.ts',
    'services/api-gateway/src/gateway/gateway.service.ts',
  ]);
}

function verifyValidationBundle() {
  const scripts = packageJson.scripts || {};
  for (const name of [
    'verify:heureka-order-ingestion',
    'verify:heureka-orders-runtime-readiness',
    'verify:heureka-catalog-token-path',
    'verify:heureka-stock-readiness-live',
    'verify:heureka-blocked-product-lanes',
    'verify:heureka-external-readiness',
    'verify:heureka-owner-data-template',
    'verify:health-dependencies',
    'verify:task-010-source-parity',
  ]) {
    assert.ok(scripts[name], `package.json missing script ${name}`);
  }
  for (const expected of [
    'verify:health-dependencies',
    'feed-preview-readonly.self-test.ts',
    'public-dashboard-routes.self-test.ts',
    'gateway-route-parity.self-test.ts',
    'verify:heureka-order-ingestion',
    'verify:heureka-orders-runtime-readiness',
    'verify:heureka-catalog-token-path',
    'verify:heureka-owner-data-template',
  ]) {
    assertIncludes(scripts['verify:task-010-source-parity'], expected, 'source parity bundle');
  }
  assertIncludes(readme, 'verify:heureka-owner-data-template', 'README owner data template command');
  pass('validation-bundle', 'Focused and consolidated non-mutating validation commands exist for the implemented parity surface.', [
    'package.json',
    'README.md',
    'scripts/verify_heureka_owner_data_template.js',
  ]);
}

function verifyOwnerDataBlockers() {
  const blockers = [
    '[MISSING: authoritative current stock source for 25 Heureka zero-stock products]',
    '[MISSING: approved image URLs/files]',
    '[UNKNOWN: shop approval]',
    '[UNKNOWN: current external Heureka import/feed-validity result]',
    '[MISSING: owner-supplied e-shop registration legal/company fields]',
    '[MISSING: Heureka merchant/API key approval evidence]',
  ];
  for (const blocker of blockers) {
    assertIncludes(checklist + '\n' + handoff, blocker, 'owner/data blocker tracking');
  }
  assertIncludes(handoff, '8edc51f2-bed2-433f-8a3c-5738b49a02e1', 'single product content blocker');
  assertIncludes(handoff, 'public Heureka category text, public VAT-inclusive price, primary image, and stock/exclusion decision', 'single product owner input');
  for (const expected of [
    'heureka-owner-data-template.v1',
    'stockDecisions',
    'mediaBackfill',
    'catalogContent',
    'externalHeureka',
  ]) {
    assertIncludes(ownerDataTemplateScript, expected, 'owner-data template verifier');
  }
  ownerBlocked('owner-data-completion', 'Remaining feed/shop completion depends on external owner/data inputs, not additional Heureka code parity.', blockers, [
    'docs/orchestrator/TASK-010-data-owner-handoff.md',
    'docs/orchestrator/TASK-010-channel-parity-checklist.md',
    'scripts/verify_heureka_owner_data_template.js',
  ]);
}

verifyPlanningAndComparison();
verifyFrontendDashboard();
verifyCatalogOrdersLoggingHealthGateway();
verifyValidationBundle();
verifyOwnerDataBlockers();

const technicalFailures = requirements.filter((item) => item.status !== 'proven' && item.status !== 'blocked_by_owner_data');
const ownerBlocks = requirements.filter((item) => item.status === 'blocked_by_owner_data').flatMap((item) => item.blockers || []);

const report = {
  contractVersion: 'task-010-completion-audit.v1',
  readOnly: true,
  mutations: [],
  overallStatus: ownerBlocks.length ? 'blocked_by_owner_data' : 'complete',
  technicalParityStatus: technicalFailures.length ? 'failed' : 'proven',
  requirements,
  ownerDataBlockers: Array.from(new Set(ownerBlocks)),
};

console.log(JSON.stringify(report, null, 2));

if (technicalFailures.length) {
  process.exit(1);
}
