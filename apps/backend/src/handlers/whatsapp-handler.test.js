/**
 * Testes para o handler principal (handleWhatsappWebhook + healthCheck)
 */

process.env.JWT_SECRET = "test-secret";

jest.mock("../services/claude.service");
jest.mock("../services/calendar.service");
jest.mock("../services/dynamodb.service");
jest.mock("../services/whatsapp.service");

const ClaudeService = require("../services/claude.service");
const CalendarService = require("../services/calendar.service");
const DynamoDBService = require("../services/dynamodb.service");
const WhatsAppService = require("../services/whatsapp.service");

const { handleWhatsappWebhook, healthCheck } = require("./whatsapp-handler");

function simpleEvent(overrides = {}) {
  return {
    body: JSON.stringify({
      from: "5511999999999",
      message: "Amanhã 14h reunião com João",
      timestamp: Date.now(),
      ...overrides,
    }),
  };
}

const createEventClaudeResponse = {
  success: true,
  action: "create_event",
  event: {
    title: "Reunião com João",
    startTime: "2026-08-10T14:00:00",
    endTime: "2026-08-10T15:00:00",
    description: "Reunião agendada via WhatsApp",
  },
  confidence: 0.95,
  naturalResponse: "✅ Agendado!",
};

const clarificationClaudeResponse = {
  success: false,
  action: "request_clarification",
  clarification: "Que dia?",
  confidence: 0.3,
  naturalResponse: "Que dia você quer marcar?",
};

describe("handleWhatsappWebhook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    DynamoDBService.prototype.saveMessage.mockResolvedValue({});
    DynamoDBService.prototype.getMessageHistory.mockResolvedValue([]);
    DynamoDBService.prototype.updateMessage.mockResolvedValue({});
    DynamoDBService.prototype.saveEvent.mockResolvedValue({});
  });

  it("processa mensagem simples e cria evento de ponta a ponta", async () => {
    ClaudeService.prototype.extractEvent.mockResolvedValue(createEventClaudeResponse);
    CalendarService.prototype.createEvent.mockResolvedValue({ id: "gcal-1" });
    WhatsAppService.prototype.sendMessage.mockResolvedValue({});

    const result = await handleWhatsappWebhook(simpleEvent());
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(DynamoDBService.prototype.saveMessage).toHaveBeenCalled();
    expect(CalendarService.prototype.createEvent).toHaveBeenCalledWith(createEventClaudeResponse.event);
    expect(DynamoDBService.prototype.saveEvent).toHaveBeenCalled();
    expect(WhatsAppService.prototype.sendMessage).toHaveBeenCalledWith(
      "5511999999999",
      "✅ Agendado!"
    );
  });

  it("processa o payload real da Evolution API (não só o formato simples de teste)", async () => {
    ClaudeService.prototype.extractEvent.mockResolvedValue(createEventClaudeResponse);
    CalendarService.prototype.createEvent.mockResolvedValue({ id: "gcal-1" });
    WhatsAppService.prototype.sendMessage.mockResolvedValue({});

    const evolutionEvent = {
      body: JSON.stringify({
        event: "messages.upsert",
        instance: "whatsnext-marcelo-moreira",
        data: {
          key: { remoteJid: "5511999999999@s.whatsapp.net", fromMe: false, id: "3EB0" },
          message: { conversation: "Amanhã 14h reunião com João" },
          messageTimestamp: Math.floor(Date.now() / 1000),
        },
      }),
    };

    const result = await handleWhatsappWebhook(evolutionEvent);

    expect(result.statusCode).toBe(200);
    expect(DynamoDBService.prototype.saveMessage).toHaveBeenCalledWith(
      expect.objectContaining({ phoneNumber: "5511999999999" })
    );
  });

  it("ignora (200, sem tocar em nada) eco de mensagem própria ou grupo", async () => {
    const echoEvent = {
      body: JSON.stringify({
        event: "messages.upsert",
        instance: "whatsnext-marcelo-moreira",
        data: {
          key: { remoteJid: "5511999999999@s.whatsapp.net", fromMe: true, id: "3EB0" },
          message: { conversation: "✅ Agendado!" },
          messageTimestamp: Math.floor(Date.now() / 1000),
        },
      }),
    };

    const result = await handleWhatsappWebhook(echoEvent);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.status).toBe("ignored");
    expect(DynamoDBService.prototype.saveMessage).not.toHaveBeenCalled();
    expect(ClaudeService.prototype.extractEvent).not.toHaveBeenCalled();
  });

  it("retorna 400 quando a mensagem falha na validação", async () => {
    const result = await handleWhatsappWebhook(simpleEvent({ message: undefined }));
    expect(result.statusCode).toBe(400);
  });

  it("pede esclarecimento sem criar evento no calendário", async () => {
    ClaudeService.prototype.extractEvent.mockResolvedValue(clarificationClaudeResponse);
    WhatsAppService.prototype.sendMessage.mockResolvedValue({});

    const result = await handleWhatsappWebhook(simpleEvent({ message: "Marca uma reunião" }));

    expect(result.statusCode).toBe(200);
    expect(CalendarService.prototype.createEvent).not.toHaveBeenCalled();
    expect(DynamoDBService.prototype.updateMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ status: "clarification_needed" })
    );
    expect(WhatsAppService.prototype.sendMessage).toHaveBeenCalledWith(
      "5511999999999",
      "Que dia você quer marcar?"
    );
  });

  it("marca a mensagem como erro e retorna 500 quando o Claude falha", async () => {
    ClaudeService.prototype.extractEvent.mockRejectedValue(new Error("Claude indisponível"));

    const result = await handleWhatsappWebhook(simpleEvent());

    expect(result.statusCode).toBe(500);
    expect(DynamoDBService.prototype.updateMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ status: "error" })
    );
  });

  it("marca a mensagem como erro e retorna 500 quando a criação do evento no Calendar falha", async () => {
    ClaudeService.prototype.extractEvent.mockResolvedValue(createEventClaudeResponse);
    CalendarService.prototype.createEvent.mockRejectedValue(new Error("Google indisponível"));

    const result = await handleWhatsappWebhook(simpleEvent());

    expect(result.statusCode).toBe(500);
    expect(DynamoDBService.prototype.saveEvent).not.toHaveBeenCalled();
    expect(DynamoDBService.prototype.updateMessage).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ status: "error" })
    );
  });
});

describe("healthCheck", () => {
  it("retorna status healthy", async () => {
    const result = await healthCheck({});
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.status).toBe("healthy");
  });
});
