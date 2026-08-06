<p align="right">
  <a href="README.pt-BR.md">Português</a> | <a href="README.md">English</a>
</p>

# WhatsApp → Claude → Google Calendar System

[![CI](https://github.com/marcelomds/whatsnext/actions/workflows/ci.yml/badge.svg)](https://github.com/marcelomds/whatsnext/actions/workflows/ci.yml)

**Sistema inteligente de agendamento via WhatsApp usando Claude AI e Google Calendar**

## 🎯 Visão Geral

```
WhatsApp (Evolution API) → AWS Lambda → Claude AI → Google Calendar
                                  ↓
                              DynamoDB
```

Mensagem em linguagem natural chega via WhatsApp, o Claude extrai título, data,
hora e duração do evento, e o evento é criado automaticamente no Google Calendar.
Todo o histórico de mensagens e eventos fica registrado no DynamoDB.

## ✨ Features

- ✅ Processamento de mensagens WhatsApp em tempo real (webhook)
- ✅ IA (Claude) entendendo contexto e extraindo eventos
- ✅ Criação automática de eventos no Google Calendar
- ✅ Histórico de mensagens e eventos em DynamoDB
- ✅ Testes unitários (Jest)
- ✅ Docker pronto para deploy
- ✅ Logging estruturado (Pino) e monitoramento (CloudWatch)

## 🚀 Quick Start

```bash
# 1. Clone e setup
git clone https://github.com/marcelomds/whatsnext.git
cd whatsnext
npm install

# 2. Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais

# 3. Rode testes
npm test

# 4. Inicie localmente (Serverless Offline)
npm run dev

# 5. Deploy na AWS
npm run deploy:staging
```

Veja o passo a passo completo em [docs/SETUP.md](docs/SETUP.md).

## 📁 Estrutura do Projeto

```
whatsnext/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── handlers/
│   │   │   │   └── whatsapp-handler.js   (Lambda entry point)
│   │   │   ├── services/
│   │   │   │   ├── claude.service.js     (Integração Claude)
│   │   │   │   ├── calendar.service.js   (Google Calendar)
│   │   │   │   ├── whatsapp.service.js   (Evolution API)
│   │   │   │   └── dynamodb.service.js   (Database)
│   │   │   └── utils/
│   │   │       ├── logger.js
│   │   │       ├── error-handler.js
│   │   │       └── validators.js
│   │   ├── docker/
│   │   │   └── Dockerfile
│   │   └── serverless.yml
│   └── frontend/                          (em construção)
├── docs/
│   ├── ARCHITECTURE.md
│   ├── SETUP.md
│   └── PROMPTS.md
├── package.json
└── .env.example
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
| **Testing** | Jest |
| **Containerização** | Docker |

## 📊 Arquitetura Completa

Veja em detalhes: [ARCHITECTURE.md](docs/ARCHITECTURE.md)

## 🔐 Segurança

- ✅ Variáveis de ambiente (`.env` nunca commitado — veja `.gitignore`)
- ✅ IAM roles específicos por Lambda
- ✅ Encriptação em trânsito (HTTPS)
- ✅ Input validation
- ✅ Error handling sem exposição de dados sensíveis

## 📖 Documentação

- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Visão geral da arquitetura
- **[SETUP.md](docs/SETUP.md)** - Setup completo passo a passo
- **[PROMPTS.md](docs/PROMPTS.md)** - Prompts usados com o Claude (crítico!)

## 🧪 Testes

```bash
npm test               # Todos os testes
npm run test:coverage  # Com coverage
npm run test:watch     # Watch mode
```

## 📦 Deploy

```bash
npm run deploy:staging   # Deploy para staging
npm run deploy:prod      # Deploy para produção
npm run logs:staging     # Ver logs
```

## 💡 Como Funciona

1. **Mensagem chega no WhatsApp**
   ```
   "Próxima segunda 14h, reunião com João sobre projeto X"
   ```

2. **Evolution API envia webhook**
   ```json
   POST /api/webhooks/whatsapp
   {
     "from": "5511999999999",
     "message": "Próxima segunda 14h, reunião com João sobre projeto X"
   }
   ```

3. **Lambda processa**
   - Armazena mensagem em DynamoDB
   - Envia para o Claude com o histórico recente

4. **Claude extrai o evento**
   - Título, data, hora, duração
   - Pede esclarecimento se faltar informação

5. **Evento é criado**
   - Salvo no Google Calendar
   - Status atualizado em DynamoDB
   - Confirmação enviada de volta ao WhatsApp

## 🎯 Roadmap

- [x] Sistema base (Lambda + Claude + Calendar)
- [x] DynamoDB integrado
- [x] API REST
- [x] Testes automatizados
- [x] Docker
- [ ] Painel Web (frontend)
- [ ] Webhooks avançados
- [ ] Suporte a recorrência de eventos

## 🐛 Troubleshooting

Veja a seção de troubleshooting em [docs/SETUP.md](docs/SETUP.md#-troubleshooting).

## 📄 Licença

MIT
