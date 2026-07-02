# TASK-010 Data Owner Handoff

Date: 2026-07-01
Last updated: 2026-07-02
Repository: `/home/ssf/Documents/Github/heureka-service`
Status: active owner/data handoff for remaining Heureka feed blockers

## Intent Preservation Chain

Vision -> Goal Impact -> System -> Feature -> Task -> Execution Plan -> Coding Prompt -> Code -> Validation

- Vision: Heureka should reach the same operational parity as the other Alfares sales channels without inventing Heureka-only data paths.
- Goal Impact: make the remaining blockers executable by the correct owner while preserving shared Catalog, Warehouse, Orders, and dashboard contracts.
- System: `heureka-service`, Catalog, Warehouse, Allegro, FlipFlop storefront, and external Heureka onboarding.
- Feature: product readiness, feed inclusion, and external shop/import readiness.
- Task: resolve remaining `ZERO_STOCK`, `MISSING_PRIMARY_IMAGE`, and external onboarding blockers only from authoritative sources.
- Execution Plan: use protected dashboard readiness lanes and the read-only blocker verifier; mutate only after owner approval and required source evidence.
- Coding Prompt: do not infer product stock from order history, do not invent images, and do not bypass Catalog/Warehouse source ownership.
- Code: readiness lanes are implemented in `GET /heureka/dashboard/readiness/lanes`; repository verifier is `npm run verify:heureka-blocked-product-lanes`.
- Validation: rerun the verifier and protected dashboard lane smoke after every approved data change.

## Current Live Readiness

Latest validated live smoke on `task-010-route-cleanup-20260701`:

- Active Catalog products: `41`
- Ready for Heureka: `16`
- Blocked: `25`
- `ZERO_STOCK`: `25`
- `MISSING_PRIMARY_IMAGE`: `12`
- Catalog content lane: `blocked` for `1` product with missing public Heureka category text and public VAT-inclusive price.
- Read-only lane API: `GET /heureka/dashboard/readiness/lanes`

## Stock Authority Lane

Status: blocked by owner/data decision.

Read-only evidence:

- Heureka readiness uses Warehouse batch availability and maps `ZERO_STOCK` to `warehouse-service`.
- Warehouse availability evidence returned rows for all `41` active products; latest blocker lane reports `25` products with zero available stock and no missing Warehouse rows.
- Warehouse batch rows for the 25 zero-stock products are `25/25`, all `totalQuantity=0`, `totalReserved=0`, `totalAvailable=0`.
- Allegro local offers matched `23/25` products, but all matched rows are non-authoritative order-history data: `ORDER_HISTORY_ONLY`, `syncSource=ORDER_HISTORY`, `syncStatus=PARTIAL`, `stockQuantity=0`, `quantity=0`, `rawStockAvailable=null`.
- Allegro stock snapshot rows for these products/offers: `0`.
- Earlier Heureka-specific Allegro current-stock probing returned `0` current rows because configured OAuth tokens reported `expired_not_refreshed`; no token refresh was performed in that read-only pass.
- Superseding Allegro service evidence from the owner-approved 2026-06-29 complete physical stock recheck found only `9` unique current-stock-authoritative offers in the configured seller surface, with `496` total available units, and Warehouse already matched all `9`. That recheck found no hidden ~500-offer source and does not provide stock authority for the `25` Heureka zero-stock products.
- Order history is not current stock authority.
- Catalog marketplace profile reads for the original affected products returned no stock-like values.
- `PROD9998` / `a2e15cc0-1a94-4faf-a82f-64afea9e9817` has `[MISSING: Allegro offer id/source]`.
- `8edc51f2-bed2-433f-8a3c-5738b49a02e1` resolves in Catalog as SKU `EAN4893575894`, title `Cvetki gorshki`; its current Catalog pricing read returns `data=null`, media read returns `[]`, and Heureka feed snapshot has `CATEGORYTEXT=null`, `IMGURL=null`, and `PRICE_VAT=null`.

Allowed systems:

