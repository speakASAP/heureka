const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const controller = fs.readFileSync(path.join(root, 'services/heureka-service/src/heureka/orders/orders.controller.ts'), 'utf8');
const service = fs.readFileSync(path.join(root, 'services/heureka-service/src/heureka/orders/orders.service.ts'), 'utf8');
const client = fs.readFileSync(path.join(root, 'shared/clients/order-client.service.ts'), 'utf8');
const contract = fs.readFileSync(path.join(root, 'docs/23_documentation_contracts/HEUREKA_ORDER_INGESTION_CONTRACT.md'), 'utf8');

assert.match(controller, /@Post\('ingest'\)/);
assert.match(controller, /@UseGuards\(HeurekaOrderIngestionGuard\)/);
assert.match(service, /channel: CHANNEL/);
assert.match(service, /\[MISSING: catalogProductId\]/);
assert.match(service, /\[MISSING: warehouseId\]/);
assert.match(service, /catalogClient\.getProductById/);
assert.match(service, /heurekaOffer\.findUnique/);
assert.match(service, /warehouseClient\.getStockByProduct/);
assert.match(service, /reservableRoutes\.length === 1/);
assert.match(service, /multiple Warehouse routes/);
assert.match(client, /contractVersion: CREATE_ORDER_CONTRACT_VERSION/);
assert.match(client, /warehouseId\?: string/);
assert.match(client, /x-internal-service-token/);
assert.match(client, /x-service-name/);
assert.match(client, /heureka-service/);

for (const required of [
  'Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation',
  'POST /heureka/orders/ingest',
  'channel=heureka',
  'canonical Catalog product UUID',
  'canonical Warehouse route',
  'stable `externalOrderId`',
  'stable `channelAccountId`',
  '`items[].warehouseId`',
  '[MISSING: catalogProductId]',
  '[MISSING: warehouseId]',
  'Heureka does not own order lifecycle',
  'Warehouse remains the stock and reservation authority',
]) {
  assert.ok(contract.includes(required), `Missing contract text: ${required}`);
}

console.log('heureka order ingestion contract verification ok');
