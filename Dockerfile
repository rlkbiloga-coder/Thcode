# Thcode Backend — imagem de produção
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache python3 make g++ bash git
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --omit=dev
COPY backend/src ./src
RUN mkdir -p /workspace

FROM node:20-alpine
RUN apk add --no-cache bash git python3
WORKDIR /app
ENV NODE_ENV=production WORKSPACE_DIR=/workspace
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY backend/package.json ./
EXPOSE 8080
CMD ["node", "src/server.js"]
