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
│  │  1. handleWhatsappWebhook                           │    │
│  │     - Parse mensagem                                │    │
│  │     - Valida dados                                  │    │
│  │     - Envia ao Claude                               │    │
│  │                                                      │    │
│  │  2. processCalendarEvent                            │    │
│  │     - Claude retorna estrutura                      │    │
│  │     - Cria evento no Google Calendar                │    │
│  │     - Atualiza status em DynamoDB                   │    │
│  │                                                      │    │
│  │  3. getMessages                                     │    │
│  │     - Query DynamoDB                                │    │
│  │     - Retorna paginado                              │    │
│  │                                                      │    │
│  │  4. getEvents                                       │    │
│  │     - Query calendário + DB                         │    │
│  │     - Retorna histórico                             │    │
│  └──────────────────────────────────────────────────────┘    │
│                           │                                  │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  DynamoDB (NoSQL Database)                          │    │
│  ├──────────────────────────────────────────────────────┤    │
│  │  Table: messages                                    │    │
│  │  - messageId (PK)                                   │    │
│  │  - timestamp (SK)                                   │    │
│  │  - phoneNumber                                      │    │
│  │  - content                                          │    │
│  │  - status (pending, processing, success, error)    │    │
│  │  - claudeResponse                                   │    │
│  │  - eventId (FK)                                     │    │
│  │                                                      │    │
│  │  Table: events                                      │    │
│  │  - eventId (PK)                                     │    │
│  │  - timestamp (SK)                                   │    │
│  │  - title                                            │    │
│  │  - startTime                                        │    │
│  │  - endTime                                          │    │
│  │  - googleCalendarId                                 │    │
│  │  - status                                           │    │
│  │  - messageId (FK)                                   │    │
│  │                                                      │    │
│  │  Table: audit_logs                                 │    │
│  │  - logId (PK)                                       │    │
│  │  - timestamp (SK)                                   │    │
│  │  - action                                           │    │
│  │  - details                                          │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  CloudWatch (Logs & Monitoring)                     │    │
│  │  - Lambda execution logs                            │    │
│  │  - Errors e warnings                                │    │
│  │  - Performance metrics                              │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Secrets Manager (Credenciais seguras)              │    │
│  │  - Evolution API key                                │    │
│  │  - Google Calendar credentials                      │    │
│  │  - Claude API key                                   │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
         │
         ↓
┌────────────────────────────────────────────────────────────────┐
│            Frontend (Seu Painel - Fase 2)                     │
├────────────────────────────────────────────────────────────────┤
│  - React/Next.js                                              │
│  - Dashboard de mensagens                                     │
│  - Timeline de eventos                                        │
│  - Estatísticas                                               │
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
         ├─→ Parse JSON
         ├─→ Validação de schema
         ├─→ Armazena em DynamoDB (messages table)
         │
         └─→ Retorna 200 OK para Evolution
             (confirmação rápida)
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

```javascript
// Separação de responsabilidades
services/
  ├── claude.service.js     // Lógica de integração Claude
  ├── calendar.service.js   // Lógica de Google Calendar
  ├── whatsapp.service.js   // Lógica de Evolution API
  └── dynamodb.service.js   // Lógica de banco de dados
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

| Serviço | Método | Armazenamento |
|---------|--------|---------------|
| **Evolution API** | API Key | AWS Secrets Manager |
| **Google Calendar** | OAuth2 (JWT) | Token armazenado seguro |
| **Claude API** | API Key | AWS Secrets Manager |
| **API Gateway** | API Key (opcional) | IAM Roles |

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

```javascript
// Por telefone: máximo 10 mensagens/minuto
const rateLimiter = new RateLimiter({
  windowMs: 60000,
  maxRequests: 10,
  keyGenerator: (event) => event.from
});
```

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

```
DynamoDB:
  - Point-in-time recovery (PITR) habilitado
  - Backup diário automatizado
  - Replicação cross-region (opcional)

Logs:
  - CloudWatch logs com 30 dias de retenção
  - Export semanal para S3
```

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
Push → GitHub Actions
  ├─→ Lint + Format
  ├─→ Unit Tests
  ├─→ Integration Tests
  ├─→ Build
  ├─→ Deploy Staging
  └─→ (Manual) Deploy Produção
```

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
