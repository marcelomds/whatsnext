/**
 * Testes para Auth Controller
 */

jest.mock("../services/auth.service", () => ({
  register: jest.fn(),
  login: jest.fn(),
}));
jest.mock("../services/dynamodb.service");

const authService = require("../services/auth.service");
const DynamoDBService = require("../services/dynamodb.service");
const { register, login, me } = require("./auth.controller");

const mockDynamoDb = DynamoDBService.mock.instances[0];

describe("Auth Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("register", () => {
    it("chama authService.register e retorna 201", async () => {
      authService.register.mockResolvedValue({ token: "jwt", user: { userId: "u1" } });

      const result = await register({
        body: JSON.stringify({
          email: "marcelo@example.com",
          password: "senha123",
          name: "Marcelo",
        }),
      });

      expect(authService.register).toHaveBeenCalledWith(
        "marcelo@example.com",
        "senha123",
        "Marcelo",
        undefined
      );
      expect(result.statusCode).toBe(201);
    });

    it("retorna 400 quando falta campo obrigatório", async () => {
      const result = await register({ body: JSON.stringify({ email: "x@x.com" }) });

      expect(result.statusCode).toBe(400);
      expect(authService.register).not.toHaveBeenCalled();
    });

    it("propaga erro de e-mail duplicado do service", async () => {
      const { ConflictError } = jest.requireActual("../utils/error-handler");
      authService.register.mockRejectedValue(new ConflictError("E-mail já cadastrado"));

      const result = await register({
        body: JSON.stringify({ email: "x@x.com", password: "123456", name: "X" }),
      });

      expect(result.statusCode).toBe(409);
    });
  });

  describe("login", () => {
    it("chama authService.login e retorna 200", async () => {
      authService.login.mockResolvedValue({ token: "jwt", user: { userId: "u1" } });

      const result = await login({
        body: JSON.stringify({ email: "marcelo@example.com", password: "senha123" }),
      });

      expect(result.statusCode).toBe(200);
    });

    it("retorna 400 quando falta senha", async () => {
      const result = await login({ body: JSON.stringify({ email: "x@x.com" }) });
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
      });

      const result = await me({ authUser: { userId: "u1" } });
      const body = JSON.parse(result.body);

      expect(body.data.passwordHash).toBeUndefined();
      expect(body.data.email).toBe("marcelo@example.com");
    });

    it("retorna 404 quando o usuário não existe mais", async () => {
      mockDynamoDb.getUserById.mockResolvedValue(null);

      const result = await me({ authUser: { userId: "inexistente" } });
      expect(result.statusCode).toBe(404);
    });
  });
});
