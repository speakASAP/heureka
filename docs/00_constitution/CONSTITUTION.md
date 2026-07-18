# Heureka Service Project Constitution

```yaml
id: CONSTITUTION
status: approved
owner: Project Sponsor / Product Owner
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../BUSINESS.md
downstream:
  - ../01_vision/VISION.md
  - ../17_governance/PROJECT_INVARIANTS.md
related_adrs:
  - ../07_decisions/ADR-001-use-nestjs-postgres-kubernetes.md
```

## Purpose

Apply the company Intent Preservation System to `heureka-service` so service intent is traceable from business rules through implementation and validation.

## Constitutional Principles

The service generates valid Heureka.cz/sk XML feeds from catalog data, excludes zero-stock products, completes generation within 60 seconds, and keeps public output free of secrets and internal commercial data.

## Immutable Documents

After this human-requested bootstrap, AI agents must not modify this file or `../01_vision/VISION.md`. Intent changes require `../01_vision/VISION_EVOLUTION.md` and human review.

## Change Control

Major business, architecture, integration, data, or deployment changes require an ADR or vision-evolution entry before implementation.

## Non-Negotiable Rules For AI Agents

Do not invent goals or approvals, weaken feed constraints, add sensitive data to artifacts, or deploy implementation work without validation evidence.
