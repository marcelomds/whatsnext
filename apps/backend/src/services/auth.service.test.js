/**
 * Testes para Auth Service
 */

process.env.JWT_SECRET = "test-secret";

jest.mock("./dynamodb.service");
jest.mock("bcryptjs");
jest.mock("uuid", () => ({ v4: jest.fn() }));

const DynamoDBService = require("./dynamodb.service");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const authService = require("./auth.service");

const mockDynamoDb = DynamoDBService.mock.instances[0];

describe("Auth Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    uuidv4.mockReturnValue("11111111-2222-3333-4444-555555555555");
  });

  describe("register", () => {
    it("cria usuário novo e retorna token + dados públicos", async () => {
      mockDynamoDb.getUserByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue("hash-da-senha");
      mockDynamoDb.createUser.mockImplementation(async (user) => user);

      const result = await authService.register(
        "marcelo@example.com",
        "senha123",
        "Marcelo Moreira",
        "whatsnext-marcelo-moreira"
      );

      expect(mockDynamoDb.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "marcelo@example.com",
          name: "Marcelo Moreira",
          passwordHash: "hash-da-senha",
          evolutionInstance: "whatsnext-marcelo-moreira",
        })
      );

      expect(result.token).toEqual(expect.any(String));
      expect(result.user).toEqual({
        userId: "11111111-2222-3333-4444-555555555555",
        email: "marcelo@example.com",
        name: "Marcelo Moreira",
        evolutionInstance: "whatsnext-marcelo-moreira",
      });
      // senha nunca deve vazar na resposta pública
      expect(result.user.passwordHash).toBeUndefined();
    });

    it("gera nome de instância automático (slugificado) quando não informado", async () => {
      mockDynamoDb.getUserByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue("hash");
      mockDynamoDb.createUser.mockImplementation(async (user) => user);

      const result = await authService.register(
        "ana@example.com",
        "senha123",
        "Ana Nogueira"
      );

      expect(result.user.evolutionInstance).toBe(
        "whatsnext-ana-nogueira-11111111"
      );
    });

    it("rejeita e-mail já cadastrado", async () => {
      mockDynamoDb.getUserByEmail.mockResolvedValue({ userId: "existing" });

      await expect(
        authService.register("marcelo@example.com", "senha123", "Marcelo")
      ).rejects.toThrow("E-mail já cadastrado");

      expect(mockDynamoDb.createUser).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    it("retorna token quando e-mail e senha conferem", async () => {
      mockDynamoDb.getUserByEmail.mockResolvedValue({
        userId: "u1",
        email: "marcelo@example.com",
        name: "Marcelo",
        passwordHash: "hash-salva",
        evolutionInstance: "whatsnext-marcelo",
      });
      bcrypt.compare.mockResolvedValue(true);

      const result = await authService.login("marcelo@example.com", "senha123");

      expect(bcrypt.compare).toHaveBeenCalledWith("senha123", "hash-salva");
      expect(result.token).toEqual(expect.any(String));
    });

    it("rejeita quando usuário não existe", async () => {
      mockDynamoDb.getUserByEmail.mockResolvedValue(null);

      await expect(
        authService.login("naoexiste@example.com", "qualquer")
      ).rejects.toThrow("E-mail ou senha inválidos");

      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it("rejeita quando a senha não confere", async () => {
      mockDynamoDb.getUserByEmail.mockResolvedValue({
        userId: "u1",
        passwordHash: "hash-salva",
      });
      bcrypt.compare.mockResolvedValue(false);

      await expect(
        authService.login("marcelo@example.com", "senha-errada")
      ).rejects.toThrow("E-mail ou senha inválidos");
    });
  });

  describe("verifyToken", () => {
    it("decodifica um token emitido pelo próprio serviço", async () => {
      mockDynamoDb.getUserByEmail.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue("hash");
      mockDynamoDb.createUser.mockImplementation(async (user) => user);

      const { token } = await authService.register(
        "marcelo@example.com",
        "senha123",
        "Marcelo",
        "whatsnext-marcelo"
      );

      const payload = authService.verifyToken(token);

      expect(payload).toMatchObject({
        userId: "11111111-2222-3333-4444-555555555555",
        email: "marcelo@example.com",
        evolutionInstance: "whatsnext-marcelo",
      });
    });

    it("lança erro para token inválido", () => {
      expect(() => authService.verifyToken("token-invalido")).toThrow();
    });
  });
});
