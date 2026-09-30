FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++
COPY backend/package*.json ./
RUN npm ci --omit=dev

FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends git python3 openssh-client ca-certificates
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY backend/package*.json ./
COPY backend/src ./src
RUN mkdir /app/workspace && chown -R node:node /app
USER node
ENV NODE_ENV=production WORKSPACE_DIR=/app/workspace PORT=8080
EXPOSE 8080
CMD ["node", "src/server.js"]
