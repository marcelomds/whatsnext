# Setup Completo - Guia Passo a Passo

## 📋 Pré-requisitos

- Node.js 18 pro backend (`serverless-offline` não roda em 20+) e Node.js 20.12+ pro frontend (Vite/Vitest usam `util.styleText`) — use `nvm` pra alternar
- npm ou yarn
- Conta AWS (com permissões IAM)
- Conta Google (para Google Calendar)
- Evolution API com webhook configurado
- Claude API key (Anthropic)

## 🚀 Fase 1: Setup Local

### 1.1 Clonar repositório

```bash
git clone seu-repo-aqui
cd whatsapp-calendar-system
npm install
```

### 1.2 Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env` com suas credenciais:

```env
# Environment
NODE_ENV=development
AWS_REGION=us-east-1
STAGE=dev

# AWS
AWS_ACCESS_KEY_ID=seu-access-key
AWS_SECRET_ACCESS_KEY=seu-secret-key

# Claude API
CLAUDE_API_KEY=sk-ant-sua-chave-aqui

# Google Calendar
GOOGLE_CALENDAR_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=seu-secret-aqui
GOOGLE_CALENDAR_REFRESH_TOKEN=seu-refresh-token

# Evolution API
EVOLUTION_API_URL=https://sua-instancia.evolution.ai
EVOLUTION_API_KEY=seu-api-key-evolution

# WhatsApp
WHATSAPP_PHONE_NUMBER=5511999999999

# Só processa mensagens vindas deste número (o dono da conta). Qualquer outro
# remetente é ignorado silenciosamente — sem isso o bot responde a quem
# mandar mensagem pro número conectado, não só você.
AUTHORIZED_PHONE_NUMBER=5511999999999

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=10
```

### 1.3 Instalar dependências

```bash
npm install
```

### 1.4 Testar instalação

```bash
npm test
```

---

## 🔐 Fase 2: Configurar Credenciais

### 2.1 Claude API Key

1. Acesse https://console.anthropic.com
2. Vá em "API Keys"
3. Crie uma nova chave
4. Copie em `CLAUDE_API_KEY` no `.env`

### 2.2 Google Calendar OAuth2

#### Passo 1: Criar projeto Google Cloud

```bash
# 1. Acesse https://console.cloud.google.com
# 2. Crie um novo projeto
# 3. Nome: "WhatsApp Calendar System"
# 4. Aguarde criação
```

#### Passo 2: Habilitar Google Calendar API

```bash
# 1. Vá em APIs & Services > Enabled APIs
# 2. Clique em "Enable APIs and Services"
# 3. Procure por "Google Calendar API"
# 4. Clique "ENABLE"
```

#### Passo 3: Criar OAuth2 Credentials

```bash
# 1. Vá em APIs & Services > Credentials
# 2. Clique "Create Credentials"
# 3. Selecione "OAuth client ID"
# 4. Application type: "Web application"
# 5. Authorized redirect URIs:
#    - http://localhost:3000/callback
#    - https://seu-dominio.com/callback
# 6. Copie Client ID e Client Secret
```

#### Passo 4: Obter Refresh Token

```bash
# Rode este script para obter o refresh token
node scripts/get-google-token.js

# Ou faça manualmente:
# 1. Acesse (substituir client_id):
# https://accounts.google.com/o/oauth2/v2/auth?
#   client_id=seu-client-id&
#   redirect_uri=http://localhost:3000/callback&
#   response_type=code&
#   scope=https://www.googleapis.com/auth/calendar

# 2. Autorize o acesso
# 3. Você será redirecionado com ?code=xxx
# 4. Capture o code
# 5. Faça POST em https://oauth2.googleapis.com/token com:
#    - code=xxx
#    - client_id=seu-client-id
#    - client_secret=seu-secret
#    - redirect_uri=http://localhost:3000/callback
#    - grant_type=authorization_code

# 6. Salve o refresh_token retornado
```

### 2.3 Evolution API

```bash
# 1. Acesse seu painel Evolution API
# 2. Vá em Configurações > API Keys
# 3. Crie uma nova API Key
# 4. Copie para EVOLUTION_API_KEY e EVOLUTION_API_URL
```

### 2.4 OpenAI (Whisper — transcrição de áudio)

```bash
# 1. Acesse https://platform.openai.com/api-keys
# 2. Crie uma nova secret key
# 3. Copie para OPENAI_API_KEY
# (OPENAI_TRANSCRIBE_MODEL já vem com o padrão "whisper-1" no .env.example)
```

Usada só quando o remetente manda um áudio ao invés de texto — o handler
transcreve via Whisper antes de mandar pro Claude. Sem essa chave, mensagens
de texto continuam funcionando normalmente; só áudio falha.

