# System: heureka-service

## Architecture

NestJS + PostgreSQL. XML feed generation for Heureka.cz and Heureka.sk.

- Supports multiple feed types
- Stores feed generation history
- Subscribes to stock.updated → regenerates feed

## Integrations

| Service | Usage |
|---------|-------|
| database-server:5432 | PostgreSQL |
| logging-microservice:3367 | Logs |
| catalog-microservice:3200 | Product data |
| warehouse-microservice:3201 | Stock events |

## Current State
<!-- AI-maintained -->
Stage: production

## Known Issues
<!-- AI-maintained -->
- None
