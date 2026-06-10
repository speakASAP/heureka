# CLAUDE.md (heureka-service)

→ Ecosystem: [../shared/CLAUDE.md](../shared/CLAUDE.md) | Reading order: `BUSINESS.md` → `SYSTEM.md` → `AGENTS.md` → `TASKS.md` → `STATE.json`

---

## Knowledge Retrieval — docs-rag-microservice (MANDATORY, query before reading files)

**Query the RAG before reading source files** — saves 2000-5000 tokens per answer.

```bash
kubectl -n statex-apps exec deployment/heureka-service -- curl -s -X POST http://docs-rag-microservice:3397/retrieval/agent-context \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(cat ~/.claude/rag-token)" \
  -d '{"query": "YOUR QUESTION HERE", "maxTokens": 3000}'
```


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

**Ops**: `kubectl logs -f deployment/heureka-service -n statex-apps` · `./scripts/deploy.sh`
