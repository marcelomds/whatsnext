<p align="right">
  <a href="README.pt-BR.md">Português</a> | <a href="README.md">English</a>
</p>

# WhatsNext

[![CI](https://github.com/marcelomds/whatsnext/actions/workflows/ci.yml/badge.svg)](https://github.com/marcelomds/whatsnext/actions/workflows/ci.yml)

**Serverless WhatsApp scheduling assistant powered by Claude AI and Google Calendar — running live on AWS.**

Send a message like *"Next Monday 2pm, meeting with John"* to a connected WhatsApp
number, and it shows up on Google Calendar automatically. No app, no bot commands —
just natural language.

<p align="center">
  <img src="docs/assets/architecture.svg" alt="Message flow: WhatsApp to Evolution API to AWS Lambda, which calls Claude to extract the event, then Google Calendar and DynamoDB, with the confirmation flowing back to WhatsApp" width="820">
</p>

## ✨ Features

- ✅ Real WhatsApp number, connected via QR code from the web panel (Evolution API)
- ✅ Natural-language message → Claude extracts title, date, time and duration
- ✅ Event created automatically on Google Calendar, confirmation sent back on WhatsApp
- ✅ Handles casual/unrelated messages gracefully (asks for clarification instead of erroring)
- ✅ JWT auth (register/login) — each account owns its own WhatsApp instance
- ✅ Web panel (React + TypeScript) — connect/disconnect WhatsApp, browse messages and events
- ✅ Deployed for real on AWS (Lambda + API Gateway + DynamoDB), not just local
- ✅ Local dev stack via Docker Compose (DynamoDB Local + admin UI)
- ✅ CI on every push (backend tests + frontend build)

## 🚀 Quick Start (local)

```bash
# 1. Clone and install
git clone https://github.com/marcelomds/whatsnext.git
cd whatsnext
npm install

# 2. Configure environment variables
cp .env.example .env
# fill in .env with your credentials (see docs/SETUP.md for how to get each one)

# 3. Start local DynamoDB + admin UI
docker compose up -d dynamodb-local dynamodb-admin
node scripts/create-dynamodb-tables.js

# 4. Run tests
npm test

# 5. Start the backend (Serverless Offline)
npm run dev

# 6. Start the panel
cd apps/frontend && cp .env.example .env && npm install && npm run dev
```

Full step-by-step guide: [docs/SETUP.md](docs/SETUP.md).

## 📁 Project Structure

```
whatsnext/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── handlers/
│   │   │   │   └── whatsapp-handler.js      (Lambda entry points)
│   │   │   ├── controllers/
│   │   │   │   ├── auth.controller.js       (register/login/me)
│   │   │   │   ├── instance.controller.js   (connect/status/disconnect)
│   │   │   │   ├── messages.controller.js
│   │   │   │   └── events.controller.js
│   │   │   ├── services/
│   │   │   │   ├── claude.service.js        (Claude integration)
│   │   │   │   ├── calendar.service.js      (Google Calendar)
│   │   │   │   ├── whatsapp.service.js      (Evolution API)
│   │   │   │   ├── dynamodb.service.js      (Database)
│   │   │   │   └── auth.service.js          (JWT + bcrypt)
│   │   │   └── utils/
│   │   │       ├── with-auth.js             (JWT guard for Lambda handlers)
│   │   │       ├── evolution-payload.js     (parses the real webhook shape)
│   │   │       ├── logger.js
│   │   │       ├── error-handler.js
│   │   │       └── validators.js
│   │   ├── package.json                     (backend's own runtime deps — deploy stays small)
│   │   ├── docker/Dockerfile
│   │   └── serverless.yml
│   └── frontend/                            (React + TypeScript + Tailwind)
│       └── src/
│           ├── services/                    (typed fetch wrapper per API resource)
│           ├── hooks/                       (useAuth, useEvents, useConnectInstance...)
│           ├── contexts/                    (AuthContext/AuthProvider)
│           └── features/
│               ├── auth/                    (LoginScreen, RegisterScreen)
│               ├── dashboard/                (messages/events tables)
│               └── connect/                 (QR pairing, disconnect)
├── api/                                     (Vercel adapter — alternate deploy target)
├── scripts/
│   ├── create-dynamodb-tables.js
│   └── get-google-token.js
├── docs/
│   ├── SETUP.md
│   ├── PROMPTS.md
│   └── assets/architecture.svg
├── docker-compose.yml                       (DynamoDB Local + admin UI + api, for local dev)
├── package.json
└── .env.example
```

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Serverless** | AWS Lambda + API Gateway (Serverless Framework) |
| **Database** | DynamoDB |
| **Auth** | JWT (jsonwebtoken) + bcrypt |
| **AI** | Claude API (Anthropic) — Haiku by default |
| **Calendar** | Google Calendar API (OAuth2) |
| **WhatsApp** | Evolution API |
| **Backend language** | Node.js 18 |
| **Frontend** | React 19 + TypeScript + Vite + Tailwind CSS v4 |
| **Testing** | Jest |
| **Local dev** | Docker Compose |
| **CI** | GitHub Actions (backend tests + frontend build) |

## 🔌 API

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/register` | – | Create an account (auto-generates an Evolution instance name) |
| POST | `/api/auth/login` | – | Get a JWT |
| GET | `/api/auth/me` | JWT | Current user |
| POST | `/api/instance/connect` | JWT | Create/reconnect your WhatsApp instance, get a QR code |
| GET | `/api/instance/status` | JWT | Connection state (`open`, `connecting`, `close`) |
| POST | `/api/instance/disconnect` | JWT | Log out the WhatsApp instance |
| POST | `/api/webhooks/whatsapp` | – (called by Evolution) | Where incoming WhatsApp messages land |
| GET | `/api/messages?phoneNumber=` | – | Message history for a number |
| GET | `/api/events` | – | Created calendar events |
| GET | `/health` | – | Health check |

## 💡 How It Works

1. **Message arrives on WhatsApp** — *"Next Monday 2pm, meeting with John"*
2. **Evolution API calls the webhook** with the real payload shape (`{event, instance, data: {key, message, messageTimestamp}}`); echoes of our own replies and group chats are filtered out before anything else runs
3. **Lambda stores the message** in DynamoDB, then sends the text (plus recent history) to Claude
4. **Claude extracts the event** — title, date, time, duration — or asks a clarifying question if there isn't enough information
5. **Event gets created** on Google Calendar, status is updated in DynamoDB, and a confirmation is sent back on WhatsApp

## 🔐 Security

- `.env` / `.env.production` never committed (see `.gitignore`)
- Passwords hashed with bcrypt, sessions are stateless JWTs (30-day expiry)
- Per-Lambda IAM roles scoped to the exact DynamoDB tables/indexes they use
- Input validation (Joi) on every incoming message

## 📦 Deploy

The backend deploys to AWS for real via Serverless Framework. Production uses a
separate `.env.production` (never the local `.env` — it points at DynamoDB Local
and would break in the cloud):

```bash
npm run deploy:prod      # deploy to AWS
npm run logs:prod        # tail CloudWatch logs
npm run status:prod      # stack info / endpoint URLs
npm run remove:prod      # tear the stack down
```

An alternate adapter for Vercel Functions lives in `/api` (see `vercel.json`) if
you'd rather deploy there instead of AWS — same controllers, thinner entry points.

## 🧪 Tests

```bash
npm test               # backend (Jest)
cd apps/frontend && npm run build   # frontend type-check + build
```

## 🎯 Roadmap

- [x] Core pipeline (WhatsApp → Claude → Calendar)
- [x] DynamoDB persistence
- [x] JWT auth, per-user WhatsApp instance
- [x] Web panel (connect/dashboard)
- [x] Real AWS deploy, tested end-to-end
- [ ] Audio message transcription
- [ ] Group chat support
- [ ] Recurring events

## 🐛 Troubleshooting

See [docs/SETUP.md](docs/SETUP.md#-troubleshooting).

## 📄 License

MIT
