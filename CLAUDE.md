# Claude Instructions

Shared rules live here:

- Claude profile: `/home/ssf/.claude/CLAUDE.md`
- Shared ecosystem instructions: `/home/ssf/Documents/Github/CLAUDE.md`
- Codex profile: `/home/ssf/.codex/AGENTS.md`
- Cross-agent standard: `/home/ssf/.ai-agent-standards/CROSS_AGENT_AUTOMATION_STANDARD.md`
- Repository operations: `AGENT_OPERATIONS.md`

Read those first, then follow the repository-specific notes below and the current planning/status files.


## Repository-Specific Notes

# CLAUDE.md (heureka-service)

→ Ecosystem: [../shared/CLAUDE.md](../shared/CLAUDE.md) | Reading order: `BUSINESS.md` → `SYSTEM.md` → `AGENTS.md` → `TASKS.md` → `STATE.json`

---

## Knowledge Retrieval

Use `docs-rag-microservice` for bounded discovery when it is healthy, then
verify deployment, security, database, integration and public-contract facts
against the cited Git source. Git remains authoritative.

Authority and fallback rules:
`/home/ssf/Documents/Github/shared/docs/DOCUMENTATION_AUTHORITY.md`.

Do not generate tokens in documentation or assume an unconfident/failed RAG
response means that source documentation does not exist.

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

### Events consumed

- `stock.updated` from warehouse-microservice → triggers feed regeneration

**Ops**: `kubectl logs -f deployment/heureka-service -n statex-apps` · `./scripts/deploy.sh`
