# Goal Impact Mapping

```yaml
id: GOAL-IMPACT-MAPPING
status: reviewed
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream: [../01_vision/VISION.md]
downstream: []
related_adrs: []
```

## Purpose

Define how artifacts explain contribution to preserved intent.

## Core principle

No implementation work is valid unless it traces to vision, business constraints, and validation.

## Traceability chain

Vision -> Business Case -> System -> Feature -> Task -> Execution Plan -> Code -> Validation Report.

## Impact levels

critical, high, medium, low, none.

## Required fields for every goal impact record

Artifact id/path, primary goal, impact level, upstream/downstream links, validation method, explanation, evidence, validation.

## Orphan work rule

Work without upstream links or validation remains draft or blocked.

## Agent behavior

Draft from approved docs only; do not invent goals or approvals.

## Audit questions

Does it link artifact, cite upstream docs, and define validation evidence?
