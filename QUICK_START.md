# Quick Start - Sistema WhatsApp → Claude → Google Calendar

Bem-vindo! Este é seu **sistema production-ready** pronto para rodar na AWS.

## 🎯 O que você recebeu

Um projeto **completo, escalável e testado** com:

✅ **Backend Lambda** - Node.js serverless  
✅ **Claude AI Integration** - Extração de eventos inteligente  
✅ **Google Calendar** - Criação automática de eventos  
✅ **DynamoDB** - Banco de dados NoSQL  
✅ **Docker** - Pronto para containerização  
✅ **Testes** - Exemplos com Jest  
✅ **Documentação** - Completa e detalhada  
✅ **Monitoramento** - CloudWatch integrado  
✅ **CI/CD Ready** - Para GitHub Actions  

## 📁 Estrutura do Projeto

```
whatsapp-calendar-system/
├── README.md                          # Visão geral
├── QUICK_START.md                     # Este arquivo
├── package.json                       # Dependências
├── serverless.yml                     # Config serverless
├── .env.example                       # Variáveis de ambiente
│
├── src/
│   ├── handlers/                      # Lambda entry points
│   │   └── whatsapp.handler.js       # Handler principal
│   │
│   ├── services/                      # Lógica de negócio
│   │   ├── claude.service.js         # Integração Claude ⭐
│   │   ├── calendar.service.js       # Google Calendar
│   │   ├── dynamodb.service.js       # DynamoDB
│   │   └── whatsapp.service.js       # WhatsApp/Evolution
│   │
│   ├── utils/                         # Utilitários
│   │   ├── logger.js                 # Logging
│   │   ├── validators.js             # Validação
│   │   └── error-handler.js          # Tratamento de erros
│   │
│   ├── config/                        # Configuração
│   └── types/                         # TypeScript definitions
│
├── tests/
│   ├── unit/                          # Testes unitários
│   ├── integration/                   # Testes integração
│   └── fixtures/                      # Dados de teste
│
├── docs/
│   ├── ARCHITECTURE.md                # Arquitetura detalhada
│   ├── SETUP.md                       # Setup passo a passo ⭐
│   ├── PROMPTS.md                     # Prompts do Claude ⭐
│   ├── API.md                         # Documentação API
│   └── DEPLOYMENT.md                  # Deploy na AWS
│
├── docker/
│   ├── Dockerfile                     # Containerização
│   └── docker-compose.yml             # Desenvolvimento local
│
└── scripts/
    ├── create-dynamodb-tables.js
    ├── get-google-token.js
    └── create-cloudwatch-dashboard.js
```

## 🚀 Começando (5 Minutos)

### 1️⃣ Clonar e Instalar

```bash
# Clonar seu repositório
cd whatsapp-calendar-system

# Instalar dependências
npm install
```

### 2️⃣ Configurar Variáveis de Ambiente

```bash
# Criar arquivo .env
cp .env.example .env

# Editar .env com suas credenciais
# Você vai precisar de:
# - CLAUDE_API_KEY (de https://console.anthropic.com)
# - Google Calendar OAuth2
# - Evolution API key
```

### 3️⃣ Rodar Localmente

```bash
# Iniciar ambiente Docker (DynamoDB local)
docker-compose -f docker/docker-compose.yml up

# Em outro terminal:
npm run dev

# Você deve ver:
# ✓ Server running on http://localhost:3000
```

### 4️⃣ Testar Webhook

```bash
# Enviar mensagem de teste
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
#   "messageId": "msg_...",
#   "status": "processed"
# }
```

### 5️⃣ Rodar Testes

```bash
# Testes unitários
npm test

# Com coverage
npm run test:coverage
```

## 📚 Documentação Essencial

Leia **nesta ordem**:

1. **[PROMPTS.md](docs/PROMPTS.md)** ⭐ CRÍTICO
   - Todos os prompts para Claude
   - Como extrair eventos
   - Troubleshooting

2. **[SETUP.md](docs/SETUP.md)** ⭐ ESSENCIAL
   - Setup completo passo a passo
   - Configuração de credenciais
   - Deploy na AWS

3. **[ARCHITECTURE.md](docs/ARCHITECTURE.md)**
   - Como o sistema funciona
   - Fluxo de dados
   - Estrutura de tabelas DynamoDB

4. **[API.md](docs/API.md)**
   - Documentação dos endpoints
   - Exemplos de requisições

## 🔐 Configuração de Credenciais (IMPORTANTE!)

### Claude API Key

1. Acesse https://console.anthropic.com
2. Vá em API Keys
3. Crie uma chave nova
4. Copie em `CLAUDE_API_KEY` no `.env`

