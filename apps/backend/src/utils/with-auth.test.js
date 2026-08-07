/**
 * Testes para o wrapper withAuth
 */

jest.mock("../services/auth.service", () => ({
  verifyToken: jest.fn(),
}));

const jwt = require("jsonwebtoken");
const { verifyToken } = require("../services/auth.service");
const { withAuth } = require("./with-auth");

describe("withAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retorna 401 quando não há header Authorization", async () => {
    const handler = jest.fn();
    const wrapped = withAuth(handler);

    const result = await wrapped({ headers: {} });

    expect(result.statusCode).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("retorna 401 quando header não começa com Bearer", async () => {
    const handler = jest.fn();
    const wrapped = withAuth(handler);

    const result = await wrapped({ headers: { authorization: "Basic abc123" } });

    expect(result.statusCode).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("aceita header Authorization com A maiúsculo (API Gateway) ou minúsculo", async () => {
    verifyToken.mockReturnValue({ userId: "u1" });
    const handler = jest.fn().mockResolvedValue({ statusCode: 200, body: "{}" });
    const wrapped = withAuth(handler);

    await wrapped({ headers: { Authorization: "Bearer token-valido" } });
    await wrapped({ headers: { authorization: "Bearer token-valido" } });

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("injeta authUser decodificado e chama o handler quando o token é válido", async () => {
    verifyToken.mockReturnValue({ userId: "u1", email: "marcelo@example.com" });
    const handler = jest.fn().mockResolvedValue({ statusCode: 200, body: "{}" });
    const wrapped = withAuth(handler);

    const event = { headers: { authorization: "Bearer token-valido" } };
    const result = await wrapped(event);

    expect(verifyToken).toHaveBeenCalledWith("token-valido");
    expect(event.authUser).toEqual({ userId: "u1", email: "marcelo@example.com" });
    expect(result.statusCode).toBe(200);
  });

  it("retorna 401 quando o token expirou", async () => {
    verifyToken.mockImplementation(() => {
      throw new jwt.TokenExpiredError("jwt expired", new Date());
    });
    const handler = jest.fn();
    const wrapped = withAuth(handler);

    const result = await wrapped({ headers: { authorization: "Bearer expirado" } });

    expect(result.statusCode).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("retorna 401 quando o token é malformado", async () => {
    verifyToken.mockImplementation(() => {
      throw new jwt.JsonWebTokenError("jwt malformed");
    });
    const handler = jest.fn();
    const wrapped = withAuth(handler);

    const result = await wrapped({ headers: { authorization: "Bearer malformado" } });

    expect(result.statusCode).toBe(401);
  });

  it("propaga como erro 500 uma falha inesperada de verifyToken", async () => {
    verifyToken.mockImplementation(() => {
      throw new Error("falha inesperada no banco");
    });
    const handler = jest.fn();
    const wrapped = withAuth(handler);

    const result = await wrapped({ headers: { authorization: "Bearer token" } });

    expect(result.statusCode).toBe(500);
    expect(handler).not.toHaveBeenCalled();
  });
});
