# Arquitetura do Sistema

## 🏗️ Visão Geral

Este documento descreve a arquitetura completa do sistema de agendamento via WhatsApp.

```
┌─────────────────────────────────────────────────────────────────┐
│                         EXTERNOS                                │
├─────────────────────────────────────────────────────────────────┤
│  WhatsApp        Google Calendar        Claude API              │
│  (Evolution)     (Official API)         (Anthropic)             │
└────────┬──────────────────┬──────────────────┬──────────────────┘
         │                  │                  │
         │ webhook          │ OAuth2           │ API
         │                  │                  │
         ↓                  ↓                  ↓
┌────────────────────────────────────────────────────────────────┐
│                    AWS (Sua conta)                             │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │           API Gateway (REST)                        │    │
│  │  POST /api/webhooks/whatsapp                        │    │
│  │  GET  /api/messages                                 │    │
│  │  GET  /api/events                                   │    │
│  └──────────────────────────────────────────────────────┘    │
│                           │                                  │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐    │
│  │         Lambda (Serverless Functions)               │    │
│  ├──────────────────────────────────────────────────────┤    │
│  │  handleWhatsappWebhook                              │    │
│  │     - Parse mensagem (formato real Evolution API)   │    │
│  │     - Se for áudio, transcreve via Whisper primeiro │    │
│  │     - Valida dados, confere AUTHORIZED_PHONE_NUMBER │    │
│  │     - Envia ao Claude, cria evento no Calendar      │    │
│  │                                                      │    │
│  │  getMessages / getEvents                            │    │
│  │     - Query DynamoDB, retorna paginado              │    │
│  │                                                      │    │
│  │  register / login / me                              │    │
│  │     - Auth JWT (bcrypt + jsonwebtoken)               │    │
│  │                                                      │    │
│  │  connectInstance / disconnectInstance /             │    │
│  │  getInstanceStatus                                   │    │
│  │     - Gerencia a instância WhatsApp (Evolution API)  │    │
│  │                                                      │    │
│  │  healthCheck                                         │    │
│  │     - Status de DynamoDB, Claude, Google Calendar    │    │
│  └──────────────────────────────────────────────────────┘    │
│                           │                                  │
│              ┌────────────┴────────────┐                     │
│              ↓                         ↓                     │
│  ┌───────────────────────┐  ┌──────────────────────────┐    │
│  │  OpenAI (Whisper)     │  │  DynamoDB (NoSQL)         │    │
│  │  transcrição de áudio │  ├──────────────────────────┤    │
│  └───────────────────────┘  │  Table: messages          │    │
│                              │  - messageId (PK)         │    │
│                              │  - timestamp (SK)         │    │
│                              │  - phoneNumber            │    │
│                              │  - content                │    │
│                              │  - status                 │    │
│                              │  - claudeResponse          │    │
│                              │  - eventId (FK)            │    │
│                              │                            │    │
│                              │  Table: events             │    │
│                              │  - eventId (PK)            │    │
│                              │  - timestamp (SK)          │    │
│                              │  - title, startTime,       │    │
│                              │    endTime                 │    │
│                              │  - googleCalendarId        │    │
│                              │  - status                  │    │
│                              │  - messageId (FK)          │    │
│                              │                            │    │
│                              │  Table: users               │    │
│                              │  - userId (PK)              │    │
│                              │  - email (GSI)               │    │
│                              │  - passwordHash (bcrypt)     │    │
│                              │  - evolutionInstance          │    │
│                              │                                │    │
│                              │  Table: audit_logs             │    │
│                              │  - logId (PK)                  │    │
│                              │  - timestamp (SK)              │    │
│                              │  - action, details              │    │
│                              └──────────────────────────┘    │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  CloudWatch (Logs & Monitoring)                     │    │
│  │  - Lambda execution logs                            │    │
│  │  - Errors e warnings                                │    │
│  │  - Performance metrics                              │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
         │
         ↓
┌────────────────────────────────────────────────────────────────┐
│  Frontend (React + TypeScript + Vite + Tailwind)               │
│  Deployado: S3 (privado) + CloudFront (HTTPS)                  │
├────────────────────────────────────────────────────────────────┤
│  - Login/registro (JWT)                                        │
│  - Conectar WhatsApp (QR code)                                 │
│  - Lista de eventos + visão de calendário mensal                │
│  - Card de próximo evento em destaque                           │
│  - i18n EN/PT                                                   │
└────────────────────────────────────────────────────────────────┘
```

## 🔄 Fluxo de Dados Detalhado

### 1. Recebimento de Mensagem WhatsApp