- Warehouse read reports.
- Allegro current-stock read APIs only when owner-approved and paired with seller identity/readback evidence; the latest approved Allegro recheck found no additional source for these Heureka blockers.
- Catalog marketplace profile reads.
- Owner-approved stock sheet/source.
- Post-approval Warehouse stock mutation only with product ID, warehouse ID, quantity, actor, reason code, and source reference.

Forbidden actions:

- Do not infer stock from Allegro order-history rows.
- Do not treat Allegro token refresh, by itself, as stock authority; seller identity and Warehouse/product readback must be proven before any data change.
- Do not write Warehouse without owner-approved quantities and source reference.
- Do not include zero-stock products in Heureka feed unless owner explicitly approves an exclusion/stock policy.

Affected product IDs:

| Product ID | SKU / source | Required owner decision |
| --- | --- | --- |
| `00a9cb02-57ba-4015-acda-b1f2b7b8a2d9` | `ALLEGRO-OFFER-17765840250` | stock quantity or exclude |
| `024c1a31-0153-4357-985e-584021d86b47` | `ALLEGRO-OFFER-17765849489` | stock quantity or exclude |
| `04df2735-f4a8-4278-8a5e-717c7068e516` | `ALLEGRO-OFFER-17708359010` | stock quantity or exclude |
| `2430757b-844f-4609-a3eb-7207efadec23` | `ALLEGRO-OFFER-18106124748` | stock quantity or exclude |
| `37d1c913-2614-44fa-930a-9f7c96df87d0` | `ALLEGRO-OFFER-17708174906` | stock quantity or exclude |
| `3b8bddfb-5cae-44f9-a3fb-e1d7655df868` | `ALLEGRO-OFFER-18235139875` | stock quantity or exclude |
| `5be4e2a2-30d7-45a4-b0b5-0cee96d95517` | `ALLEGRO-OFFER-18227418521` | stock quantity or exclude |
| `633610ea-7b2b-41e7-86c4-587cf6bb1ff6` | `ALLEGRO-OFFER-17771245555` | stock quantity or exclude |
| `781d9865-6e89-42ab-b297-0470157fbe66` | `ALLEGRO-OFFER-17719663545` | stock quantity or exclude |
| `7a13d03d-733d-4605-96ac-b0549ef10ebf` | `ALLEGRO-OFFER-17767445540` | stock quantity or exclude |
| `7b54c897-be5d-401d-9293-24d115841a0f` | `ALLEGRO-OFFER-18103248918` | stock quantity or exclude |
| `82baeaf6-5a33-4698-87b8-761d22207722` | `ALLEGRO-OFFER-17708129689` | stock quantity or exclude |
| `8a11b8da-9e56-4c33-99d9-78630ef083b0` | `ALLEGRO-OFFER-17774652537` | stock quantity or exclude |
| `8edc51f2-bed2-433f-8a3c-5738b49a02e1` | `EAN4893575894` / `Cvetki gorshki` | stock quantity or exclude; also repair Catalog category/price if sellable |
| `a25cd2d4-e061-4929-968b-44a1122ff7b9` | `ALLEGRO-OFFER-18106208015` | stock quantity or exclude |
| `a2e15cc0-1a94-4faf-a82f-64afea9e9817` | `PROD9998` | stock quantity or exclude; `[MISSING: Allegro offer id/source]` |
| `aa929535-0f44-43b1-bcb1-0944046ddc5e` | `ALLEGRO-OFFER-18106147579` | stock quantity or exclude |
| `adcaff03-ec55-477f-8b72-99db8b643d24` | `ALLEGRO-OFFER-17729680353` | stock quantity or exclude |
| `bd687424-5730-4cba-9f2b-d4775bf1e1db` | `ALLEGRO-OFFER-18146277402` | stock quantity or exclude |
| `caea1a86-19c7-49a4-805f-8ce7041341b2` | `ALLEGRO-OFFER-17729689494` | stock quantity or exclude |
| `d430aa28-d0e9-43ad-98c7-3f4d77e22d3d` | `ALLEGRO-OFFER-17716626156` | stock quantity or exclude |
| `de59bad3-1585-4574-acf2-78489367d418` | `ALLEGRO-OFFER-18103817492` | stock quantity or exclude |
| `dfd1001e-f2e3-4909-be87-6ae9546457dc` | `ALLEGRO-OFFER-18103829475` | stock quantity or exclude |
| `e0034f63-53be-4287-954e-5d519eb57a79` | `ALLEGRO-OFFER-17679136371` | stock quantity or exclude |
| `e85e2900-43f8-4709-b46c-7182de60df08` | `ALLEGRO-OFFER-17773437727` | stock quantity or exclude |

