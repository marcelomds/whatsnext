/**
 * Testes para Auth Controller
 */

jest.mock("../services/auth.service", () => ({
  register: jest.fn(),
  login: jest.fn(),
}));
jest.mock("../services/dynamodb.service");

import * as authService from "../services/auth.service";
import DynamoDBService from "../services/dynamodb.service";
import { register, login, me } from "./auth.controller";
import type { APIGatewayProxyEvent } from "aws-lambda";
import type { AuthenticatedEvent, User } from "../types/domain";

const mockedAuthService = authService as jest.Mocked<typeof authService>;
const MockedDynamoDBService = DynamoDBService as jest.MockedClass<typeof DynamoDBService>;
const mockDynamoDb = MockedDynamoDBService.mock.instances[0] as jest.Mocked<DynamoDBService>;

function fakeEvent(body: unknown): APIGatewayProxyEvent {
  return { body: JSON.stringify(body) } as unknown as APIGatewayProxyEvent;
}

describe("Auth Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("register", () => {
    it("chama authService.register e retorna 201", async () => {
      mockedAuthService.register.mockResolvedValue({
        token: "jwt",
        user: { userId: "u1", email: "marcelo@example.com", name: "Marcelo", evolutionInstance: "x" },
      });

      const result = await register(
        fakeEvent({
          email: "marcelo@example.com",
          password: "senha123",
          name: "Marcelo",
        })
      );

      expect(mockedAuthService.register).toHaveBeenCalledWith("marcelo@example.com", "senha123", "Marcelo", undefined);
      expect(result.statusCode).toBe(201);
    });

    it("retorna 400 quando falta campo obrigatório", async () => {
      const result = await register(fakeEvent({ email: "x@x.com" }));

      expect(result.statusCode).toBe(400);
      expect(mockedAuthService.register).not.toHaveBeenCalled();
    });

    it("propaga erro de e-mail duplicado do service", async () => {
      const { ConflictError } = jest.requireActual("../utils/error-handler");
      mockedAuthService.register.mockRejectedValue(new ConflictError("E-mail já cadastrado"));

      const result = await register(fakeEvent({ email: "x@x.com", password: "123456", name: "X" }));

      expect(result.statusCode).toBe(409);
    });
  });

  describe("login", () => {
    it("chama authService.login e retorna 200", async () => {
      mockedAuthService.login.mockResolvedValue({
        token: "jwt",
        user: { userId: "u1", email: "marcelo@example.com", name: "Marcelo", evolutionInstance: "x" },
      });

      const result = await login(fakeEvent({ email: "marcelo@example.com", password: "senha123" }));

      expect(result.statusCode).toBe(200);
    });

    it("retorna 400 quando falta senha", async () => {
      const result = await login(fakeEvent({ email: "x@x.com" }));
      expect(result.statusCode).toBe(400);
    });
  });

  describe("me", () => {
    it("retorna os dados públicos do usuário autenticado", async () => {
      mockDynamoDb.getUserById.mockResolvedValue({
        userId: "u1",
        email: "marcelo@example.com",
        name: "Marcelo",
        passwordHash: "não deve vazar",
        evolutionInstance: "whatsnext-marcelo",
      } as User);

      const event = { authUser: { userId: "u1" } } as unknown as AuthenticatedEvent;
      const result = await me(event);
      const body = JSON.parse(result.body);

      expect(body.data.passwordHash).toBeUndefined();
      expect(body.data.email).toBe("marcelo@example.com");
    });

    it("retorna 404 quando o usuário não existe mais", async () => {
      mockDynamoDb.getUserById.mockResolvedValue(null);

      const event = { authUser: { userId: "inexistente" } } as unknown as AuthenticatedEvent;
      const result = await me(event);
      expect(result.statusCode).toBe(404);
    });
  });
});
