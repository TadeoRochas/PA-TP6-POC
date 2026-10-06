FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY libs/contracts/package.json libs/contracts/
COPY apps/billing-service/package.json apps/billing-service/
RUN npm install --workspaces --include-workspace-root || npm install
COPY tsconfig.base.json ./
COPY libs/contracts libs/contracts
COPY apps/billing-service apps/billing-service
RUN npm run build -w @poc/contracts
RUN npm run build -w billing-service
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/libs ./libs
COPY --from=build /app/apps/billing-service/dist ./apps/billing-service/dist
COPY --from=build /app/apps/billing-service/package.json ./apps/billing-service/
WORKDIR /app/apps/billing-service
CMD ["node", "dist/main.js"]
