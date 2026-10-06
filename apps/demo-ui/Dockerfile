FROM node:20-alpine AS build
WORKDIR /app
COPY apps/demo-ui/package.json ./
RUN npm install
COPY apps/demo-ui ./
ARG VITE_API_URL=http://localhost:3000
ARG VITE_WS_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
RUN npm run build
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
