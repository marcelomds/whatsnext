/**
 * Validators
 * Validação de dados usando Joi
 */

const Joi = require("joi");
const logger = require("./logger");

/**
 * Schema para validação de mensagem WhatsApp
 */
const messageSchema = Joi.object({
  from: Joi.string()
    .regex(/^\d{10,15}$/)
    .required()
    .messages({
      "string.pattern.base": "Telefone deve conter 10-15 dígitos",
      "any.required": "Campo 'from' é obrigatório",
    }),
  message: Joi.string().max(4096).required().messages({
    "any.required": "Campo 'message' é obrigatório",
    "string.max": "Mensagem não pode ter mais de 4096 caracteres",
  }),
  timestamp: Joi.number().required().messages({
    "any.required": "Campo 'timestamp' é obrigatório",
  }),
  messageId: Joi.string().optional(),
});

/**
 * Schema para validação de evento
 */
const eventSchema = Joi.object({
  title: Joi.string().max(100).required().messages({
    "any.required": "Título do evento é obrigatório",
    "string.max": "Título não pode ter mais de 100 caracteres",
  }),
  startTime: Joi.string().isoDate().required().messages({
    "any.required": "Data/hora de início é obrigatória",
    "string.isoDate": "Data deve estar em formato ISO 8601",
  }),
  endTime: Joi.string().isoDate().required().messages({
    "any.required": "Data/hora de término é obrigatória",
    "string.isoDate": "Data deve estar em formato ISO 8601",
  }),
  description: Joi.string().optional(),
  duration: Joi.number().min(1).max(1440).optional(), // 1 minuto a 24 horas
});

/**
 * Schema para query parameters
 */
const querySchema = Joi.object({
  phoneNumber: Joi.string().optional(),
  limit: Joi.number().min(1).max(100).default(50),
  offset: Joi.number().min(0).default(0),
  status: Joi.string().optional(),
});

/**
 * Validar mensagem WhatsApp
 */
function validateMessage(data) {
  try {
    const { error, value } = messageSchema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
        type: detail.type,
      }));

      return {
        isValid: false,
        errors,
        value: null,
      };
    }

    return {
      isValid: true,
      errors: [],
      value,
    };
  } catch (err) {
    logger.error("validation_error", {
      error: err.message,
      data,
    });

    return {
      isValid: false,
      errors: [{ message: "Erro ao validar dados" }],
      value: null,
    };
  }
}

/**
 * Validar evento
 */
function validateEvent(data) {
  try {
    const { error, value } = eventSchema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
        type: detail.type,
      }));

      return {
        isValid: false,
        errors,
        value: null,
      };
    }

    // Validação extra: endTime deve ser maior que startTime
    if (new Date(value.startTime) >= new Date(value.endTime)) {
      return {
        isValid: false,
        errors: [
          {
            field: "endTime",
            message: "Data de término deve ser após data de início",
            type: "date.invalid",
          },
        ],
        value: null,
      };
    }

    return {
      isValid: true,
      errors: [],
      value,
    };
  } catch (err) {
    logger.error("event_validation_error", {
      error: err.message,
      data,
    });

    return {
      isValid: false,
      errors: [{ message: "Erro ao validar evento" }],
      value: null,
    };
  }
}

/**
 * Validar query parameters
 */
function validateQuery(data) {
  try {
    const { error, value } = querySchema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
        type: detail.type,
      }));

      return {
        isValid: false,
        errors,
        value: null,
      };
    }

    return {
      isValid: true,
      errors: [],
      value,
    };
  } catch (err) {
    logger.error("query_validation_error", {
      error: err.message,
      data,
    });

    return {
      isValid: false,
      errors: [{ message: "Erro ao validar parâmetros de query" }],
      value: null,
    };
  }
}

/**
 * Validar telefone (formato)
 */
function validatePhoneNumber(phoneNumber) {
  const regex = /^\d{10,15}$/;
  return regex.test(phoneNumber);
}

/**
 * Validar email
 */
function validateEmail(email) {
  const schema = Joi.string().email().required();
  const { error } = schema.validate(email);
  return !error;
}

/**
 * Validar data ISO
 */
function validateISODate(dateString) {
  try {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date) && dateString === date.toISOString();
  } catch {
    return false;
  }
}

module.exports = {
  validateMessage,
  validateEvent,
  validateQuery,
  validatePhoneNumber,
  validateEmail,
  validateISODate,
  // Schemas para reuso
  messageSchema,
  eventSchema,
  querySchema,
};
