# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm ci

# Copiar código
COPY apps/backend/src/ ./src/
COPY docs/ ./docs/

# Production stage
FROM node:18-alpine

WORKDIR /app

# Instalar dumb-init (para melhor gerenciamento de sinais)
RUN apk add --no-cache dumb-init

# Criar usuário non-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copiar node_modules do builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/docs ./docs

# Copiar outros arquivos necessários
COPY package.json .
COPY apps/backend/serverless.yml .

# Mudar propriedário dos arquivos
RUN chown -R nodejs:nodejs /app

# Usar user non-root
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/dev/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Usar dumb-init para gerenciar processos
ENTRYPOINT ["dumb-init", "--"]

# Start comando para desenvolvimento
# Para produção, usar serverless framework
# (não usa "npm run dev": esse script faz cd apps/backend, mas aqui o código
# já foi copiado achatado direto em /app/src)
CMD ["npx", "serverless", "offline", "start", "--stage", "dev"]

# Metadados
LABEL maintainer="Seu Nome"
LABEL description="WhatsApp Calendar System - Lambda Function"
LABEL version="1.0.0"