## Media Backfill Lane

Status: blocked by missing approved image assets.

Read-only evidence:

- Catalog product, media, Heureka feed snapshot, and Heureka/Allegro marketplace fields showed no approved primary image for the original affected products; latest blocker lane reports `12` missing primary images.
- Allegro rows for the original affected products are `ORDER_HISTORY` / `PARTIAL` / `ORDER_HISTORY_ONLY`, with `images=0`, `rawData.images=0`, and `rawData.photos=0`.
- Heureka public feed excludes the affected blocked products.
- FlipFlop public API returned `403`; earlier in-cluster product API returned the original affected products with `mainImageUrl=null`, `imageUrls=[]`, and `images=[]`.
- Docs/assets search found no matching approved product assets.

Allowed systems:

- Catalog media reads.
- Catalog guarded media upload/create only after approved public HTTPS image URLs/files are supplied.
- Catalog Heureka snapshot readback.
- Heureka readiness verifier.

Forbidden actions:

- Do not invent product images.
- Do not use unrelated screenshots, conversion UI assets, or private/non-public image URLs.
- Do not backfill images for products that owner decides should remain excluded.

Affected product IDs:

| Product ID | SKU / source | Name | Required owner input |
| --- | --- | --- | --- |
| `04df2735-f4a8-4278-8a5e-717c7068e516` | `ALLEGRO-OFFER-17708359010` | `Xiaomi Flash USB Drive 3.0 2 TB stříbrný` | approved public image URL/file |
| `2430757b-844f-4609-a3eb-7207efadec23` | `ALLEGRO-OFFER-18106124748` | `Nafukovací kluzák 93 cm New Year` | approved public image URL/file |
| `5be4e2a2-30d7-45a4-b0b5-0cee96d95517` | `ALLEGRO-OFFER-18227418521` | `Lenovo Flash drive 2TB` | approved public image URL/file |
| `633610ea-7b2b-41e7-86c4-587cf6bb1ff6` | `ALLEGRO-OFFER-17771245555` | `Xiaomi Original Flash drive 2TB` | approved public image URL/file |
| `7b54c897-be5d-401d-9293-24d115841a0f` | `ALLEGRO-OFFER-18103248918` | `Nafukovací kluzák 107 cm Extreme` | approved public image URL/file |
| `8edc51f2-bed2-433f-8a3c-5738b49a02e1` | `EAN4893575894` | `Cvetki gorshki` | approved public image URL/file; also repair Catalog category/price if sellable |
| `adcaff03-ec55-477f-8b72-99db8b643d24` | `ALLEGRO-OFFER-17729680353` | `Lenovo microSD karta 1TB` | approved public image URL/file |
| `caea1a86-19c7-49a4-805f-8ce7041341b2` | `ALLEGRO-OFFER-17729689494` | `Lenovo microSD karta 1TB` | approved public image URL/file |
| `d430aa28-d0e9-43ad-98c7-3f4d77e22d3d` | `ALLEGRO-OFFER-17716626156` | `Lenovo Micro SD karta 1TB` | approved public image URL/file |
| `de59bad3-1585-4574-acf2-78489367d418` | `ALLEGRO-OFFER-18103817492` | `Nafukovací kluzák 107 cm Bear` | approved public image URL/file |
| `dfd1001e-f2e3-4909-be87-6ae9546457dc` | `ALLEGRO-OFFER-18103829475` | `Nafukovací kluzák 107 cm Snow Machine` | approved public image URL/file |
| `e85e2900-43f8-4709-b46c-7182de60df08` | `ALLEGRO-OFFER-17773437727` | `Lenovo microSD karta 1TB` | approved public image URL/file |

## Catalog Content And Pricing Lane

