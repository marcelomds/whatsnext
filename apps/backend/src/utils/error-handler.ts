/**
 * Error Handler
 * Tratamento centralizado e consistente de erros
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import logger from "./logger";

interface ValidationDetail {
  field?: string;
  message?: string;
  type?: string;
  [key: string]: unknown;
}

interface ErrorJSON {
  error: string;
  message: string;
  statusCode: number;
  errors?: ValidationDetail[];
}

/**
 * Classes de erro customizadas
 */

class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): ErrorJSON {
    return {
      error: this.code,
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}

class ValidationError extends AppError {
  errors: ValidationDetail[];

  constructor(message: string, errors: ValidationDetail[] = []) {
    super(message, 400, "VALIDATION_ERROR");
    this.errors = errors;
  }

  toJSON(): ErrorJSON {
    return {
      ...super.toJSON(),
      errors: this.errors,
    };
  }
}

class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} não encontrado`, 404, "NOT_FOUND");
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Não autenticado") {
    super(message, 401, "UNAUTHORIZED");
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Acesso negado") {
    super(message, 403, "FORBIDDEN");
  }
}

class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

class RateLimitError extends AppError {
  constructor(message = "Muitas requisições") {
    super(message, 429, "RATE_LIMIT_EXCEEDED");
  }
}

class ExternalServiceError extends AppError {
  service: string;
  originalError: Error;

  constructor(service: string, originalError: Error) {
    super(`Erro ao comunicar com ${service}: ${originalError.message}`, 503, "EXTERNAL_SERVICE_ERROR");
    this.service = service;
    this.originalError = originalError;
  }
}

/**
 * Handler principal de erros (para Lambda)
 */
function errorHandler(error: Error, correlationId = "unknown"): APIGatewayProxyResult {
  // Log do erro
  if (error instanceof AppError) {
    logger.warn("app_error", {
      correlationId,
      code: error.code,
      statusCode: error.statusCode,
      message: error.message,
    });
  } else {
    logger.error("unexpected_error", {
      correlationId,
      error: error.message,
      stack: error.stack,
    });
  }

  // Determinar resposta
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const response: {
    success: boolean;
    correlationId: string;
    error?: string;
    message: string;
    errors?: ValidationDetail[];
  } = {
    success: false,
    correlationId,
    error: error instanceof AppError ? error.code : "INTERNAL_ERROR",
    message: error.message,
  };

  // Adicionar detalhes se for erro de validação
  if (error instanceof ValidationError && error.errors) {
    response.errors = error.errors;
  }

  // Não expor detalhes técnicos em produção
  if (process.env.NODE_ENV === "production" && statusCode >= 500) {
    response.message = "Erro interno do servidor";
    delete response.error;
  }

  return {
    statusCode,
    body: JSON.stringify(response),
    headers: {
      "Content-Type": "application/json",
      "X-Correlation-ID": correlationId,
    },
  };
}

type LambdaHandler = (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;

/**
 * Wrapper para convertendo erros desconhecidos
 */
function wrapAsync(fn: LambdaHandler): LambdaHandler {
  return async (event) => {
    try {
      return await fn(event);
    } catch (error) {
      const correlationId = (event.headers?.["x-correlation-id"] as string) || "unknown";

      if (error instanceof AppError) {
        return errorHandler(error, correlationId);
      }

      // Converter erro desconhecido
      const appError = new AppError("Erro ao processar requisição", 500, "INTERNAL_ERROR");

      logger.error("wrapped_error", {
        correlationId,
        originalError: (error as Error).message,
        stack: (error as Error).stack,
      });

      return errorHandler(appError, correlationId);
    }
  };
}

interface ExpressLikeRequest {
  headers?: Record<string, string | undefined>;
}

interface ExpressLikeResponse {
  status(code: number): ExpressLikeResponse;
  json(payload: unknown): ExpressLikeResponse;
}

/**
 * Middleware para tratamento de erros (Express-like)
 */
function errorMiddleware(
  err: Error,
  req: ExpressLikeRequest,
  res: ExpressLikeResponse,
  _next: (err?: unknown) => void
): void {
  const correlationId = req.headers?.["x-correlation-id"] || "unknown";

  if (err instanceof AppError) {
    logger.warn("app_error", {
      correlationId,
      code: err.code,
      statusCode: err.statusCode,
      message: err.message,
    });

    res.status(err.statusCode).json(err.toJSON());
    return;
  }

  logger.error("unhandled_error", {
    correlationId,
    error: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    success: false,
    error: "INTERNAL_ERROR",
    message: "Erro interno do servidor",
    correlationId,
  });
}

/**
 * Retry com exponential backoff
 */
async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        logger.debug("retry_scheduled", {
          attempt: i + 1,
          maxRetries,
          delayMs: delay,
          error: lastError.message,
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

export {
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
};
