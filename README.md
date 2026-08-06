# WhatsApp → Claude → Google Calendar System

**Sistema inteligente de agendamento via WhatsApp usando Claude AI e Google Calendar**

> Este é um projeto **production-ready** escalável, testado e pronto para rodar na AWS com as melhores práticas de engenharia.

## 🎯 Visão Geral

```
WhatsApp (Evolution API) → AWS Lambda → Claude AI → Google Calendar + Dashboard
                                  ↓
                              DynamoDB
                                  ↓
                          Painel de Acompanhamento
```

## ✨ Features

- ✅ Processamento de mensagens WhatsApp em tempo real
- ✅ IA (Claude) entendendo contexto e extraindo eventos
- ✅ Criação automática de eventos no Google Calendar
- ✅ Painel Web para acompanhar mensagens e eventos
- ✅ Histórico completo em DynamoDB
- ✅ Testes unitários e integração
- ✅ Docker pronto para deploy
- ✅ CI/CD pipelines (GitHub Actions)
- ✅ Logging e monitoramento (CloudWatch)
- ✅ Retry automático com exponential backoff

## 🚀 Quick Start

```bash
# 1. Clone e setup
git clone seu-repo
cd whatsapp-calendar-system
npm install

# 2. Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais

# 3. Rode testes
npm test

# 4. Inicie localmente
npm run dev

# 5. Deploy na AWS
npm run deploy
```

## 📁 Estrutura do Projeto

```
whatsapp-calendar-system/
├── src/
│   ├── handlers/
│   │   ├── whatsapp.handler.js (Lambda entry point)
│   │   └── webhook.handler.js
│   ├── services/
│   │   ├── claude.service.js (Integração Claude)
│   │   ├── calendar.service.js (Google Calendar)
│   │   ├── whatsapp.service.js (Evolution API)
│   │   └── dynamodb.service.js (Database)
│   ├── utils/
│   │   ├── logger.js
│   │   ├── error-handler.js
│   │   └── validators.js
│   ├── types/
│   │   └── index.d.ts (TypeScript definitions)
│   └── config/
│       └── index.js
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── docs/
│   ├── ARCHITECTURE.md
│   ├── SETUP.md
│   ├── PROMPTS.md
│   ├── API.md
│   └── DEPLOYMENT.md
├── serverless.yml (Config Serverless Framework)
├── package.json
├── .env.example
└── jest.config.js
```

## 🔧 Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| **Serverless** | AWS Lambda |
| **Banco de Dados** | DynamoDB |
| **API** | API Gateway (REST) |
| **IA** | Claude API (Anthropic) |
| **Google Calendar** | Official Google Calendar API |
| **WhatsApp** | Evolution API |
| **Linguagem** | Node.js 18+ |
| **Framework Lambda** | Serverless Framework |
| **Testing** | Jest + Supertest |
| **Containerização** | Docker |
| **CI/CD** | GitHub Actions |

## 📊 Arquitetura Completa

Veja em detalhes: [ARCHITECTURE.md](docs/ARCHITECTURE.md)

## 🔐 Segurança

- ✅ Variáveis de ambiente (nunca commitar secrets)
- ✅ IAM roles específicos por Lambda
- ✅ Encriptação em trânsito (HTTPS)
- ✅ DynamoDB com autenticação
- ✅ Rate limiting
- ✅ Input validation
- ✅ Error handling sem exposição de dados sensíveis

## 📖 Documentação

- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Visão geral arquitetura
- **[SETUP.md](docs/SETUP.md)** - Setup completo passo a passo
- **[PROMPTS.md](docs/PROMPTS.md)** - Prompts para Claude (crítico!)
- **[API.md](docs/API.md)** - Documentação dos endpoints
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Deploy na AWS
- **[TESTING.md](docs/TESTING.md)** - Estratégia de testes

## 🧪 Testes

```bash
# Rodar todos os testes
npm test

# Com coverage
npm run test:coverage

# Testes específicos
npm run test:unit
npm run test:integration

# Watch mode
npm run test:watch
```

## 📦 Deploy

```bash
# Deploy para AWS (staging)
npm run deploy:staging

# Deploy para produção
npm run deploy:prod

# Ver logs
npm run logs
```

## 🐳 Docker

```bash
# Build
docker build -f docker/Dockerfile -t whatsapp-calendar .

# Run local
docker-compose -f docker/docker-compose.yml up

# Deploy para ECR
npm run docker:push
```

## 💡 Como Funciona

### Fluxo Básico

1. **Mensagem chega no WhatsApp**
   ```
   "Próxima segunda 14h, reunião com João sobre projeto X"
   ```

2. **Evolution API envia webhook**
   ```json
   POST /api/webhooks/whatsapp
   {
     "from": "55119999999",
     "message": "Próxima segunda 14h, reunião com João sobre projeto X"
   }
   ```

3. **Lambda processa**
   - Armazena em DynamoDB
   - Envia para Claude com instrução especial

4. **Claude entende**
   - Extrai: data, hora, título, duração
   - Chama Google Calendar API
   - Retorna confirmação

5. **Evento criado**
   - Salvo em Google Calendar
   - Status atualizado em DynamoDB
   - Confirmação enviada ao WhatsApp

### Exemplo de Prompt para Claude

```
Você é um assistente de agendamento inteligente.

Dada uma mensagem de texto, extraia as informações de evento:
- Título do evento
- Data e hora
- Duração (padrão: 1 hora)
- Descrição

Formato de resposta: JSON

Mensagem: "Próxima segunda 14h reunião com João"

Responda com JSON estruturado e chame a função 'createCalendarEvent' com os dados.
```

## 🎯 Roadmap

- [x] Sistema base (Lambda + Claude + Calendar)
- [x] DynamoDB integrado
- [x] API REST
- [x] Testes automatizados
- [x] Docker
- [ ] Painel Web (React)
- [ ] GraphQL (fase 2)
- [ ] Webhooks avançados
- [ ] Machine Learning para melhor detecção

## 🐛 Troubleshooting

### Lambda não conecta em Google Calendar
→ Verificar credenciais e permissões IAM

### Mensagem não chega
→ Verificar logs em CloudWatch: `npm run logs`

### Testes falhando
→ Rodar `npm install` e verificar .env

Veja mais em [DEPLOYMENT.md](docs/DEPLOYMENT.md)

## 📞 Suporte

Para issues ou dúvidas, abra uma issue no repositório.

## 📄 Licença

MIT

---

**Desenvolvido para escala e produção** 🚀
