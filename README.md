# Heureka Service

Heureka.cz/sk XML feed generation service for the unified e-commerce platform.

## Overview

The Heureka Service generates XML feeds in Heureka format for price comparison platforms. It uses central microservices (catalog, warehouse) as the single source of truth.

## Port Configuration

**Port Range**: 38xx

| Service | Subdomain | Port |
|---------|-----------|------|
| heureka-service | heureka.statex.cz | 3800 |
| api-gateway | heureka.statex.cz | 3801 |
| gateway-proxy | heureka.statex.cz | 3804 |

## Features

- Generate Heureka XML feed from catalog products
- Subscribe to `stock.updated` events → regenerate feed
- Support multiple feed types (Heureka.cz, Heureka.sk)
- Store feed generation history

## Architecture

- Uses `catalog-microservice` (3200) for product data
- Uses `warehouse-microservice` (3201) for stock levels
- Subscribes to RabbitMQ `stock.updated` events

## Database

Database: `heureka_db`

**Tables**:
- `HeurekaFeed` - Feed generation history
- `HeurekaProduct` - Products included in feed
- `HeurekaSettings` - Feed configuration

## API Endpoints

Base URL: `https://heureka.statex.cz/api` (or `http://localhost:3801/api` in dev)

- `GET /api/feed` - Generate and return XML feed
- `GET /api/feed/download` - Download feed file
- `POST /api/feed/regenerate` - Manually regenerate feed
- `GET /api/products` - List products in feed
- `POST /api/products/:productId/include` - Include product in feed
- `DELETE /api/products/:productId/exclude` - Exclude product from feed
- `GET /api/settings` - Get feed settings
- `PUT /api/settings` - Update feed settings

## Feed Format

Heureka XML format (https://sluzby.heureka.cz/napoveda/xml-feed/)

## Environment Variables

See `.env.example` for required environment variables.

## Deployment

Deploy using `nginx-microservice/scripts/blue-green/deploy-smart.sh`:

```bash
cd /home/statex/heureka-service
./nginx-microservice/scripts/blue-green/deploy-smart.sh
```

## Development

```bash
npm run start:dev
```

