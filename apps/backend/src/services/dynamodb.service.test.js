/**
 * Testes para DynamoDB Service
 */

const mockSend = jest.fn();

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn(),
}));

jest.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: { from: jest.fn(() => ({ send: mockSend })) },
  GetCommand: jest.fn((input) => ({ input, __type: "Get" })),
  PutCommand: jest.fn((input) => ({ input, __type: "Put" })),
  UpdateCommand: jest.fn((input) => ({ input, __type: "Update" })),
  QueryCommand: jest.fn((input) => ({ input, __type: "Query" })),
  ScanCommand: jest.fn((input) => ({ input, __type: "Scan" })),
}));

const DynamoDBService = require("./dynamodb.service");

describe("DynamoDB Service", () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DynamoDBService();
  });

  describe("createUser", () => {
    it("grava o usuário com condição de não-existência", async () => {
      mockSend.mockResolvedValue({});

      const result = await service.createUser({
        userId: "u1",
        email: "marcelo@example.com",
        name: "Marcelo",
        passwordHash: "hash",
        evolutionInstance: "whatsnext-marcelo",
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          __type: "Put",
          input: expect.objectContaining({
            TableName: "users",
            ConditionExpression: "attribute_not_exists(userId)",
          }),
        })
      );
      expect(result.email).toBe("marcelo@example.com");
    });

    it("propaga erro (ex: usuário já existe)", async () => {
      mockSend.mockRejectedValue(new Error("ConditionalCheckFailedException"));

      await expect(service.createUser({ userId: "u1", email: "x" })).rejects.toThrow(
        "ConditionalCheckFailedException"
      );
    });
  });

  describe("getUserByEmail", () => {
    it("retorna o primeiro item encontrado", async () => {
      mockSend.mockResolvedValue({ Items: [{ userId: "u1", email: "marcelo@example.com" }] });

      const result = await service.getUserByEmail("marcelo@example.com");

      expect(result.userId).toBe("u1");
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ input: expect.objectContaining({ IndexName: "email-index" }) })
      );
    });

    it("retorna null quando não encontra", async () => {
      mockSend.mockResolvedValue({ Items: [] });
      expect(await service.getUserByEmail("ninguem@example.com")).toBeNull();
    });
  });

  describe("getUserById", () => {
    it("retorna o item quando existe", async () => {
      mockSend.mockResolvedValue({ Item: { userId: "u1" } });
      expect(await service.getUserById("u1")).toEqual({ userId: "u1" });
    });

    it("retorna null quando não existe", async () => {
      mockSend.mockResolvedValue({});
      expect(await service.getUserById("inexistente")).toBeNull();
    });
  });

  describe("saveMessage", () => {
    it("grava a mensagem com status default e ttl", async () => {
      mockSend.mockResolvedValue({});

      const result = await service.saveMessage({
        messageId: "m1",
        timestamp: 123,
        phoneNumber: "5511999999999",
        content: "oi",
      });

      expect(result.status).toBe("pending");
      expect(result.ttl).toBeGreaterThan(Date.now() / 1000);
    });
  });

  describe("updateMessage", () => {
    it("monta a UpdateExpression a partir dos campos passados", async () => {
      mockSend.mockResolvedValue({});

      await service.updateMessage("m1", { status: "success" });

      const call = mockSend.mock.calls[0][0];
      expect(call.input.UpdateExpression).toContain("#status = :status");
      expect(call.input.ExpressionAttributeValues[":status"]).toBe("success");
    });
  });

  describe("getMessageHistory", () => {
    it("retorna os itens encontrados", async () => {
      mockSend.mockResolvedValue({ Items: [{ content: "oi" }] });
      expect(await service.getMessageHistory("5511999999999")).toEqual([{ content: "oi" }]);
    });

    it("retorna array vazio em caso de erro (não lança)", async () => {
      mockSend.mockRejectedValue(new Error("timeout"));
      expect(await service.getMessageHistory("5511999999999")).toEqual([]);
    });
  });

  describe("getMessages", () => {
    it("retorna mensagens paginadas", async () => {
      mockSend.mockResolvedValue({ Items: [{ content: "a" }, { content: "b" }] });
      const result = await service.getMessages("5511999999999", 10, 0);
      expect(result).toHaveLength(2);
    });

    it("propaga erro", async () => {
      mockSend.mockRejectedValue(new Error("falhou"));
      await expect(service.getMessages("5511999999999")).rejects.toThrow("falhou");
    });
  });

  describe("saveEvent", () => {
    it("grava o evento com status default pending", async () => {
      mockSend.mockResolvedValue({});
      const result = await service.saveEvent({ eventId: "e1", title: "Reunião" });
      expect(result.status).toBe("pending");
    });
  });

  describe("getEventsByPhoneNumber / getAllEvents", () => {
    it("getEventsByPhoneNumber consulta pelo índice de telefone", async () => {
      mockSend.mockResolvedValue({ Items: [{ eventId: "e1" }] });
      const result = await service.getEventsByPhoneNumber("5511999999999");
      expect(result).toEqual([{ eventId: "e1" }]);
    });

    it("getAllEvents faz Scan na tabela de eventos", async () => {
      mockSend.mockResolvedValue({ Items: [{ eventId: "e1" }, { eventId: "e2" }] });
      const result = await service.getAllEvents();
      expect(result).toHaveLength(2);
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ __type: "Scan" }));
    });
  });

  describe("logAudit", () => {
    it("não lança mesmo se o send falhar", async () => {
      mockSend.mockRejectedValue(new Error("falhou"));
      await expect(service.logAudit("user_login", { userId: "u1" })).resolves.toBeUndefined();
    });
  });

  describe("checkDuplicateEvent", () => {
    it("filtra eventos com mesmo título e mesmo dia", async () => {
      mockSend.mockResolvedValue({
        Items: [
          { title: "Reunião com João", startTime: "2026-08-10T14:00:00.000Z" },
          { title: "Outra coisa", startTime: "2026-08-10T09:00:00.000Z" },
        ],
      });

      const result = await service.checkDuplicateEvent(
        "5511999999999",
        "reunião com joão",
        "2026-08-10T14:00:00.000Z"
      );

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Reunião com João");
    });

    it("retorna array vazio em caso de erro", async () => {
      mockSend.mockRejectedValue(new Error("falhou"));
      expect(
        await service.checkDuplicateEvent("5511999999999", "x", "2026-08-10T14:00:00.000Z")
      ).toEqual([]);
    });
  });

  describe("getStats", () => {
    it("combina contagem de mensagens e eventos", async () => {
      mockSend.mockResolvedValueOnce({ Count: 5 }).mockResolvedValueOnce({ Count: 2 });

      const stats = await service.getStats();

      expect(stats.totalMessages).toBe(5);
      expect(stats.totalEvents).toBe(2);
    });
  });
});
