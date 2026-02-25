# ---- Build stage ----
FROM node:22-alpine AS builder

WORKDIR /app

COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY frontend ./frontend

# VITE_* được inject từ docker-compose build.args (đọc từ .env)
ARG VITE_BACKEND_URL
ARG VITE_OAUTH_CLIENT_ID

ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_OAUTH_CLIENT_ID=$VITE_OAUTH_CLIENT_ID

RUN cd frontend && npm run build

# ---- Runner stage ----
FROM nginx:1.26-alpine

# Bake HTTP-only config:
#   - Railway: dùng file này (Railway tự handle HTTPS bên ngoài)
#   - DO VPS:  docker-compose.yml sẽ mount nginx/nginx.conf (HTTPS) đè lên
COPY nginx/nginx-http-only.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
