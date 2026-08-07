/**
 * Testes para Events Controller
 */

jest.mock("../services/dynamodb.service");

const DynamoDBService = require("../services/dynamodb.service");
const { getEvents } = require("./events.controller");

const mockDynamoDb = DynamoDBService.mock.instances[0];

describe("Events Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("busca por telefone quando phoneNumber é informado", async () => {
    mockDynamoDb.getEventsByPhoneNumber.mockResolvedValue([{ eventId: "e1", status: "created" }]);

    const result = await getEvents({
      queryStringParameters: { phoneNumber: "5511999999999" },
    });

    expect(mockDynamoDb.getEventsByPhoneNumber).toHaveBeenCalledWith("5511999999999", 50);
    expect(mockDynamoDb.getAllEvents).not.toHaveBeenCalled();
    expect(JSON.parse(result.body).count).toBe(1);
  });

  it("busca todos os eventos quando phoneNumber não é informado", async () => {
    mockDynamoDb.getAllEvents.mockResolvedValue([{ eventId: "e1", status: "created" }]);

    await getEvents({ queryStringParameters: {} });

    expect(mockDynamoDb.getAllEvents).toHaveBeenCalledWith(50);
  });

  it("filtra por status quando informado", async () => {
    mockDynamoDb.getAllEvents.mockResolvedValue([
      { eventId: "e1", status: "created" },
      { eventId: "e2", status: "cancelled" },
    ]);

    const result = await getEvents({ queryStringParameters: { status: "created" } });
    const body = JSON.parse(result.body);

    expect(body.count).toBe(1);
    expect(body.data[0].eventId).toBe("e1");
  });

  it("retorna erro tratado quando o service falha", async () => {
    mockDynamoDb.getAllEvents.mockRejectedValue(new Error("falha no banco"));

    const result = await getEvents({ queryStringParameters: {} });
    expect(result.statusCode).toBe(500);
  });
});
