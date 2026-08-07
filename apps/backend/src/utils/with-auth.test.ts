/**
 * Testes para o wrapper withAuth
 */

jest.mock("../services/auth.service", () => ({
  verifyToken: jest.fn(),
}));

import jwt from "jsonwebtoken";
import { verifyToken } from "../services/auth.service";
import { withAuth } from "./with-auth";
import type { APIGatewayProxyEvent } from "aws-lambda";
import type { AuthenticatedEvent } from "../types/domain";

const mockedVerifyToken = verifyToken as jest.Mock;

function fakeEvent(headers: Record<string, string | undefined>): APIGatewayProxyEvent {
  return { headers } as unknown as APIGatewayProxyEvent;
}

describe("withAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("retorna 401 quando não há header Authorization", async () => {
    const handler = jest.fn();
    const wrapped = withAuth(handler);

    const result = await wrapped(fakeEvent({}));

    expect(result.statusCode).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("retorna 401 quando header não começa com Bearer", async () => {
    const handler = jest.fn();
    const wrapped = withAuth(handler);

    const result = await wrapped(fakeEvent({ authorization: "Basic abc123" }));

    expect(result.statusCode).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("aceita header Authorization com A maiúsculo (API Gateway) ou minúsculo", async () => {
    mockedVerifyToken.mockReturnValue({ userId: "u1" });
    const handler = jest.fn().mockResolvedValue({ statusCode: 200, body: "{}" });
    const wrapped = withAuth(handler);

    await wrapped(fakeEvent({ Authorization: "Bearer token-valido" }));
    await wrapped(fakeEvent({ authorization: "Bearer token-valido" }));

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("injeta authUser decodificado e chama o handler quando o token é válido", async () => {
    mockedVerifyToken.mockReturnValue({ userId: "u1", email: "marcelo@example.com" });
    const handler = jest.fn().mockResolvedValue({ statusCode: 200, body: "{}" });
    const wrapped = withAuth(handler);

    const event = fakeEvent({ authorization: "Bearer token-valido" });
    const result = await wrapped(event);

    expect(mockedVerifyToken).toHaveBeenCalledWith("token-valido");
    expect((event as AuthenticatedEvent).authUser).toEqual({ userId: "u1", email: "marcelo@example.com" });
    expect(result.statusCode).toBe(200);
  });

  it("retorna 401 quando o token expirou", async () => {
    mockedVerifyToken.mockImplementation(() => {
      throw new jwt.TokenExpiredError("jwt expired", new Date());
    });
    const handler = jest.fn();
    const wrapped = withAuth(handler);

    const result = await wrapped(fakeEvent({ authorization: "Bearer expirado" }));

    expect(result.statusCode).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("retorna 401 quando o token é malformado", async () => {
    mockedVerifyToken.mockImplementation(() => {
      throw new jwt.JsonWebTokenError("jwt malformed");
    });
    const handler = jest.fn();
    const wrapped = withAuth(handler);

    const result = await wrapped(fakeEvent({ authorization: "Bearer malformado" }));

    expect(result.statusCode).toBe(401);
  });

  it("propaga como erro 500 uma falha inesperada de verifyToken", async () => {
    mockedVerifyToken.mockImplementation(() => {
      throw new Error("falha inesperada no banco");
    });
    const handler = jest.fn();
    const wrapped = withAuth(handler);

    const result = await wrapped(fakeEvent({ authorization: "Bearer token" }));

    expect(result.statusCode).toBe(500);
    expect(handler).not.toHaveBeenCalled();
  });
});
