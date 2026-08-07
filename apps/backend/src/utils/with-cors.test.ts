/**
 * Testes para o wrapper de CORS
 */

import { withCors } from "./with-cors";

describe("withCors", () => {
  it("adiciona os headers de CORS numa resposta de sucesso", async () => {
    const handler = async () => ({ statusCode: 200, body: "{}" });
    const result = await withCors(handler)({});

    expect(result.headers?.["Access-Control-Allow-Origin"]).toBe("*");
    expect(result.statusCode).toBe(200);
  });

  it("adiciona os headers de CORS numa resposta de erro", async () => {
    const handler = async () => ({ statusCode: 401, body: "{}" });
    const result = await withCors(handler)({});

    expect(result.headers?.["Access-Control-Allow-Origin"]).toBe("*");
    expect(result.statusCode).toBe(401);
  });

  it("preserva headers já existentes na resposta, sem sobrescrever", async () => {
    const handler = async () => ({
      statusCode: 200,
      body: "{}",
      headers: { "X-Correlation-ID": "abc123" },
    });
    const result = await withCors(handler)({});

    expect(result.headers?.["X-Correlation-ID"]).toBe("abc123");
    expect(result.headers?.["Access-Control-Allow-Origin"]).toBe("*");
  });
});
