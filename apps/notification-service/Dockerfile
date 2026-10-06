FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY libs/contracts/package.json libs/contracts/
COPY apps/notification-service/package.json apps/notification-service/
RUN npm install --workspaces --include-workspace-root || npm install
COPY tsconfig.base.json ./
COPY libs/contracts libs/contracts
COPY apps/notification-service apps/notification-service
RUN npm run build -w @poc/contracts
RUN npm run build -w notification-service
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/libs ./libs
COPY --from=build /app/apps/notification-service/dist ./apps/notification-service/dist
COPY --from=build /app/apps/notification-service/package.json ./apps/notification-service/
WORKDIR /app/apps/notification-service
CMD ["node", "dist/main.js"]
