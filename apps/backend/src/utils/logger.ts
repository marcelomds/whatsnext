/**
 * Logger Estruturado
 * Usa Pino para logging consistente e estruturado
 */

import pino from "pino";
import { v4 as uuidv4 } from "uuid";
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";

export type LogContext = Record<string, unknown>;

const isDev = process.env.NODE_ENV === "development";
const logLevel = process.env.LOG_LEVEL || (isDev ? "debug" : "info");

// Configurar logger Pino
const logger = pino({
  level: logLevel,
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          singleLine: false,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
          messageFormat: "{levelLabel} [{context}] {msg}",
        },
      }
    : undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Log de informação
 */
function info(message: string, context: LogContext = {}): void {
  logger.info({ ...context, context: message }, message);
}

/**
 * Log de debug
 */
function debug(message: string, context: LogContext = {}): void {
  logger.debug({ ...context, context: message }, message);
}

/**
 * Log de warning
 */
function warn(message: string, context: LogContext = {}): void {
  logger.warn({ ...context, context: message }, message);
}

/**
 * Log de erro
 */
function error(message: string, context: LogContext = {}): void {
  logger.error({ ...context, context: message }, message);
}

/**
 * Log com trace (stack trace)
 */
function errorWithStack(message: string, error: Error, context: LogContext = {}): void {
  logger.error(
    {
      ...context,
      error: error.message,
      stack: error.stack,
      context: message,
    },
    message
  );
}

/**
 * Profiling de execução
 */
function startTimer() {
  const start = Date.now();
  return {
    end: function (message: string, context: LogContext = {}) {
      const duration = Date.now() - start;
      info(`${message} (${duration}ms)`, { ...context, duration });
    },
  };
}

type LambdaHandler = (event: APIGatewayProxyEvent, context: Context) => Promise<APIGatewayProxyResult>;

/**
 * Middleware para logging de requests (Lambda/Express)
 */
function logRequest(handler: LambdaHandler): LambdaHandler {
  return async (event, context) => {
    const correlationId = event.headers?.["x-correlation-id"] || uuidv4();
    const timer = startTimer();

    info("request_started", {
      correlationId,
      method: event.httpMethod,
      path: event.path,
      queryStringParameters: event.queryStringParameters,
    });

    try {
      const response = await handler(event, context);

      timer.end("request_completed", {
        correlationId,
        statusCode: response.statusCode,
      });

      return response;
    } catch (error) {
      errorWithStack("request_failed", error as Error, {
        correlationId,
        method: event.httpMethod,
        path: event.path,
      });

      throw error;
    }
  };
}

export { info, debug, warn, error, errorWithStack, startTimer, logRequest, logger };

export default { info, debug, warn, error, errorWithStack, startTimer, logRequest, logger };
