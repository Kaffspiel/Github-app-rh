# =============================================================
# Multi-stage Dockerfile para OPS Control (Vite React SPA)
# =============================================================

# ---------- Stage 1: Build ----------
FROM node:20-alpine AS build

WORKDIR /app

# Copiar arquivos de dependências primeiro (cache layer)
COPY package.json package-lock.json ./

# Instalar dependências
RUN npm ci --ignore-scripts

# Copiar código-fonte
COPY . .

# Variáveis de ambiente são injetadas em build-time pelo Vite (VITE_*)
# Elas serão passadas como Build Args no EasyPanel
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_URL
ARG VITE_N8N_WEBHOOK_SEND
ARG VITE_N8N_WEBHOOK_STATUS
ARG VITE_EVOLUTION_INSTANCE

# Build de produção
RUN npm run build

# ---------- Stage 2: Serve com Nginx ----------
FROM nginx:stable-alpine

# Copiar config customizada do Nginx (SPA fallback)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar arquivos estáticos do build
COPY --from=build /app/dist /usr/share/nginx/html

# EasyPanel espera porta 80 por padrão
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
