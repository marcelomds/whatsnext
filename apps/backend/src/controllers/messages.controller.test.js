/**
 * Testes para Messages Controller
 */

jest.mock("../services/dynamodb.service");

const DynamoDBService = require("../services/dynamodb.service");
const { getMessages } = require("./messages.controller");

const mockDynamoDb = DynamoDBService.mock.instances[0];

describe("Messages Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retorna 400 quando phoneNumber não é informado", async () => {
    const result = await getMessages({ queryStringParameters: {} });
    expect(result.statusCode).toBe(400);
    expect(mockDynamoDb.getMessages).not.toHaveBeenCalled();
  });

  it("retorna as mensagens com paginação", async () => {
    mockDynamoDb.getMessages.mockResolvedValue([{ content: "oi" }, { content: "tudo bem?" }]);

    const result = await getMessages({
      queryStringParameters: { phoneNumber: "5511999999999", limit: "2" },
    });

    expect(mockDynamoDb.getMessages).toHaveBeenCalledWith("5511999999999", 2, 0);

    const body = JSON.parse(result.body);
    expect(body.count).toBe(2);
    expect(body.pagination.hasMore).toBe(true);
  });

  it("usa limit/offset default quando não informados", async () => {
    mockDynamoDb.getMessages.mockResolvedValue([]);

    await getMessages({ queryStringParameters: { phoneNumber: "5511999999999" } });

    expect(mockDynamoDb.getMessages).toHaveBeenCalledWith("5511999999999", 50, 0);
  });

  it("retorna erro tratado quando o service falha", async () => {
    mockDynamoDb.getMessages.mockRejectedValue(new Error("falha no banco"));

    const result = await getMessages({
      queryStringParameters: { phoneNumber: "5511999999999" },
    });

    expect(result.statusCode).toBe(500);
  });
});