### Google Calendar OAuth2

```bash
# Script automático (recomendado):
npm run get:google-token

# Ele vai te guiar pelo processo
```

Ou siga [SETUP.md → Seção 2.2](docs/SETUP.md#22-google-calendar-oauth2)

### Evolution API

1. Acesse seu painel Evolution API
2. Vá em Configurações > API Keys
3. Copie a URL e API Key para `.env`

## 🧪 Ciclo de Desenvolvimento

```bash
# 1. Fazer alterações no código (src/)
nano src/services/claude.service.js

# 2. Rodar testes
npm test

# 3. Testar localmente
npm run dev

# 4. Verificar logs
npm run logs:dev

# 5. Fazer commit
git add .
git commit -m "feat: minha alteração"

# 6. Deploy staging
npm run deploy:staging

# 7. Deploy produção (após validar em staging)
npm run deploy:prod
```

## 🐛 Troubleshooting Rápido

### "CLAUDE_API_KEY not found"
```bash
# Verificar .env
cat .env | grep CLAUDE

# Deve conter: CLAUDE_API_KEY=sk-ant-...
```

### "DynamoDB connection failed"
```bash
# Reiniciar Docker
docker-compose -f docker/docker-compose.yml restart dynamodb-local

# Ou criar tabelas manualmente
npm run create:tables
```

### "Teste falha com erro de mock"
```bash
# Limpar cache Jest
npm test -- --clearCache

# Rodar novamente
npm test
```

### "Google Calendar auth error"
```bash
# Renovar refresh token
npm run get:google-token

# Atualizar .env
```

## 📊 Monitorar em Desenvolvimento

```bash
# Ver logs em tempo real
npm run logs:dev

# Ver painel DynamoDB
# Acesse http://localhost:8001

# Ver saúde da aplicação
curl http://localhost:3000/health
```

## 🚀 Deploy na AWS

### Primeiro Deploy (Staging)

```bash
# 1. Configurar AWS credentials
export AWS_ACCESS_KEY_ID=seu-id
export AWS_SECRET_ACCESS_KEY=sua-chave

# 2. Deploy
npm run deploy:staging

# 3. Testar
curl https://seu-api-staging.execute-api.us-east-1.amazonaws.com/staging/health

# 4. Configurar Evolution API Webhook
# Painel Evolution → Webhooks → Nova URL:
# https://seu-api-staging.execute-api.us-east-1.amazonaws.com/staging/api/webhooks/whatsapp
```

### Produção

```bash
# ANTES de fazer deploy em produção:
# ✓ Testes passando localmente
# ✓ Testado em staging
# ✓ Credenciais verificadas
# ✓ Alertas CloudWatch configurados

npm run deploy:prod

# Monitorar
npm run logs:prod --follow
```

## 🎓 Próximos Passos

1. ✅ Setup completado
2. → Implementar painel Web (React)
3. → Adicionar GraphQL (fase 2)
4. → Melhorar detecção de eventos
5. → Machine Learning

## 💡 Dicas Importantes

### Para desenvolvimento

```bash
# Watch mode dos testes
npm run test:watch

# Lint do código
npm run lint

# Formatar código
npm run format
```

### Para debugging

```javascript
// Adicione logs em qualquer arquivo:
const logger = require("../utils/logger");

logger.info("meu_evento", {
  dados: "importantes",
  timestamp: new Date().toISOString()
});
```

### Rate Limiting

O sistema já inclui rate limiting:
- 10 mensagens por minuto por telefone
- Configurável em `.env`

## 📞 Suporte

Se algo não funcionar:

1. Verificar logs: `npm run logs:dev`
2. Consultar [SETUP.md - Troubleshooting](docs/SETUP.md#-troubleshooting)
3. Revisar [PROMPTS.md](docs/PROMPTS.md)
4. Verificar arquivo `.env`

## 📦 Produção - Checklist Final

- [ ] Todas as variáveis de ambiente configuradas
- [ ] Testes passando com coverage > 80%
- [ ] Docker rodando sem erros
- [ ] Deployment em staging funcionando
- [ ] Google Calendar sincronizando
- [ ] Claude processando eventos
- [ ] DynamoDB armazenando dados
- [ ] Logs sendo coletados
- [ ] Monitoramento CloudWatch ativo
- [ ] Backups configurados

## 🎉 Você está Pronto!

Seu sistema está **100% pronto para produção**. 

**Próximo passo**: Leia [SETUP.md](docs/SETUP.md) e comece com as configurações de credenciais.

---

**Desenvolvido com ❤️ para escala e produção** 🚀

Qualquer dúvida, revise os arquivos de documentação ou veja os logs com `npm run logs:dev`
