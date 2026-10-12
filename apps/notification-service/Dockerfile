FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* tsconfig.base.json ./
COPY libs libs
COPY apps/notification-service apps/notification-service
RUN npm install
RUN npm run build -w @poc/contracts
RUN npm run build -w notification-service

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app ./
WORKDIR /app/apps/notification-service
CMD ["node", "dist/main.js"]
