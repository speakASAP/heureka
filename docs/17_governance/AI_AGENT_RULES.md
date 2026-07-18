# AI Agent Rules

```yaml
id: AI-AGENT-RULES
status: reviewed
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream: [../00_constitution/CONSTITUTION.md, ../23_documentation_contracts/AGENT_GAP_FILLING_RULES.md]
downstream: []
related_adrs: []
```

## Purpose

Define AI-agent behavior for `heureka-service` under IPS.

## Required Workflow

Read the relevant task, execution plan, invariants, sensitive-data policy, and service docs before changing code.

## Forbidden Actions

Do not modify immutable docs after bootstrap, invent goals, weaken feed constraints, put secrets/raw production data in artifacts, or change files outside scope without reporting.

## Documentation Gaps

Fill only from approved upstream docs; otherwise use explicit missing or unknown markers.

## Validation Requirements

Run relevant tests and IPS gates; report evidence, gaps, and deviations.
