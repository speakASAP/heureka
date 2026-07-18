# Heureka Service Core Entities

```yaml
id: CORE-ENTITIES
status: reviewed
owner: Engineering
created: 2026-06-13
last_updated: 2026-06-13
completeness_level: complete
upstream: [../01_vision/VISION.md, ./GLOSSARY.md]
downstream: []
related_adrs: []
```

## Entity Relationship Overview

Catalog products and warehouse stock events feed the service; the service stores feed, product, and settings records.

## HeurekaFeed

Generated feed history and output metadata.

## HeurekaProduct

Product feed inclusion state and feed-specific metadata.

## HeurekaSettings

Feed configuration for Heureka.cz/sk.

## Catalog Product

External source entity owned by catalog service.

## Stock Event

External warehouse event triggering regeneration.
