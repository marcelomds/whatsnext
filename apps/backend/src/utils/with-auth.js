/**
 * Envolve um handler Lambda exigindo Bearer token válido.
 * Decodifica o JWT e injeta em event.authUser antes de chamar o handler.
 */

const jwt = require("jsonwebtoken");
const { verifyToken } = require("../services/auth.service");
const { UnauthorizedError, errorHandler } = require("./error-handler");

function getAuthHeader(headers = {}) {
  return headers.Authorization || headers.authorization;
}

function withAuth(handler) {
  return async (event) => {
    const header = getAuthHeader(event.headers);

    if (!header || !header.startsWith("Bearer ")) {
      return errorHandler(new UnauthorizedError("Header Authorization ausente ou inválido"));
    }

    const token = header.slice("Bearer ".length);

    try {
      event.authUser = verifyToken(token);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError || error instanceof jwt.JsonWebTokenError) {
        return errorHandler(new UnauthorizedError("Token inválido ou expirado"));
      }
      return errorHandler(error);
    }

    return handler(event);
  };
}

module.exports = { withAuth };
