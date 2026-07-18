# Heureka Order Ingestion Contract

```yaml
id: HEUREKA-ORDER-INGESTION-CONTRACT
status: implemented
owner: heureka-service
created: 2026-06-27
intent_chain: Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation
upstream:
  - ../01_vision/VISION.md
  - ../16_operations/INTEGRATIONS.md
  - ../21_execution_plans/EP-TASK-006-plan-stock-order-profit-feedback-loop.md
  - orders-microservice/docs/orchestrator/CHANNEL_ORDER_CREATE_CONTRACT.md
downstream:
  - ../services/heureka-service/src/heureka/orders/orders.controller.ts
  - ../services/heureka-service/src/heureka/orders/orders.service.ts
  - ../shared/clients/order-client.service.ts
```

## Intent

Heureka may receive or replay Heureka-channel order facts, but Orders remains the canonical order lifecycle owner and Catalog remains product truth. Heureka stores only channel-local forwarding evidence in `heureka_orders` and forwards accepted orders to `orders-microservice` with `channel=heureka`.

## Endpoint

```http
POST /heureka/orders/ingest
x-internal-service-token: <runtime-only Heureka internal token>
x-service-name: heureka-service
Content-Type: application/json
```

The endpoint is internal only. Public Heureka XML feed endpoints remain read-only and do not expose order data.

## Request

```json
{
  "externalOrderId": "heureka-order-1001",
  "accountId": "11111111-1111-4111-8111-111111111111",
  "channelAccountId": "heureka-cz",
  "orderedAt": "2026-06-27T08:00:00.000Z",
  "customer": { "email": "customer@example.invalid", "phone": "+420000000000" },
  "items": [
    {
      "catalogProductId": "22222222-2222-4222-8222-222222222222",
      "warehouseId": "44444444-4444-4444-8444-444444444444",
      "sku": "SKU-H",
      "title": "Catalog product",
      "quantity": 2,
      "unitPrice": 100,
      "totalPrice": 200
    }
  ],
  "totals": { "subtotal": 200, "shippingCost": 0, "taxAmount": 0, "total": 200, "currency": "CZK" }
}
```

Each line must resolve to a canonical Catalog product UUID and a canonical Warehouse route before forwarding. The endpoint accepts `catalogProductId`/`productId` only when it is a Catalog UUID, or a local Heureka `offerId` that maps to `heureka_offers.productId`. Channel-local row IDs must fail closed with `[MISSING: catalogProductId]`.

For Warehouse route evidence, Heureka calls Warehouse availability for the canonical product and forwards `items[].warehouseId` only when Warehouse reports a route with enough available stock for the requested quantity. If exactly one Warehouse route is reservable, Heureka derives that `warehouseId`. If no route is reservable, a supplied route is not reservable, or more than one route is reservable and the request does not identify the intended route, ingestion fails closed with `[MISSING: warehouseId]` before calling Orders. Warehouse remains the stock and reservation authority; Heureka does not reserve or decrement stock locally.

## Forwarding

Heureka forwards to Orders using the canonical create-order contract:

- `contractVersion=orders.create.v1`
- `channel=heureka`
- stable `externalOrderId`
- stable `channelAccountId`
- `items[].productId` as canonical Catalog product ID
- `items[].warehouseId` as Warehouse-owned reservation route evidence
- positive `quantity`
- `totals.currency` and gross item totals

## Boundaries

- Heureka does not own order lifecycle, payment state, warehouse stock truth, reservation truth, or Catalog product truth.
- No public XML feed includes raw orders, customer identifiers, payment details, secrets, or internal supplier/commercial values.
- Runtime smoke must use synthetic/replay-safe input only; production order creation is a mutation and needs explicit smoke scope.

## Validation

- `npx ts-node --skip-ignore --compiler-options '{"types":["node"]}' services/heureka-service/src/heureka/orders/orders.service.spec.ts`
- `npm --prefix shared run build`
- `npm --prefix services/heureka-service run build`
- `node scripts/verify_heureka_order_ingestion_contract.js`

## 2026-06-29 Reservation Gate Alignment

Orders now rejects sellable-channel creates unless Warehouse reservation handoff returns `reserved`. Heureka order ingestion therefore forwards Orders-ready route evidence instead of optional local hints: every forwarded item includes `warehouseId` derived from Warehouse stock rows or validated against them. Missing, insufficient, or ambiguous Warehouse route evidence fails closed before `orderClient.createOrder`, preserving Warehouse as stock and reservation authority.
