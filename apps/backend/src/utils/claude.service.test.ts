/**
 * Testes para Claude Service
 */

// Mock do Anthropic
jest.mock("@anthropic-ai/sdk", () =>
  jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn(),
    },
  }))
);

import ClaudeService from "../../src/services/claude.service";
import type { ClaudeExtractionResult } from "../types/domain";

describe("Claude Service", () => {
  let claudeService: ClaudeService;
  let mockClient: { messages: { create: jest.Mock } };

  beforeEach(() => {
    claudeService = new ClaudeService();
    mockClient = claudeService.client as unknown as { messages: { create: jest.Mock } };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("extractEvent", () => {
    it("deve extrair evento com sucesso", async () => {
      // Mock da resposta Claude
      mockClient.messages.create.mockResolvedValue({
        content: [
          {
            text: JSON.stringify({
              success: true,
              action: "create_event",
              event: {
                title: "Reunião com João",
                startTime: "2024-01-15T14:00:00",
                endTime: "2024-01-15T15:00:00",
                description: "Reunião agendada",
              },
              confidence: 0.95,
              naturalResponse: "✅ Evento criado",
            }),
          },
        ],
      });

      const result = await claudeService.extractEvent("Próxima segunda 14h reunião com João");

      expect(result.success).toBe(true);
      expect(result.action).toBe("create_event");
      expect(result.event?.title).toBe("Reunião com João");
      expect(result.confidence).toBe(0.95);
    });

    it("deve solicitar esclarecimento quando faltam informações", async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [
          {
            text: JSON.stringify({
              success: false,
              action: "request_clarification",
              clarification: "Quando você gostaria de agendar?",
              confidence: 0.3,
              naturalResponse: "Quando você gostaria de agendar?",
            }),
          },
        ],
      });

      const result = await claudeService.extractEvent("Agende uma reunião");

      expect(result.success).toBe(false);
      expect(result.action).toBe("request_clarification");
    });

    it("deve utilizar cache para mesma mensagem", async () => {
      const message = "Próxima segunda 14h reunião com João";
      const mockResponse = {
        content: [
          {
            text: JSON.stringify({
              success: true,
              action: "create_event",
              event: {
                title: "Reunião com João",
                startTime: "2024-01-15T14:00:00",
                endTime: "2024-01-15T15:00:00",
              },
              confidence: 0.95,
              naturalResponse: "✅ Evento criado",
            }),
          },
        ],
      };

      mockClient.messages.create.mockResolvedValue(mockResponse);

      // Primeira chamada
      await claudeService.extractEvent(message);
      expect(mockClient.messages.create).toHaveBeenCalledTimes(1);

      // Segunda chamada (deve vir do cache)
      await claudeService.extractEvent(message);
      expect(mockClient.messages.create).toHaveBeenCalledTimes(1); // Não deve chamar novamente
    });

    it("deve validar datas ISO", async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [
          {
            text: JSON.stringify({
              success: true,
              action: "create_event",
              event: {
                title: "Reunião",
                startTime: "data-invalida",
                endTime: "2024-01-15T15:00:00",
              },
              confidence: 0.8,
            }),
          },
        ],
      });

      try {
        await claudeService.extractEvent("Agende algo");
        expect(true).toBe(false); // Não deve chegar aqui
      } catch (error) {
        expect((error as Error).message).toContain("ISO");
      }
    });

    it("deve lidar com erro de parsing JSON", async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [
          {
            text: "Resposta inválida sem JSON",
          },
        ],
      });

      try {
        await claudeService.extractEvent("Agende algo");
        expect(true).toBe(false);
      } catch (error) {
        expect((error as Error).message).toContain("JSON");
      }
    });
  });

  describe("extractEventWithTools", () => {
    it("deve extrair evento usando tool use", async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [
          {
            type: "tool_use",
            name: "create_calendar_event",
            input: {
              title: "Reunião com João",
              startTime: "2024-01-15T14:00:00",
              endTime: "2024-01-15T15:00:00",
              description: "Reunião importante",
            },
          },
        ],
      });

      const result = await claudeService.extractEventWithTools("Próxima segunda 14h reunião com João");

      expect(result.success).toBe(true);
      expect(result.action).toBe("create_event");
      expect(result.event?.title).toBe("Reunião com João");
    });

    it("deve solicitar clarificação via tool use", async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [
          {
            type: "tool_use",
            name: "request_clarification",
            input: {
              question: "Qual horário você prefere?",
            },
          },
        ],
      });

      const result = await claudeService.extractEventWithTools("Agende uma reunião");

      expect(result.success).toBe(false);
      expect(result.action).toBe("request_clarification");
      expect(result.clarification).toBe("Qual horário você prefere?");
    });
  });

  describe("Cache", () => {
    it("deve limpar cache", () => {
      claudeService.clearCache();
      expect(claudeService.cache.keys()).toHaveLength(0);
    });

    it("deve retornar estatísticas de cache", () => {
      const stats = claudeService.getCacheStats();
      expect(stats).toHaveProperty("itemCount");
      expect(stats).toHaveProperty("keys");
    });
  });

  describe("Formatação de Data", () => {
    it("deve formatar data para português", () => {
      const formatted = claudeService._formatDateBR("2024-01-15T14:00:00");
      expect(formatted).toContain("janeiro");
      expect(formatted).toContain("14:00");
    });
  });

  describe("Validação de Resposta", () => {
    it("deve validar resposta com confiança inválida", () => {
      const response: ClaudeExtractionResult = {
        success: true,
        action: "create_event",
        event: {
          title: "Teste",
          startTime: "2024-01-15T14:00:00",
          endTime: "2024-01-15T15:00:00",
        },
        confidence: 1.5, // Inválido
        naturalResponse: null,
      };

      claudeService._validateEventResponse(response);
      expect(response.confidence).toBe(0.5); // Deve ser ajustado
    });
  });
});
