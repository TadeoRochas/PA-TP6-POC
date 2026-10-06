FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY libs/contracts/package.json libs/contracts/
COPY apps/provisioning-service/package.json apps/provisioning-service/
RUN npm install --workspaces --include-workspace-root || npm install
COPY tsconfig.base.json ./
COPY libs/contracts libs/contracts
COPY apps/provisioning-service apps/provisioning-service
RUN npm run build -w @poc/contracts
RUN npm run build -w provisioning-service
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/libs ./libs
COPY --from=build /app/apps/provisioning-service/dist ./apps/provisioning-service/dist
COPY --from=build /app/apps/provisioning-service/package.json ./apps/provisioning-service/
WORKDIR /app/apps/provisioning-service
CMD ["node", "dist/main.js"]