```
User (WhatsApp)
     │
     ├─→ Evolution API
     │
     ├─→ Webhook POST /api/webhooks/whatsapp
     │
     ├─→ API Gateway
     │
     └─→ Lambda: handleWhatsappWebhook
         │
         ├─→ Parse do payload real da Evolution
         │   ({event, instance, data: {key, message, messageTimestamp}})
         ├─→ Confere remetente contra AUTHORIZED_PHONE_NUMBER
         ├─→ Validação de schema (Joi)
         ├─→ Armazena em DynamoDB (messages table)
         │
         └─→ Retorna 200 OK para Evolution
             (confirmação rápida)
```

### 1.5. Transcrição de Áudio (se a mensagem for um áudio)

```
Mensagem de voz (body.audio)
     │
     ├─→ WhatsAppService.getMediaBase64(key)
     │   (baixa o áudio via Evolution API)
     │
     ├─→ TranscriptionService.transcribeAudio(base64, mimetype)
     │   (OpenAI Whisper)
     │
     └─→ Texto transcrito substitui body.message
         e segue o fluxo normal (igual mensagem de texto)
```

### 2. Processamento com Claude

```
Lambda: handleWhatsappWebhook
     │
     ├─→ Recupera contexto de mensagens anteriores
     │
     ├─→ Chama Claude API com:
     │   - Mensagem do usuário
     │   - Histórico (últimas 5 msgs)
     │   - System prompt (PROMPTS.md)
     │   - Tools disponíveis (createCalendarEvent)
     │
     └─→ Claude responde com:
         ├─→ Texto (entendimento natural)
         ├─→ Tool Call (createCalendarEvent)
         │   └─→ { title, date, time, duration }
         │
         └─→ Armazena resposta em DynamoDB
```

### 3. Criação de Evento no Google Calendar

```
Claude Response (Tool Call)
     │
     ├─→ Lambda: processCalendarEvent
     │
     ├─→ Autentica com Google Calendar (OAuth2)
     │
     ├─→ POST /calendar/v3/calendars/.../events
     │   {
     │     "summary": "Reunião com João",
     │     "start": { "dateTime": "2024-01-15T14:00:00" },
     │     "end": { "dateTime": "2024-01-15T15:00:00" },
     │     "description": "Criado via WhatsApp"
     │   }
     │
     ├─→ Google Calendar retorna eventId
     │
     ├─→ Atualiza DynamoDB (events table)
     │   - status: "created"
     │   - googleCalendarId: "abc123xyz"
     │
     └─→ Envia confirmação ao WhatsApp
         "✅ Evento 'Reunião com João' criado para 15/01 às 14h"
```

### 4. Query de Histórico (Dashboard)

```
Frontend (Painel)
     │
     ├─→ GET /api/messages?limit=50&offset=0
     │
     ├─→ API Gateway
     │
     ├─→ Lambda: getMessages
     │
     ├─→ Query DynamoDB
     │   - Table: messages
     │   - Sort by timestamp DESC
     │   - Pagination
     │
     ├─→ Enriquece com dados de eventos (JOIN)
     │
     └─→ Retorna JSON paginado
```

## 📊 Padrões de Design

### 1. Service Layer Pattern

```typescript
// Separação de responsabilidades
services/
  ├── claude.service.ts        // Lógica de integração Claude
  ├── calendar.service.ts      // Lógica de Google Calendar
  ├── whatsapp.service.ts      // Lógica de Evolution API
  ├── dynamodb.service.ts      // Lógica de banco de dados
  ├── auth.service.ts          // JWT + bcrypt
  └── transcription.service.ts // OpenAI Whisper
```

### 2. Error Handling com Retry

