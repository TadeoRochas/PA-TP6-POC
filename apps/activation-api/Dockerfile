FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY libs/contracts/package.json libs/contracts/
COPY libs/kafka-toolkit/package.json libs/kafka-toolkit/
COPY apps/activation-api/package.json apps/activation-api/
RUN npm install --workspaces --include-workspace-root || npm install
COPY tsconfig.base.json ./
COPY libs/contracts libs/contracts
COPY libs/kafka-toolkit libs/kafka-toolkit
COPY apps/activation-api apps/activation-api
RUN npm run build -w @poc/contracts
RUN npm run build -w @poc/kafka-toolkit
RUN npm run build -w activation-api
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/libs ./libs
COPY --from=build /app/apps/activation-api/dist ./apps/activation-api/dist
COPY --from=build /app/apps/activation-api/package.json ./apps/activation-api/
WORKDIR /app/apps/activation-api
EXPOSE 3000
CMD ["node", "dist/main.js"]
