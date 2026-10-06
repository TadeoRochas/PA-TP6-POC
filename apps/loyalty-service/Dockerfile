FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY libs/contracts/package.json libs/contracts/
COPY apps/loyalty-service/package.json apps/loyalty-service/
RUN npm install --workspaces --include-workspace-root || npm install
COPY tsconfig.base.json ./
COPY libs/contracts libs/contracts
COPY apps/loyalty-service apps/loyalty-service
RUN npm run build -w @poc/contracts
RUN npm run build -w loyalty-service
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/libs ./libs
COPY --from=build /app/apps/loyalty-service/dist ./apps/loyalty-service/dist
COPY --from=build /app/apps/loyalty-service/package.json ./apps/loyalty-service/
WORKDIR /app/apps/loyalty-service
CMD ["node", "dist/main.js"]
