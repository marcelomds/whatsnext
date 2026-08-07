/**
 * Testes para Messages Controller
 */

jest.mock("../services/dynamodb.service");

import DynamoDBService from "../services/dynamodb.service";
import { getMessages } from "./messages.controller";
import type { APIGatewayProxyEvent } from "aws-lambda";

const MockedDynamoDBService = DynamoDBService as jest.MockedClass<typeof DynamoDBService>;
const mockDynamoDb = MockedDynamoDBService.mock.instances[0] as jest.Mocked<DynamoDBService>;

function fakeEvent(queryStringParameters: Record<string, string> | null): APIGatewayProxyEvent {
  return { queryStringParameters } as unknown as APIGatewayProxyEvent;
}

describe("Messages Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retorna 400 quando phoneNumber não é informado", async () => {
    const result = await getMessages(fakeEvent({}));
    expect(result.statusCode).toBe(400);
    expect(mockDynamoDb.getMessages).not.toHaveBeenCalled();
  });

  it("retorna as mensagens com paginação", async () => {
    mockDynamoDb.getMessages.mockResolvedValue([
      { messageId: "m1", timestamp: 1, phoneNumber: "5511999999999", content: "oi", status: "success", source: "whatsapp" },
      {
        messageId: "m2",
        timestamp: 2,
        phoneNumber: "5511999999999",
        content: "tudo bem?",
        status: "success",
        source: "whatsapp",
      },
    ]);

    const result = await getMessages(fakeEvent({ phoneNumber: "5511999999999", limit: "2" }));

    expect(mockDynamoDb.getMessages).toHaveBeenCalledWith("5511999999999", 2, 0);

    const body = JSON.parse(result.body);
    expect(body.count).toBe(2);
    expect(body.pagination.hasMore).toBe(true);
  });

  it("usa limit/offset default quando não informados", async () => {
    mockDynamoDb.getMessages.mockResolvedValue([]);

    await getMessages(fakeEvent({ phoneNumber: "5511999999999" }));

    expect(mockDynamoDb.getMessages).toHaveBeenCalledWith("5511999999999", 50, 0);
  });

  it("retorna erro tratado quando o service falha", async () => {
    mockDynamoDb.getMessages.mockRejectedValue(new Error("falha no banco"));

    const result = await getMessages(fakeEvent({ phoneNumber: "5511999999999" }));

    expect(result.statusCode).toBe(500);
  });
});