### 2.5 AWS Secrets Manager (Produção)

```bash
# Criar secret para Claude API Key
aws secretsmanager create-secret \
  --name whatsapp-calendar/claude-api-key \
  --secret-string sk-ant-sua-chave \
  --region us-east-1

# Criar secret para Google Calendar
aws secretsmanager create-secret \
  --name whatsapp-calendar/google-calendar \
  --secret-string '{"client_id":"...","client_secret":"...","refresh_token":"..."}'

# Criar secret para Evolution API
aws secretsmanager create-secret \
  --name whatsapp-calendar/evolution-api \
  --secret-string '{"api_key":"...","url":"..."}'
```

---

## 💾 Fase 3: Configurar Banco de Dados (DynamoDB)

### 3.1 Criar tabelas localmente (para dev)

```bash
# Com DynamoDB local
docker run -d -p 8000:8000 amazon/dynamodb-local

# Executar script de criação
node scripts/create-dynamodb-tables.js
```

### 3.2 Criar tabelas na AWS

```bash
# Script automático
npm run create:tables

# Ou manualmente via AWS CLI:

# Tabela: messages
aws dynamodb create-table \
  --table-name messages \
  --attribute-definitions \
    AttributeName=messageId,AttributeType=S \
    AttributeName=timestamp,AttributeType=N \
  --key-schema \
    AttributeName=messageId,KeyType=HASH \
    AttributeName=timestamp,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# Tabela: events
aws dynamodb create-table \
  --table-name events \
  --attribute-definitions \
    AttributeName=eventId,AttributeType=S \
    AttributeName=timestamp,AttributeType=N \
    AttributeName=phoneNumber,AttributeType=S \
  --key-schema \
    AttributeName=eventId,KeyType=HASH \
    AttributeName=timestamp,KeyType=RANGE \
  --global-secondary-indexes \
    IndexName=phoneNumber-timestamp-index,\
    Keys=[{AttributeName=phoneNumber,KeyType=HASH},{AttributeName=timestamp,KeyType=RANGE}],\
    Projection={ProjectionType=ALL},\
    ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5} \
  --billing-mode PROVISIONED \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region us-east-1
```

---

## 🧪 Fase 4: Testar Localmente

### 4.1 Rodar testes

```bash
# Todos os testes
npm test

# Com coverage
npm run test:coverage

# Testes específicos
npm run test:unit
npm run test:integration

# Watch mode
npm run test:watch
```

### 4.2 Rodar localmente (sem deploy)

```bash
# Inicia servidor local (port 3000)
npm run dev

# Você verá:
# ✓ Server running on http://localhost:3000
# ✓ AWS Lambda emulator ready
# ✓ DynamoDB connected
```

### 4.3 Testar webhook manualmente

```bash
# Abra outro terminal e teste:

curl -X POST http://localhost:3000/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "from": "5511999999999",
    "message": "Próxima segunda 14h reunião com João",
    "timestamp": '$(date +%s)'
  }'

# Você deve receber:
# {
#   "success": true,
#   "messageId": "msg_abc123",
#   "status": "processing"
# }
```

### 4.4 Verificar mensagens criadas

```bash
curl http://localhost:3000/api/messages

# Resposta:
# {
#   "data": [
#     {
#       "messageId": "msg_abc123",
#       "phoneNumber": "5511999999999",
#       "content": "Próxima segunda 14h reunião com João",
#       "status": "success",
#       "createdAt": "2024-01-05T10:30:00Z"
#     }
#   ],
#   "count": 1
# }
```

---

## 📦 Fase 5: Deploy na AWS

### 5.1 Instalar Serverless Framework

```bash
npm install -g serverless

# Login
serverless login
```

### 5.2 Configurar IAM Role

```bash
# Crie um usuário IAM com permissões:
# - Lambda (create, update, delete)
# - API Gateway (create, update)
# - DynamoDB (full access)
# - Secrets Manager (read)
# - CloudWatch Logs (write)
# - IAM (create roles)

# Obtenha access key e secret
aws iam create-access-key --user-name serverless-user
```

### 5.3 Deploy para Staging

```bash
# Build
npm run build

# Deploy staging
npm run deploy:staging

# Você verá:
# ✓ Deployed WhatsApp Calendar System
# ✓ API Endpoint: https://abc123.execute-api.us-east-1.amazonaws.com/staging
# ✓ Lambda functions: 4
# ✓ DynamoDB tables: 3
```

### 5.4 Testar em Staging