Status: blocked by missing public category and price for one active product.

Read-only evidence:

- `GET /heureka/feed/readiness/products/8edc51f2-bed2-433f-8a3c-5738b49a02e1` returned blockers `MISSING_CATEGORY`, `PRICE_MISSING`, `MISSING_PRIMARY_IMAGE`, and `ZERO_STOCK`.
- Catalog product read returned SKU `EAN4893575894`, title `Cvetki gorshki`, description `Nejlepsi cvetok gorshok v chechii`, brand `ObozBrand`, manufacturer `Pocenice`, `categories=[]`, `media=[]`, and `pricing=[]`.
- Catalog pricing source `GET /api/pricing/product/8edc51f2-bed2-433f-8a3c-5738b49a02e1/current` returned `data=null`.
- Catalog Heureka feed snapshot has `ITEM_ID=EAN4893575894`, `PRODUCTNAME=Cvetki gorshki`, `DESCRIPTION=Nejlepsi cvetok gorshok v chechii`, `CATEGORYTEXT=null`, `IMGURL=null`, and `PRICE_VAT=null`.

Allowed systems:

- Catalog marketplace profile/category editors.
- Catalog pricing source of truth.
- Heureka readiness verifier.

Forbidden actions:

- Do not patch generated feed XML directly.
- Do not invent category, price, SKU, or stock values.

Affected product IDs:

| Product ID | SKU / source | Required owner input |
| --- | --- | --- |
| `8edc51f2-bed2-433f-8a3c-5738b49a02e1` | `EAN4893575894` / `Cvetki gorshki` | public Heureka category text, public VAT-inclusive price, primary image, and stock/exclusion decision |

## External Heureka Onboarding Lane

Status: blocked by missing owner/legal/external status evidence.

Read-only evidence:

- Public feed endpoint is reachable and returns XML with `x-heureka-feed-status: valid`.
- `npm run verify:heureka-external-readiness` records the public XML feed contract and optional protected readiness-lanes evidence without mutating external Heureka.
- K8s external secret references do not include Heureka merchant/API key approval evidence.
- Prisma schema has `HeurekaAccount.apiKey` and feed settings fields, but no legal/company/IČO/shop-approval model fields.
- Existing docs indicate external Heureka previously accepted the XML check request, while feed-validity/shop status remained blocked/new/pending.

Remaining blockers:

- `[UNKNOWN: shop approval]`
- `[UNKNOWN: current external Heureka import/feed-validity result]`
- `[MISSING: owner-supplied e-shop registration legal/company fields]`
- `[MISSING: Heureka merchant/API key approval evidence]`
- `[MISSING: owner/browser-operated external Heureka approval/import evidence]`

## Validation Commands

Run after any approved data change:

```bash
ssh alfares 'cd /home/ssf/Documents/Github/heureka-service && npm run verify:heureka-owner-data-template'
ssh alfares 'cd /home/ssf/Documents/Github/heureka-service && kubectl -n statex-apps exec deploy/heureka-service -- npm run verify:heureka-blocked-product-lanes'
ssh alfares 'cd /home/ssf/Documents/Github/heureka-service && npm run verify:heureka-external-readiness'
ssh alfares 'cd /home/ssf/Documents/Github/heureka-service && curl -k -I https://heureka.alfares.cz/heureka/feed?type=heureka_cz'
```

For dashboard lane proof, use a real logged-in dashboard session or an in-pod admin JWT smoke:

```bash
ssh alfares 'kubectl -n statex-apps exec deploy/heureka-service -- node -e "<generate short-lived JWT from JWT_SECRET and GET /heureka/dashboard/readiness/lanes>"'
```

Success conditions:

- `npm run verify:heureka-owner-data-template` still reports `25` stock decisions, `12` media backfills, `1` Catalog content item, and `5` external Heureka evidence inputs until real owner data is applied.
- Products approved for sale no longer have `ZERO_STOCK`.
- Products approved for sale no longer have `MISSING_PRIMARY_IMAGE`.
- Products not intended for Heureka have explicit owner exclusion decisions.
- External Heureka shop/import status is proven by current read-only evidence.
