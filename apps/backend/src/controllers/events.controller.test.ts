/**
 * Testes para Events Controller
 */

jest.mock("../services/dynamodb.service");

import DynamoDBService from "../services/dynamodb.service";
import { getEvents } from "./events.controller";
import type { APIGatewayProxyEvent } from "aws-lambda";
import type { StoredEvent } from "../types/domain";

const MockedDynamoDBService = DynamoDBService as jest.MockedClass<typeof DynamoDBService>;
const mockDynamoDb = MockedDynamoDBService.mock.instances[0] as jest.Mocked<DynamoDBService>;

function fakeEvent(queryStringParameters: Record<string, string>): APIGatewayProxyEvent {
  return { queryStringParameters } as unknown as APIGatewayProxyEvent;
}

function fakeStoredEvent(overrides: Partial<StoredEvent>): StoredEvent {
  return {
    eventId: "e1",
    timestamp: 1,
    messageId: "m1",
    phoneNumber: "5511999999999",
    title: "Evento",
    startTime: "2026-08-10T14:00:00",
    endTime: "2026-08-10T15:00:00",
    status: "created",
    ...overrides,
  };
}

describe("Events Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("busca por telefone quando phoneNumber é informado", async () => {
    mockDynamoDb.getEventsByPhoneNumber.mockResolvedValue([fakeStoredEvent({ eventId: "e1", status: "created" })]);

    const result = await getEvents(fakeEvent({ phoneNumber: "5511999999999" }));

    expect(mockDynamoDb.getEventsByPhoneNumber).toHaveBeenCalledWith("5511999999999", 50);
    expect(mockDynamoDb.getAllEvents).not.toHaveBeenCalled();
    expect(JSON.parse(result.body).count).toBe(1);
  });

  it("busca todos os eventos quando phoneNumber não é informado", async () => {
    mockDynamoDb.getAllEvents.mockResolvedValue([fakeStoredEvent({ eventId: "e1", status: "created" })]);

    await getEvents(fakeEvent({}));

    expect(mockDynamoDb.getAllEvents).toHaveBeenCalledWith(50);
  });

  it("filtra por status quando informado", async () => {
    mockDynamoDb.getAllEvents.mockResolvedValue([
      fakeStoredEvent({ eventId: "e1", status: "created" }),
      fakeStoredEvent({ eventId: "e2", status: "cancelled" }),
    ]);

    const result = await getEvents(fakeEvent({ status: "created" }));
    const body = JSON.parse(result.body);

    expect(body.count).toBe(1);
    expect(body.data[0].eventId).toBe("e1");
  });

  it("retorna erro tratado quando o service falha", async () => {
    mockDynamoDb.getAllEvents.mockRejectedValue(new Error("falha no banco"));

    const result = await getEvents(fakeEvent({}));
    expect(result.statusCode).toBe(500);
  });
});
