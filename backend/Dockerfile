# ---- Build stage ----
FROM node:22-alpine AS builder

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install

COPY backend ./

RUN DIRECT_DATABASE_URL=postgresql://dummy npx prisma generate && npm run build

# ---- Runner stage ----
FROM node:22-alpine AS runner

WORKDIR /app/backend

ENV NODE_ENV=production

COPY backend/package*.json ./
# Copy toàn bộ node_modules từ builder
COPY --from=builder /app/backend/node_modules ./node_modules
# Copy compiled output và prisma schema (migrations)
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma
COPY --from=builder /app/backend/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/backend/tsconfig.json ./tsconfig.json

EXPOSE 5000

# Run migrations rồi start server với tsconfig-paths để resolve @ alias
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
