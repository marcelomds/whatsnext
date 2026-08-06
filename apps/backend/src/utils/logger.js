/**
 * Logger Estruturado
 * Usa Pino para logging consistente e estruturado
 */

const pino = require("pino");

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
function info(message, context = {}) {
  logger.info({ ...context, context: message }, message);
}

/**
 * Log de debug
 */
function debug(message, context = {}) {
  logger.debug({ ...context, context: message }, message);
}

/**
 * Log de warning
 */
function warn(message, context = {}) {
  logger.warn({ ...context, context: message }, message);
}

/**
 * Log de erro
 */
function error(message, context = {}) {
  logger.error({ ...context, context: message }, message);
}

/**
 * Log com trace (stack trace)
 */
function errorWithStack(message, error, context = {}) {
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
    end: function (message, context = {}) {
      const duration = Date.now() - start;
      info(`${message} (${duration}ms)`, { ...context, duration });
    },
  };
}

/**
 * Middleware para logging de requests (Lambda/Express)
 */
function logRequest(handler) {
  return async (event, context) => {
    const correlationId = event.headers?.["x-correlation-id"] || require("uuid").v4();
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
      errorWithStack("request_failed", error, {
        correlationId,
        method: event.httpMethod,
        path: event.path,
      });

      throw error;
    }
  };
}

module.exports = {
  info,
  debug,
  warn,
  error,
  errorWithStack,
  startTimer,
  logRequest,
  logger, // Export raw logger para casos especiais
};
