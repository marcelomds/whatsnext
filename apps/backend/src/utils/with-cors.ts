/**
 * Garante que toda resposta HTTP (sucesso ou erro) inclua os headers de
 * CORS. O API Gateway só adiciona esses headers sozinho no preflight
 * OPTIONS (via `cors: true` do serverless.yml); a resposta real do
 * Lambda (GET/POST) precisa trazê-los explicitamente, senão o navegador
 * bloqueia a resposta como erro de rede.
 */

import type { APIGatewayProxyResult } from "aws-lambda";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function withCors<E>(
  handler: (event: E) => Promise<APIGatewayProxyResult>
): (event: E) => Promise<APIGatewayProxyResult> {
  return async (event: E) => {
    const response = await handler(event);
    return {
      ...response,
      headers: { ...CORS_HEADERS, ...(response.headers || {}) },
    };
  };
}

export { withCors, CORS_HEADERS };
