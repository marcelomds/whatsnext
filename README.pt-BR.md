<p align="right">
  <a href="README.pt-BR.md">Português</a> | <a href="README.md">English</a>
</p>

# WhatsNext

[![CI](https://github.com/marcelomds/whatsnext/actions/workflows/ci.yml/badge.svg)](https://github.com/marcelomds/whatsnext/actions/workflows/ci.yml)

**Assistente de agendamento via WhatsApp usando Claude AI e Google Calendar — rodando de verdade na AWS.**

Manda uma mensagem tipo *"Segunda 14h reunião com João"* pro número conectado, e o
evento aparece sozinho no Google Agenda. Sem app, sem comando de bot — só linguagem
natural.

<p align="center">
  <img src="docs/assets/architecture.svg" alt="Fluxo da mensagem: WhatsApp para Evolution API para AWS Lambda, que chama o Claude para extrair o evento, depois Google Calendar e DynamoDB, com a confirmação voltando pro WhatsApp" width="820">
</p>

## ✨ Features

- ✅ Número real de WhatsApp, conectado via QR code direto do painel web (Evolution API)
- ✅ Mensagem em linguagem natural → Claude extrai título, data, hora e duração
- ✅ Evento criado automaticamente no Google Calendar, confirmação enviada de volta no WhatsApp
- ✅ Trata mensagens casuais/sem relação com agendamento sem travar (pede esclarecimento)
- ✅ Autenticação JWT (registro/login) — cada conta tem sua própria instância WhatsApp
- ✅ Painel web (React + TypeScript) — conectar/desconectar WhatsApp, ver mensagens e eventos
- ✅ Deploy real na AWS (Lambda + API Gateway + DynamoDB), não só local
- ✅ Stack de dev local via Docker Compose (DynamoDB Local + admin UI)
- ✅ CI em todo push (testes do backend + build do frontend)

## 🚀 Quick Start (local)

```bash
# 1. Clonar e instalar
git clone https://github.com/marcelomds/whatsnext.git
cd whatsnext
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# preencha o .env com suas credenciais (veja docs/SETUP.md pra saber como conseguir cada uma)

# 3. Subir DynamoDB local + admin UI
docker compose up -d dynamodb-local dynamodb-admin
node scripts/create-dynamodb-tables.js

# 4. Rodar testes
npm test

# 5. Subir o backend (Serverless Offline)
npm run dev

# 6. Subir o painel
cd apps/frontend && cp .env.example .env && npm install && npm run dev
```

Passo a passo completo: [docs/SETUP.md](docs/SETUP.md).

## 📁 Estrutura do Projeto

```
whatsnext/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── handlers/
│   │   │   │   └── whatsapp-handler.js      (entry points das Lambdas)
│   │   │   ├── controllers/
│   │   │   │   ├── auth.controller.js       (register/login/me)
│   │   │   │   ├── instance.controller.js   (connect/status/disconnect)
│   │   │   │   ├── messages.controller.js
│   │   │   │   └── events.controller.js
│   │   │   ├── services/
│   │   │   │   ├── claude.service.js        (integração Claude)
│   │   │   │   ├── calendar.service.js      (Google Calendar)
│   │   │   │   ├── whatsapp.service.js      (Evolution API)
│   │   │   │   ├── dynamodb.service.js      (banco de dados)
│   │   │   │   └── auth.service.js          (JWT + bcrypt)
│   │   │   └── utils/
│   │   │       ├── with-auth.js             (guarda JWT pros handlers Lambda)
│   │   │       ├── evolution-payload.js     (parseia o formato real do webhook)
│   │   │       ├── logger.js
│   │   │       ├── error-handler.js
│   │   │       └── validators.js
│   │   ├── package.json                     (deps de runtime só do backend — deploy fica pequeno)
│   │   ├── docker/Dockerfile
│   │   └── serverless.yml
│   └── frontend/                            (React + TypeScript + Tailwind)
│       └── src/
│           ├── services/                    (wrapper de fetch tipado por recurso da API)
│           ├── hooks/                       (useAuth, useEvents, useConnectInstance...)
│           ├── contexts/                    (AuthContext/AuthProvider)
│           └── features/
│               ├── auth/                    (LoginScreen, RegisterScreen)
│               ├── dashboard/                (tabelas de mensagens/eventos)
│               └── connect/                 (pareamento por QR, desconectar)
├── api/                                     (adapter pra Vercel Functions — deploy alternativo)
├── scripts/
│   ├── create-dynamodb-tables.js
│   └── get-google-token.js
├── docs/
│   ├── SETUP.md
│   ├── PROMPTS.md
│   └── assets/architecture.svg
├── docker-compose.yml                       (DynamoDB Local + admin UI + api, pra dev local)
├── package.json
└── .env.example
```

## 🔧 Tech Stack

| Camada | Tecnologia |
|--------|-----------|
| **Serverless** | AWS Lambda + API Gateway (Serverless Framework) |
| **Banco de dados** | DynamoDB |
| **Autenticação** | JWT (jsonwebtoken) + bcrypt |
| **IA** | Claude API (Anthropic) — Haiku por padrão |
| **Calendário** | Google Calendar API (OAuth2) |
| **WhatsApp** | Evolution API |
| **Linguagem backend** | Node.js 18 |
| **Frontend** | React 19 + TypeScript + Vite + Tailwind CSS v4 |
| **Testes** | Jest |
| **Dev local** | Docker Compose |
| **CI** | GitHub Actions (testes backend + build frontend) |

## 🔌 API

| Método | Rota | Auth | Pra que serve |
|--------|------|------|----------------|
| POST | `/api/auth/register` | – | Cria conta (gera nome de instância Evolution automaticamente) |
| POST | `/api/auth/login` | – | Retorna um JWT |
| GET | `/api/auth/me` | JWT | Usuário autenticado |
| POST | `/api/instance/connect` | JWT | Cria/reconecta sua instância WhatsApp, retorna QR code |
| GET | `/api/instance/status` | JWT | Estado da conexão (`open`, `connecting`, `close`) |
| POST | `/api/instance/disconnect` | JWT | Desconecta a instância WhatsApp |
| POST | `/api/webhooks/whatsapp` | – (chamado pela Evolution) | Onde as mensagens do WhatsApp chegam |
| GET | `/api/messages?phoneNumber=` | – | Histórico de mensagens de um número |
| GET | `/api/events` | – | Eventos criados |
| GET | `/health` | – | Health check |

## 💡 Como Funciona

1. **Mensagem chega no WhatsApp** — *"Segunda 14h reunião com João"*
2. **Evolution API chama o webhook** com o formato real do payload (`{event, instance, data: {key, message, messageTimestamp}}`); ecos das nossas próprias respostas e mensagens de grupo são filtrados antes de qualquer processamento
3. **Lambda armazena a mensagem** no DynamoDB, depois manda o texto (junto com histórico recente) pro Claude
4. **Claude extrai o evento** — título, data, hora, duração — ou pede esclarecimento se faltar informação
5. **Evento é criado** no Google Calendar, status atualizado no DynamoDB, e confirmação enviada de volta no WhatsApp

## 🔐 Segurança

- `.env` / `.env.production` nunca commitados (veja `.gitignore`)
- Senhas com hash bcrypt, sessões são JWT stateless (expira em 30 dias)
- IAM roles por Lambda, restritas exatamente às tabelas/índices DynamoDB que cada uma usa
- Validação de entrada (Joi) em toda mensagem recebida

## 📦 Deploy

O backend faz deploy real na AWS via Serverless Framework. Produção usa um
`.env.production` separado (nunca o `.env` local — ele aponta pro DynamoDB local
e quebraria na nuvem):

```bash
npm run deploy:prod      # deploy na AWS
npm run logs:prod        # acompanha logs do CloudWatch
npm run status:prod      # info do stack / URLs dos endpoints
npm run remove:prod      # remove o stack
```

Existe também um adapter alternativo pra Vercel Functions em `/api` (veja
`vercel.json`), caso prefira fazer deploy lá em vez da AWS — mesmos controllers,
só o ponto de entrada é mais fino.

## 🧪 Testes

```bash
npm test               # backend (Jest)
cd apps/frontend && npm run build   # type-check + build do frontend
```

## 🎯 Roadmap

- [x] Pipeline principal (WhatsApp → Claude → Calendar)
- [x] Persistência no DynamoDB
- [x] Autenticação JWT, instância WhatsApp por usuário
- [x] Painel web (conectar/dashboard)
- [x] Deploy real na AWS, testado ponta a ponta
- [ ] Transcrição de mensagens de áudio
- [ ] Suporte a grupos
- [ ] Eventos recorrentes

## 🐛 Troubleshooting

Veja [docs/SETUP.md](docs/SETUP.md#-troubleshooting).

## 📄 Licença

MIT
