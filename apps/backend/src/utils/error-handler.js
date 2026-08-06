/**
 * Error Handler
 * Tratamento centralizado e consistente de erros
 */

const logger = require("./logger");

/**
 * Classes de erro customizadas
 */

class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, "VALIDATION_ERROR");
    this.errors = errors;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      errors: this.errors,
    };
  }
}

class NotFoundError extends AppError {
  constructor(resource) {
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
  constructor(message) {
    super(message, 409, "CONFLICT");
  }
}

class RateLimitError extends AppError {
  constructor(message = "Muitas requisições") {
    super(message, 429, "RATE_LIMIT_EXCEEDED");
  }
}

class ExternalServiceError extends AppError {
  constructor(service, originalError) {
    super(
      `Erro ao comunicar com ${service}: ${originalError.message}`,
      503,
      "EXTERNAL_SERVICE_ERROR"
    );
    this.service = service;
    this.originalError = originalError;
  }
}

/**
 * Handler principal de erros (para Lambda)
 */
function errorHandler(error, correlationId = "unknown") {
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
  const statusCode = error.statusCode || 500;
  const response = {
    success: false,
    correlationId,
    error: error.code || "INTERNAL_ERROR",
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

/**
 * Wrapper para convertendo erros desconhecidos
 */
function wrapAsync(fn) {
  return async (event, context) => {
    try {
      return await fn(event, context);
    } catch (error) {
      const correlationId = event.headers?.["x-correlation-id"] || "unknown";

      if (error instanceof AppError) {
        return errorHandler(error, correlationId);
      }

      // Converter erro desconhecido
      const appError = new AppError(
        "Erro ao processar requisição",
        500,
        "INTERNAL_ERROR"
      );

      logger.error("wrapped_error", {
        correlationId,
        originalError: error.message,
        stack: error.stack,
      });

      return errorHandler(appError, correlationId);
    }
  };
}

/**
 * Middleware para tratamento de erros (Express-like)
 */
function errorMiddleware(err, req, res, next) {
  const correlationId = req.headers?.["x-correlation-id"] || "unknown";

  if (err instanceof AppError) {
    logger.warn("app_error", {
      correlationId,
      code: err.code,
      statusCode: err.statusCode,
      message: err.message,
    });

    return res.status(err.statusCode).json(err.toJSON());
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
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        logger.debug("retry_scheduled", {
          attempt: i + 1,
          maxRetries,
          delayMs: delay,
          error: error.message,
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

module.exports = {
  // Classes de erro
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,

  // Handlers
  errorHandler,
  wrapAsync,
  errorMiddleware,
  retryWithBackoff,
};