```bash
# Substituir URL do seu .env.staging
curl -X POST https://seu-api-staging.execute-api.us-east-1.amazonaws.com/staging/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "from": "5511999999999",
    "message": "Amanhã 10h call com o time"
  }'
```

### 5.5 Configurar Evolution API Webhook

1. Acesse seu painel Evolution API
2. Vá em Webhooks
3. Adicione webhook:
   - **URL**: `https://seu-api-staging.execute-api.us-east-1.amazonaws.com/staging/api/webhooks/whatsapp`
   - **Eventos**: messages
   - **Método**: POST
   - **Headers**: `Authorization: Bearer seu-token`

### 5.6 Deploy para Produção

```bash
# Reviewe e teste em staging ANTES!

# Deploy prod
npm run deploy:prod

# Monitorar
npm run logs:prod

# Verificar status
npm run status:prod
```

---

## 🔔 Fase 6: Configurar Monitoramento

### 6.1 CloudWatch Dashboard

```bash
# Script cria dashboard automático
npm run create:dashboard

# Ou manualmente:
aws cloudwatch put-dashboard \
  --dashboard-name WhatsappCalendarSystem \
  --dashboard-body file://dashboards/main.json
```

### 6.2 Configurar Alertas

```bash
# Lambda duration > 30s
aws cloudwatch put-metric-alarm \
  --alarm-name lambda-duration-high \
  --alarm-description "Lambda execution time too high" \
  --metric-name Duration \
  --namespace AWS/Lambda \
  --statistic Average \
  --period 300 \
  --threshold 30000 \
  --comparison-operator GreaterThanThreshold

# Error rate > 5%
aws cloudwatch put-metric-alarm \
  --alarm-name lambda-errors-high \
  --alarm-description "Lambda error rate too high" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 60 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

### 6.3 Ver Logs

```bash
# Logs de produção
npm run logs:prod -- --follow

# Filtrar por erro
npm run logs:prod -- --filter "ERROR"

# Últimas 100 linhas
npm run logs:prod -- --tail 100
```

---

## ✅ Checklist de Setup

### Local (Desenvolvimento)
- [ ] Node.js 18+ instalado
- [ ] Dependências instaladas (`npm install`)
- [ ] `.env` configurado com credenciais locais
- [ ] Testes passando (`npm test`)
- [ ] Servidor local rodando (`npm run dev`)
- [ ] Webhook testado localmente
- [ ] DynamoDB local funcionando

### Credenciais
- [ ] Claude API Key em AWS Secrets Manager
- [ ] Google Calendar OAuth2 configurado
- [ ] Evolution API Key segura
- [ ] OpenAI API Key (transcrição de áudio)
- [ ] IAM roles e policies criados
- [ ] Secrets configurados no GitHub (Settings → Secrets and variables → Actions) para o deploy automático — veja "CI/CD" no README

### AWS
- [ ] DynamoDB tabelas criadas
- [ ] Lambda functions deploiadas
- [ ] API Gateway configurado
- [ ] Secrets Manager configurado
- [ ] CloudWatch logs ativado

### Evolution API
- [ ] Webhook apontando para API Gateway
- [ ] Autenticação funcionando
- [ ] Mensagens chegando

### Monitoramento
- [ ] CloudWatch dashboard criado
- [ ] Alertas configurados
- [ ] Logs sendo coletados

---

## 🆘 Troubleshooting

### Problema: "Claude API Key not found"

```bash
# Solução 1: Verificar .env
cat .env | grep CLAUDE

# Solução 2: Verificar Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id whatsapp-calendar/claude-api-key
```

### Problema: "DynamoDB connection failed"

```bash
# Verificar DynamoDB local
curl http://localhost:8000/

# Ou usar AWS DynamoDB:
aws dynamodb list-tables --region us-east-1
```

### Problema: "Lambda timeout"

```bash
# Aumentar timeout em serverless.yml
functions:
  handleWhatsapp:
    timeout: 60  # Aumentado de 30

# Redeploy
npm run deploy:staging
```

### Problema: "Google Calendar authentication failed"

```bash
# Renovar refresh token
node scripts/get-google-token.js

# Atualizar Secrets Manager
aws secretsmanager update-secret \
  --secret-id whatsapp-calendar/google-calendar \
  --secret-string '{"refresh_token":"novo-token"}'
```

---

## 📚 Próximos Passos

1. ✅ Setup concluído
2. → [API.md](API.md) - Documentação dos endpoints
3. → [DEPLOYMENT.md](DEPLOYMENT.md) - Estratégias avançadas
4. → [TESTING.md](TESTING.md) - Testes e qualidade

---

**Dúvidas?** Revise cada seção ou confira logs com `npm run logs:dev`