```javascript
// Implementação de exponential backoff
async function executeWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### 3. Logging Estruturado

```javascript
// Logs consistentes com contexto
logger.info('event_created', {
  messageId: 'msg_123',
  eventId: 'evt_456',
  title: 'Reunião com João',
  duration: 60,
  timestamp: new Date().toISOString()
});
```

## 🔐 Segurança

### Autenticação & Autorização

| Serviço | Método | Armazenamento (real, hoje) |
|---------|--------|---------------|
| **Evolution API** | API Key | Variável de ambiente da Lambda (`serverless.yml` → `${env:X}`) |
| **Google Calendar** | OAuth2 (refresh token) | Variável de ambiente da Lambda |
| **Claude API** | API Key | Variável de ambiente da Lambda |
| **OpenAI (Whisper)** | API Key | Variável de ambiente da Lambda |

AWS Secrets Manager: as IAM roles têm permissão `secretsmanager:GetSecretValue`
(ver `serverless.yml`), mas nenhum serviço lê de lá hoje — é capacidade
disponível, não usada em runtime. As variáveis de ambiente em si só existem
fora do código local (`.env.production`, nunca commitado) e nos GitHub
Secrets usados pelo deploy automático.

### Validação de Dados

```javascript
// Schema validation em cada entrada
const messageSchema = {
  from: { type: 'string', pattern: '^[0-9]{10,15}$' },
  message: { type: 'string', maxLength: 4096 },
  timestamp: { type: 'number' }
};
```

### Rate Limiting

Pendente — `RATE_LIMIT_WINDOW_MS` e `RATE_LIMIT_MAX_REQUESTS` existem no
`.env.example` e `RateLimitError` existe em `error-handler.ts`, mas nada no
código hoje lê essas variáveis ou aplica um limite de fato. Não tem
enforcement — qualquer freio de abuso hoje vem só de `AUTHORIZED_PHONE_NUMBER`
(ignora silenciosamente quem não é o dono do número).

## 📈 Escalabilidade

### Horizontal Scaling

- **Lambda**: Escalas automaticamente (concorrência até 1000)
- **DynamoDB**: On-demand ou provisioned capacity
- **API Gateway**: Escalas automaticamente
- **CloudWatch**: Sem limite de logs

### Otimizações

1. **Caching**: Claude responses em cache (30 min)
2. **Batch Processing**: Múltiplas mensagens em paralelo
3. **Connection Pooling**: Google Calendar client reutilizável
4. **Index Optimization**: DynamoDB GSI para queries frequentes

## 🔍 Monitoramento

### Métricas Importantes

```
- Latência P50, P95, P99 (CloudWatch)
- Taxa de erro por Lambda
- Número de eventos criados/hora
- Tempo de resposta Claude
- Falhas de autenticação
```

### Alertas

```yaml
- Lambda duration > 30s
- Error rate > 5%
- Claude API timeout
- Google Calendar quota exceeded
- DynamoDB throttling
```

## 💾 Backup & Disaster Recovery

Estado atual (`apps/backend/serverless.yml`):

```
DynamoDB:
  - TTL habilitado em messages (90 dias) e audit_logs (30 dias)
  - PITR: não configurado (não tem PointInTimeRecoverySpecification)
  - Backup automatizado / replicação cross-region: não configurado

Logs:
  - CloudWatch logs sem retenção configurada (fica "never expire" por padrão)
```

Pendências reais, não implementadas ainda: `PointInTimeRecoverySpecification`
nas tabelas e `provider.logRetentionInDays` no `serverless.yml`.

## 🚀 Deployment

### Ambientes

```
├── development
│   └── Lambda com logging verboso
├── staging
│   └── Replica exata de produção
└── production
    └── Código otimizado, monitoring ativo
```

### CI/CD

```
Push/PR → GitHub Actions (.github/workflows/ci.yml)
  ├─→ backend: testes Jest
  ├─→ frontend: testes Vitest + build
  └─→ (só push em main, depois que os dois acima passam)
      ├─→ deploy-backend: serverless deploy --stage prod
      └─→ deploy-frontend: build com VITE_API_URL de prod →
          sync no S3 → invalidação do CloudFront
```

Deploy é automático a cada push em `main` — veja a seção "CI/CD" no
[README](../README.md#-cicd) pra lista de secrets necessários.

## 📚 Tabelas DynamoDB Detalhadas

### Tabela: messages

```
Primary Key: messageId (HASH), timestamp (RANGE)

Atributos:
  - messageId: string (UUID)
  - timestamp: number (Unix timestamp)
  - phoneNumber: string (telefone completo)
  - content: string (texto da mensagem)
  - status: string (pending|processing|success|error)
  - claudeResponse: object (resposta do Claude)
  - eventId: string (FK para events, opcional)
  - errorMessage: string (se status=error)
  - retryCount: number
  - metadata: object {
      source: "whatsapp",
      userAgent: "...",
      ipAddress: "..."
    }

TTL: 90 dias (auto-delete)
```

### Tabela: events

```
Primary Key: eventId (HASH), timestamp (RANGE)

Atributos:
  - eventId: string (UUID)
  - timestamp: number (criação)
  - messageId: string (FK)
  - phoneNumber: string
  - title: string
  - description: string
  - startTime: string (ISO 8601)
  - endTime: string (ISO 8601)
  - duration: number (minutos)
  - googleCalendarId: string (calendar event ID)
  - status: string (pending|created|updated|deleted|error)
  - lastUpdated: number
  - metadata: object {
      createdVia: "whatsapp",
      confirmed: boolean,
      attendees: []
    }

GSI: phoneNumber-timestamp (para queries por usuário)
```

### Tabela: users

```
Primary Key: userId (HASH)

Atributos:
  - userId: string (UUID)
  - email: string
  - passwordHash: string (bcrypt)
  - name: string
  - evolutionInstance: string (nome da instância WhatsApp gerado no registro)
  - createdAt: number

GSI: email-index (para login por e-mail)
```

### Tabela: audit_logs

```
Primary Key: logId (HASH), timestamp (RANGE)

Atributos:
  - logId: string (UUID)
  - timestamp: number
  - action: string (message_received|event_created|error|etc)
  - actorId: string (phoneNumber ou sistema)
  - resourceId: string (messageId ou eventId)
  - details: object
  - statusCode: number

TTL: 30 dias
```

---

**Próximo**: [SETUP.md](SETUP.md) - Setup passo a passo
