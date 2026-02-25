# ---- Build stage ----
FROM node:22-alpine AS builder

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install

COPY backend ./

RUN npm run build

# ---- Runner stage ----
FROM node:22-alpine AS runner

WORKDIR /app/backend

ENV NODE_ENV=production

COPY backend/package*.json ./
# Copy toàn bộ node_modules từ builder (bao gồm prisma CLI cho migrate:deploy)
COPY --from=builder /app/backend/node_modules ./node_modules
# Copy compiled output và prisma schema (migrations)
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma

EXPOSE 5000

# Run migrations rồi mới start server
CMD npx prisma migrate deploy && node dist/server.js
