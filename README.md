<p align="right">
  <a href="README.pt-BR.md">Português</a> | <a href="README.md">English</a>
</p>

# WhatsApp → Claude → Google Calendar System

**Serverless WhatsApp scheduling assistant powered by Claude AI and Google Calendar**

## 🎯 Overview

```
WhatsApp (Evolution API) → AWS Lambda → Claude AI → Google Calendar
                                  ↓
                              DynamoDB
```

A natural-language message arrives via WhatsApp, Claude extracts the event
title, date, time and duration, and the event is created automatically on
Google Calendar. Message and event history is persisted in DynamoDB.

## ✨ Features

- ✅ Real-time WhatsApp message processing (webhook)
- ✅ AI (Claude) understanding context and extracting event data
- ✅ Automatic Google Calendar event creation
- ✅ Message and event history in DynamoDB
- ✅ Unit tests (Jest)
- ✅ Docker-ready
- ✅ Structured logging (Pino) and monitoring (CloudWatch)

## 🚀 Quick Start

```bash
# 1. Clone and setup
git clone https://github.com/marcelomds/whatsnext.git
cd whatsnext
npm install

# 2. Configure environment variables
cp .env.example .env
# Edit .env with your credentials

# 3. Run tests
npm test

# 4. Start locally (Serverless Offline)
npm run dev

# 5. Deploy to AWS
npm run deploy:staging
```

Full step-by-step guide: [docs/SETUP.md](docs/SETUP.md).

## 📁 Project Structure

```
whatsnext/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── handlers/
│   │   │   │   └── whatsapp-handler.js   (Lambda entry point)
│   │   │   ├── services/
│   │   │   │   ├── claude.service.js     (Claude integration)
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
│   └── frontend/                          (work in progress)
├── docs/
│   ├── ARCHITECTURE.md
│   ├── SETUP.md
│   └── PROMPTS.md
├── package.json
└── .env.example
```

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Serverless** | AWS Lambda |
| **Database** | DynamoDB |
| **API** | API Gateway (REST) |
| **AI** | Claude API (Anthropic) |
| **Google Calendar** | Official Google Calendar API |
| **WhatsApp** | Evolution API |
| **Language** | Node.js 18+ |
| **Lambda Framework** | Serverless Framework |
| **Testing** | Jest |
| **Containerization** | Docker |

## 📊 Full Architecture

See details in [ARCHITECTURE.md](docs/ARCHITECTURE.md)

## 🔐 Security

- ✅ Environment variables (`.env` never committed — see `.gitignore`)
- ✅ Per-Lambda IAM roles
- ✅ Encryption in transit (HTTPS)
- ✅ Input validation
- ✅ Error handling without exposing sensitive data

## 📖 Documentation

- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Architecture overview
- **[SETUP.md](docs/SETUP.md)** - Full step-by-step setup
- **[PROMPTS.md](docs/PROMPTS.md)** - Prompts used with Claude (critical!)

## 🧪 Tests

```bash
npm test               # All tests
npm run test:coverage  # With coverage
npm run test:watch     # Watch mode
```

## 📦 Deploy

```bash
npm run deploy:staging   # Deploy to staging
npm run deploy:prod      # Deploy to production
npm run logs:staging     # View logs
```

## 💡 How It Works

1. **Message arrives on WhatsApp**
   ```
   "Next Monday 2pm, meeting with John about project X"
   ```

2. **Evolution API sends webhook**
   ```json
   POST /api/webhooks/whatsapp
   {
     "from": "5511999999999",
     "message": "Next Monday 2pm, meeting with John about project X"
   }
   ```

3. **Lambda processes it**
   - Stores the message in DynamoDB
   - Sends it to Claude along with recent history

4. **Claude extracts the event**
   - Title, date, time, duration
   - Asks for clarification when information is missing

5. **Event is created**
   - Saved to Google Calendar
   - Status updated in DynamoDB
   - Confirmation sent back on WhatsApp

## 🎯 Roadmap

- [x] Base system (Lambda + Claude + Calendar)
- [x] DynamoDB integration
- [x] REST API
- [x] Automated tests
- [x] Docker
- [ ] Web dashboard (frontend)
- [ ] Advanced webhooks
- [ ] Recurring events support

## 🐛 Troubleshooting

See the troubleshooting section in [docs/SETUP.md](docs/SETUP.md#-troubleshooting).

## 📄 License

MIT
