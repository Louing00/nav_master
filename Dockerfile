FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json
RUN npm ci

FROM node:20-bookworm-slim AS prod-deps
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json
RUN npm ci --omit=dev

FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run prisma:generate
RUN npm run build
RUN mkdir -p server/static/dist && cp -r web/dist/* server/static/dist/

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server/package.json ./server/package.json
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/prisma ./server/prisma
COPY --from=builder /app/server/static ./server/static
RUN mkdir -p /data
EXPOSE 8081
CMD ["node", "server/dist/src/main.js"]
