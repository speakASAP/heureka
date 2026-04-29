# CLAUDE.md (heureka-service)

Ecosystem defaults: sibling [`../CLAUDE.md`](../CLAUDE.md) and [`../shared/docs/PROJECT_AGENT_DOCS_STANDARD.md`](../shared/docs/PROJECT_AGENT_DOCS_STANDARD.md).

Read this repo's `BUSINESS.md` → `SPEC.md` → `PLAN.md` → `SYSTEM.md` → `AGENTS.md` → `TASKS.md` → `STATE.json` first.

---

## heureka-service

**Purpose**: Heureka.cz/sk XML product feed generation from catalog data. Auto-regenerates on stock updates.  
**Domain**: https://heureka.alfares.cz  
**Stack**: NestJS · PostgreSQL · Kubernetes (`statex-apps`)

### Key constraints

- Feed must always be valid XML per Heureka schema — validate before serving
- Never include products with zero stock in the feed
- Feed generation must complete within 60 seconds
- Feed is public — never include internal cost/margin data

### Secrets

All secrets in Vault at `secret/prod/heureka-service` → ESO → K8s Secret. Never hand-write secrets.  
→ [VAULT.md](../shared/docs/VAULT.md)

### Events consumed

- `stock.updated` from warehouse-microservice → triggers feed regeneration

### Quick ops

```bash
# Logs
kubectl logs -f deployment/heureka-service -n statex-apps

# Deploy
kubectl apply -f k8s/
kubectl rollout restart deployment/heureka-service -n statex-apps

# Validate feed
curl https://heureka.alfares.cz/feed.xml | xmllint --noout -

# Secrets
vault kv get secret/prod/heureka-service
```
