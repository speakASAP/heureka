FROM node:24-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy shared module first and build it
COPY shared ./shared
WORKDIR /app/shared
RUN npm ci && npm run build

# Copy service files and dependencies
WORKDIR /app
COPY services/heureka-service ./services/heureka-service
COPY tsconfig.json ./
COPY package*.json ./
COPY scripts ./scripts
COPY prisma ./prisma

# Install service dependencies (which reference shared via file://)
WORKDIR /app/services/heureka-service
RUN npm install

# Generate Prisma client from repo root to avoid prisma CLI attempting implicit package installs in /app/shared
# Output path in schema is ../shared/node_modules/.prisma/client (relative to /app/prisma/) = /app/shared/node_modules/.prisma/client
WORKDIR /app
RUN npm install --prefix /app/shared --save-dev prisma@5.22.0 --silent
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"     ./shared/node_modules/.bin/prisma generate --schema=prisma/schema.prisma
# @prisma/client resolves .prisma/client/default.js; without this copy it stays the uninitialized stub
RUN cp /app/shared/node_modules/.prisma/client/index.js /app/shared/node_modules/.prisma/client/default.js
# Copy generated client into the service's node_modules/.prisma/client so @prisma/client resolves the real client
RUN cp -r /app/shared/node_modules/.prisma/client/. /app/services/heureka-service/node_modules/.prisma/client/

# Build service
WORKDIR /app/services/heureka-service
RUN npm run build

# Production stage - copy only what's needed
FROM node:24-slim

# Install OpenSSL for Prisma query engine
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy service dist and node_modules
COPY --from=builder /app/services/heureka-service/dist ./dist
COPY --from=builder /app/services/heureka-service/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/scripts ./scripts

# Copy entire shared package (source + compiled dist + node_modules for @heureka/shared)
COPY --from=builder /app/shared ./shared

# Ensure @heureka/shared is properly resolved in node_modules
RUN mkdir -p /app/node_modules/@heureka && ln -sf ../../shared /app/node_modules/@heureka/shared

EXPOSE 3000

CMD ["node", "dist/main.js"]
