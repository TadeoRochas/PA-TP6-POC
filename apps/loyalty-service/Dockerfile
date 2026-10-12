FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* tsconfig.base.json ./
COPY libs libs
COPY apps/loyalty-service apps/loyalty-service
RUN npm install
RUN npm run build -w @poc/contracts
RUN npm run build -w loyalty-service

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app ./
WORKDIR /app/apps/loyalty-service
CMD ["node", "dist/main.js"]
