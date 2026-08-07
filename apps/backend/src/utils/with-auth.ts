/**
 * Envolve um handler Lambda exigindo Bearer token válido.
 * Decodifica o JWT e injeta em event.authUser antes de chamar o handler.
 */

import jwt from "jsonwebtoken";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { verifyToken } from "../services/auth.service";
import { UnauthorizedError, errorHandler } from "./error-handler";
import type { AuthenticatedEvent } from "../types/domain";

function getAuthHeader(headers: APIGatewayProxyEvent["headers"] = {}): string | undefined {
  return headers.Authorization || headers.authorization;
}

function withAuth(
  handler: (event: AuthenticatedEvent) => Promise<APIGatewayProxyResult>
): (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult> {
  return async (event: APIGatewayProxyEvent) => {
    const header = getAuthHeader(event.headers);

    if (!header || !header.startsWith("Bearer ")) {
      return errorHandler(new UnauthorizedError("Header Authorization ausente ou inválido"));
    }

    const token = header.slice("Bearer ".length);
    const authenticatedEvent = event as AuthenticatedEvent;

    try {
      authenticatedEvent.authUser = verifyToken(token);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError || error instanceof jwt.JsonWebTokenError) {
        return errorHandler(new UnauthorizedError("Token inválido ou expirado"));
      }
      return errorHandler(error as Error);
    }

    return handler(authenticatedEvent);
  };
}

export { withAuth };
