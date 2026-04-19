FROM node:24-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --prefer-offline --no-audit || npm ci

COPY . .

RUN npm run build 2>/dev/null || \
    (cd services/aukro-service && npm install && npm run build && cd ../.. && cp -r services/aukro-service/dist ./dist) 2>/dev/null || \
    npx tsc 2>/dev/null || true

EXPOSE 3000

CMD ["node", "dist/main.js"]
