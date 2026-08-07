/**
 * Handler Lambda Principal
 * Processa webhooks do WhatsApp e orquestra o fluxo
 */

const logger = require("../utils/logger");
const { errorHandler } = require("../utils/error-handler");
const { validateMessage } = require("../utils/validators");
const { parseEvolutionWebhook } = require("../utils/evolution-payload");

const ClaudeService = require("../services/claude.service");
const CalendarService = require("../services/calendar.service");
const DynamoDBService = require("../services/dynamodb.service");
const WhatsAppService = require("../services/whatsapp.service");

const messagesController = require("../controllers/messages.controller");
const eventsController = require("../controllers/events.controller");
const instanceController = require("../controllers/instance.controller");
const authController = require("../controllers/auth.controller");
const { withAuth } = require("../utils/with-auth");

// Inicializar serviços
const claudeService = new ClaudeService();
const calendarService = new CalendarService();
const dynamoDbService = new DynamoDBService();
const whatsappService = new WhatsAppService();

/**
 * Handler principal de webhook WhatsApp
 * POST /api/webhooks/whatsapp
 */
exports.handleWhatsappWebhook = async (event) => {
  const correlationId = require("uuid").v4();
  const startTime = Date.now();

  try {
    logger.info("webhook_received", {
      correlationId,
      source: "evolution-api",
      timestamp: new Date().toISOString(),
    });

    // 1. Parse e validação
    const rawBody = JSON.parse(event.body || "{}");

    // Aceita tanto o payload real da Evolution API ({event, instance, data})
    // quanto o formato simples {from, message, timestamp} usado em testes manuais.
    const body = rawBody.data ? parseEvolutionWebhook(rawBody) : rawBody;

    if (!body) {
      logger.debug("webhook_ignored", { correlationId });
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, status: "ignored" }),
      };
    }

    const validation = validateMessage(body);

    if (!validation.isValid) {
      logger.warn("validation_failed", {
        correlationId,
        errors: validation.errors,
      });

      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: "Validação falhou",
          details: validation.errors,
        }),
      };
    }

    // 2. Armazenar mensagem bruta
    const messageRecord = {
      messageId: require("uuid").v4(),
      timestamp: Date.now(),
      phoneNumber: body.from,
      content: body.message,
      status: "processing",
      source: "whatsapp",
      correlationId,
    };

    await dynamoDbService.saveMessage(messageRecord);
    logger.info("message_stored", {
      correlationId,
      messageId: messageRecord.messageId,
    });

    // 3. Obter histórico (últimas 5 mensagens)
    const history = await dynamoDbService.getMessageHistory(body.from, 5);
    logger.debug("history_retrieved", {
      correlationId,
      historyCount: history.length,
    });

    // 4. Processar com Claude
    let claudeResponse;
    try {
      claudeResponse = await claudeService.extractEvent(
        body.message,
        history
      );

      logger.info("claude_response_received", {
        correlationId,
        action: claudeResponse.action,
        confidence: claudeResponse.confidence,
        latency: Date.now() - startTime,
      });
    } catch (error) {
      logger.error("claude_error", {
        correlationId,
        error: error.message,
      });

      // Atualizar status
      await dynamoDbService.updateMessage(messageRecord.messageId, {
        status: "error",
        error: "Falha ao processar com Claude",
      });

      throw error;
    }

    // 5. Processar ação do Claude
    if (claudeResponse.action === "create_event") {
      try {
        // Criar evento no Google Calendar
        const googleEvent = await calendarService.createEvent(
          claudeResponse.event
        );

        logger.info("calendar_event_created", {
          correlationId,
          eventId: googleEvent.id,
          title: claudeResponse.event.title,
        });

        // Salvar evento em DynamoDB
        const eventRecord = {
          eventId: require("uuid").v4(),
          timestamp: Date.now(),
          messageId: messageRecord.messageId,
          phoneNumber: body.from,
          title: claudeResponse.event.title,
          startTime: claudeResponse.event.startTime,
          endTime: claudeResponse.event.endTime,
          description: claudeResponse.event.description,
          googleCalendarId: googleEvent.id,
          status: "created",
          correlationId,
        };

        await dynamoDbService.saveEvent(eventRecord);
        logger.info("event_stored", {
          correlationId,
          eventId: eventRecord.eventId,
        });

        // Atualizar mensagem
        await dynamoDbService.updateMessage(messageRecord.messageId, {
          status: "success",
          eventId: eventRecord.eventId,
          claudeResponse: JSON.stringify(claudeResponse),
        });

        // Enviar confirmação ao WhatsApp
        await whatsappService.sendMessage(body.from, claudeResponse.naturalResponse);

        logger.info("confirmation_sent", {
          correlationId,
          phoneNumber: body.from,
        });
      } catch (error) {
        logger.error("event_creation_error", {
          correlationId,
          error: error.message,
        });

        await dynamoDbService.updateMessage(messageRecord.messageId, {
          status: "error",
          error: "Falha ao criar evento no calendário",
        });

        throw error;
      }
    } else if (claudeResponse.action === "request_clarification") {
      // Pedir esclarecimento
      await dynamoDbService.updateMessage(messageRecord.messageId, {
        status: "clarification_needed",
        clarification: claudeResponse.clarification,
        claudeResponse: JSON.stringify(claudeResponse),
      });

      await whatsappService.sendMessage(
        body.from,
        claudeResponse.naturalResponse
      );

      logger.info("clarification_requested", {
        correlationId,
        clarification: claudeResponse.clarification,
      });
    }

    // 6. Retornar sucesso
    const latency = Date.now() - startTime;
    logger.info("webhook_processed_successfully", {
      correlationId,
      latency,
      messageId: messageRecord.messageId,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        messageId: messageRecord.messageId,
        status: "processed",
        latency,
      }),
    };
  } catch (error) {
    logger.error("webhook_error", {
      correlationId,
      error: error.message,
      stack: error.stack,
    });

    return errorHandler(error, correlationId);
  }
};

/**
 * GET /api/messages
 * Retorna histórico de mensagens com paginação
 */
exports.getMessages = messagesController.getMessages;

/**
 * GET /api/events
 * Retorna eventos criados
 */
exports.getEvents = eventsController.getEvents;

/**
 * GET /api/instance/status
 * Estado de conexão da instância WhatsApp do usuário logado
 */
exports.getInstanceStatus = withAuth(instanceController.getStatus);

/**
 * POST /api/instance/connect
 * Cria a instância (se necessário) e retorna o QR code
 */
exports.connectInstance = withAuth(instanceController.connect);

/**
 * POST /api/instance/disconnect
 * Desconecta a instância do usuário logado
 */
exports.disconnectInstance = withAuth(instanceController.disconnect);

/**
 * POST /api/auth/register
 */
exports.register = authController.register;

/**
 * POST /api/auth/login
 */
exports.login = authController.login;

/**
 * GET /api/auth/me
 */
exports.me = withAuth(authController.me);

/**
 * Função auxiliar para health check
 */
exports.healthCheck = async (event) => {
  try {
    // Verificar conexões básicas
    const checks = {
      dynamodb: true,
      claude: true,
      googleCalendar: true,
    };

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: "healthy",
        timestamp: new Date().toISOString(),
        checks,
      }),
    };
  } catch (error) {
    return {
      statusCode: 503,
      body: JSON.stringify({
        status: "unhealthy",
        error: error.message,
      }),
    };
  }
};
