# Project Invariants

```yaml
id: PROJECT-INVARIANTS
status: reviewed
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream:
  - ../00_constitution/CONSTITUTION.md
  - ../01_vision/VISION.md
  - ../BUSINESS.md
```

## Purpose

Declare non-negotiable service rules every task, plan, code change, and validation report must preserve.

## Applicability

Applies to all work unless a human-approved vision-evolution entry or ADR changes the rule.

## Invariants

| ID | Level | Source | Rule | Forbidden outcome | Validation method | Gate |
|---|---|---|---|---|---|---|
| INV-001 | business | `../BUSINESS.md` | Generated feed XML must remain valid. | Serving invalid XML. | XML validation and tests. | pre-coding/deployment |
| INV-002 | business | `../BUSINESS.md` | Zero-stock products must not be included. | Feed contains unavailable products. | Eligibility tests. | pre-coding/deployment |
| INV-003 | operational | `../BUSINESS.md` | Feed generation must complete within 60 seconds. | Generation exceeds SLA. | Timing evidence. | deployment |
| INV-004 | data-safety | `../CLAUDE.md` | Public feed excludes internal cost/margin data. | Public output contains internal data. | Output-field tests. | pre-coding/deployment |
| INV-005 | security | `../SYSTEM.md` | Secret values stay in Vault/ESO and outside IPS artifacts. | Secrets copied into artifacts. | Sensitive-data scan. | pre-coding/deployment |

## Exceptions

No approved exceptions are recorded.

## Review cadence

Review when business rules, architecture, feed contracts, integrations, or deployment processes change.
