# CLAUDE.md (heureka-service)

Ecosystem defaults: sibling [`../CLAUDE.md`](../CLAUDE.md) and [`../shared/docs/PROJECT_AGENT_DOCS_STANDARD.md`](../shared/docs/PROJECT_AGENT_DOCS_STANDARD.md).

Read this repo's `BUSINESS.md` → `SYSTEM.md` → `AGENTS.md` → `TASKS.md` → `STATE.json` first.

---

## heureka-service

**Purpose**: Heureka.cz/sk XML product feed generation from catalog data. Auto-regenerates on stock updates.  
**Domain**: https://heureka.alfares.cz  
**Stack**: NestJS · PostgreSQL

### Key constraints
- Feed must always be valid XML per Heureka schema — validate before serving
- Never include products with zero stock in the feed
- Feed generation must complete within 60 seconds — optimize for large catalogs
- Feed is public — never include internal cost/margin data

### Events consumed
- `stock.updated` from warehouse-microservice → triggers feed regeneration

### Quick ops
```bash
docker compose logs -f
./scripts/deploy.sh
# Validate feed
curl https://heureka.alfares.cz/feed.xml | xmllint --noout -
```
