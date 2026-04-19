FROM node:24-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --prefer-offline --no-audit || npm ci

COPY . .

# Build aukro-service from monorepo and use its dist (ignore TS errors)
RUN cd services/aukro-service && npm install --prefer-offline --no-audit && npm run build 2>&1 | tail -5; cd ../.. && cp -r services/aukro-service/dist ./dist 2>/dev/null || true

EXPOSE 3000

ENTRYPOINT ["node"]
CMD ["dist/main.js"]
