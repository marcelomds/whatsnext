/**
 * Garante que toda resposta HTTP (sucesso ou erro) inclua os headers de
 * CORS. O API Gateway só adiciona esses headers sozinho no preflight
 * OPTIONS (via `cors: true` do serverless.yml); a resposta real do
 * Lambda (GET/POST) precisa trazê-los explicitamente, senão o navegador
 * bloqueia a resposta como erro de rede.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function withCors(handler) {
  return async (event) => {
    const response = await handler(event);
    return {
      ...response,
      headers: { ...CORS_HEADERS, ...(response.headers || {}) },
    };
  };
}

module.exports = { withCors, CORS_HEADERS };
