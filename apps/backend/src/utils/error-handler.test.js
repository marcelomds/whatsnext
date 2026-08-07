/**
 * Testes para Error Handler
 */

const {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  errorHandler,
  wrapAsync,
  errorMiddleware,
  retryWithBackoff,
} = require("./error-handler");

describe("classes de erro", () => {
  it("AppError define statusCode/code padrão", () => {
    const error = new AppError("deu ruim");
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe("INTERNAL_ERROR");
    expect(error.toJSON()).toEqual({
      error: "INTERNAL_ERROR",
      message: "deu ruim",
      statusCode: 500,
    });
  });

  it("ValidationError carrega statusCode 400 e lista de erros", () => {
    const error = new ValidationError("inválido", [{ field: "email" }]);
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.toJSON().errors).toEqual([{ field: "email" }]);
  });

  it("NotFoundError monta mensagem a partir do recurso", () => {
    const error = new NotFoundError("Usuário");
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe("Usuário não encontrado");
  });

  it("UnauthorizedError usa 401 e mensagem padrão", () => {
    const error = new UnauthorizedError();
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe("Não autenticado");
  });

  it("ForbiddenError usa 403", () => {
    expect(new ForbiddenError().statusCode).toBe(403);
  });

  it("ConflictError usa 409", () => {
    expect(new ConflictError("já existe").statusCode).toBe(409);
  });

  it("RateLimitError usa 429", () => {
    expect(new RateLimitError().statusCode).toBe(429);
  });

  it("ExternalServiceError inclui nome do serviço e erro original", () => {
    const original = new Error("timeout");
    const error = new ExternalServiceError("Evolution API", original);
    expect(error.statusCode).toBe(503);
    expect(error.message).toContain("Evolution API");
    expect(error.originalError).toBe(original);
  });
});

describe("errorHandler", () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it("monta resposta HTTP a partir de um AppError", () => {
    const result = errorHandler(new NotFoundError("Evento"), "corr-1");

    expect(result.statusCode).toBe(404);
    expect(result.headers["X-Correlation-ID"]).toBe("corr-1");

    const body = JSON.parse(result.body);
    expect(body).toEqual({
      success: false,
      correlationId: "corr-1",
      error: "NOT_FOUND",
      message: "Evento não encontrado",
    });
  });

  it("inclui detalhes de validação quando for ValidationError", () => {
    const result = errorHandler(new ValidationError("campos inválidos", ["email"]));
    const body = JSON.parse(result.body);

    expect(body.errors).toEqual(["email"]);
  });

  it("trata erro genérico (não AppError) como 500", () => {
    const result = errorHandler(new Error("algo quebrou"));
    expect(result.statusCode).toBe(500);
  });

  it("esconde mensagem técnica em produção para erros 5xx", () => {
    process.env.NODE_ENV = "production";
    const result = errorHandler(new AppError("stack trace sensível", 500));
    const body = JSON.parse(result.body);

    expect(body.message).toBe("Erro interno do servidor");
    expect(body.error).toBeUndefined();
  });

  it("mantém mensagem original em produção para erros 4xx", () => {
    process.env.NODE_ENV = "production";
    const result = errorHandler(new ValidationError("campo obrigatório"));
    const body = JSON.parse(result.body);

    expect(body.message).toBe("campo obrigatório");
  });
});

describe("wrapAsync", () => {
  it("retorna o resultado do handler quando não há erro", async () => {
    const handler = wrapAsync(async () => ({ statusCode: 200, body: "{}" }));
    const result = await handler({ headers: {} });

    expect(result.statusCode).toBe(200);
  });

  it("converte AppError lançado dentro do handler", async () => {
    const handler = wrapAsync(async () => {
      throw new NotFoundError("Mensagem");
    });

    const result = await handler({ headers: {} });
    expect(result.statusCode).toBe(404);
  });

  it("converte erro desconhecido em AppError 500 genérico", async () => {
    const handler = wrapAsync(async () => {
      throw new Error("bug inesperado");
    });

    const result = await handler({ headers: {} });
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(500);
    expect(body.message).toBe("Erro ao processar requisição");
  });

  it("usa x-correlation-id do header quando presente", async () => {
    const handler = wrapAsync(async () => {
      throw new NotFoundError("X");
    });

    const result = await handler({ headers: { "x-correlation-id": "abc-123" } });
    expect(result.headers["X-Correlation-ID"]).toBe("abc-123");
  });
});

describe("errorMiddleware", () => {
  function mockRes() {
    return {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };
  }

  it("responde com statusCode/JSON do AppError", () => {
    const res = mockRes();
    errorMiddleware(new UnauthorizedError(), { headers: {} }, res, () => {});

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe("UNAUTHORIZED");
  });

  it("responde 500 genérico para erro desconhecido", () => {
    const res = mockRes();
    errorMiddleware(new Error("boom"), { headers: {} }, res, () => {});

    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe("Erro interno do servidor");
  });
});

describe("retryWithBackoff", () => {
  it("retorna o resultado na primeira tentativa bem-sucedida", async () => {
    const fn = jest.fn().mockResolvedValue("ok");
    const result = await retryWithBackoff(fn, 3, 1);

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("tenta novamente até dar certo", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("falha 1"))
      .mockResolvedValue("ok");

    const result = await retryWithBackoff(fn, 3, 1);

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("lança o último erro após esgotar as tentativas", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("sempre falha"));

    await expect(retryWithBackoff(fn, 2, 1)).rejects.toThrow("sempre falha");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
