FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* tsconfig.base.json ./
COPY libs libs
COPY apps/activation-api apps/activation-api
RUN npm install
RUN npm run build -w @poc/contracts
RUN npm run build -w @poc/kafka-toolkit
RUN npm run build -w activation-api

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app ./
WORKDIR /app/apps/activation-api
EXPOSE 3000
CMD ["node", "dist/main.js"]
