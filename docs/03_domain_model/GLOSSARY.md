# Heureka Service Glossary

```yaml
id: GLOSSARY
status: reviewed
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream: [../01_vision/VISION.md]
downstream: [./CORE_ENTITIES.md]
related_adrs: []
```

## Feed

Public Heureka XML generated from catalog and stock data.

## Feed Generation

Mapping eligible products and settings into valid XML and feed history.

## Eligible Product

Included product with stock greater than zero and required XML fields.

## Stock Update

Warehouse event that can trigger regeneration.

## Feed Settings

Service-owned configuration for Czech and Slovak feed variants.

## Validation

Checks for XML validity, stock exclusion, timing, and IPS traceability.
