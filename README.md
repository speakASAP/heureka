# heureka-service

Heureka.cz/sk XML feed generation service.

**Domain**: https://heureka.alfares.cz  
**Stack**: NestJS · PostgreSQL · Kubernetes (`statex-apps`)  
**Port**: 3000 (ClusterIP)

## API

Base: `https://heureka.alfares.cz`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/heureka/feed` | Generate and return XML feed |
| GET | `/heureka/feed/download` | Download feed file |
| POST | `/heureka/feed/regenerate` | Manually regenerate feed |
| GET | `/heureka/feed/status` | Get latest feed status |
| GET | `/heureka/feed/readiness/products/:productId` | Check one Catalog product for feed readiness |
| POST | `/heureka/feed/readiness/bulk` | Check up to 100 Catalog products for feed readiness |
| GET | `/heureka/products` | List products in feed |
| GET | `/heureka/products/:productId/status` | Read product feed inclusion and readiness |
| POST | `/heureka/products/:productId/include` | Include product after readiness passes |
| DELETE | `/heureka/products/:productId/exclude` | Exclude product |

Product include/exclude endpoints require `x-service-name` and `x-internal-service-token` service headers. Catalog should call readiness first and let Heureka own feed inclusion.

## Feed format

Heureka XML schema — validate with `curl https://heureka.alfares.cz/feed.xml | xmllint --noout -`

## Secrets

All secrets in Vault at `secret/prod/heureka-service` → ESO → K8s Secret `heureka-service-secret`.  
→ [VAULT.md](../shared/docs/VAULT.md)

## Architecture · Deployment · Ops

→ [SYSTEM.md](SYSTEM.md)

## Business rules · Constraints

→ [BUSINESS.md](BUSINESS.md)
