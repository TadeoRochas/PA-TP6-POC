FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY libs/contracts/package.json libs/contracts/
COPY apps/crm-analytics-service/package.json apps/crm-analytics-service/
RUN npm install --workspaces --include-workspace-root || npm install
COPY tsconfig.base.json ./
COPY libs/contracts libs/contracts
COPY apps/crm-analytics-service apps/crm-analytics-service
RUN npm run build -w @poc/contracts
RUN npm run build -w crm-analytics-service
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/libs ./libs
COPY --from=build /app/apps/crm-analytics-service/dist ./apps/crm-analytics-service/dist
COPY --from=build /app/apps/crm-analytics-service/package.json ./apps/crm-analytics-service/
WORKDIR /app/apps/crm-analytics-service
CMD ["node", "dist/main.js"]
