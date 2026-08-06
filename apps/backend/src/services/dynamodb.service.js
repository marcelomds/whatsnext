/**
 * DynamoDB Service
 * Integração com AWS DynamoDB para armazenamento de dados
 */

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const logger = require("../utils/logger");

class DynamoDBService {
  constructor() {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || "us-east-1",
      ...(process.env.DYNAMODB_ENDPOINT && {
        endpoint: process.env.DYNAMODB_ENDPOINT,
        credentials: {
          accessKeyId: "local",
          secretAccessKey: "local",
        },
      }),
    });

    // Usar Document Client para abstração automática
    this.dynamodb = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: false,
        convertClassInstanceToMap: true,
      },
    });

    this.messagesTable = process.env.DYNAMODB_MESSAGES_TABLE || "messages";
    this.eventsTable = process.env.DYNAMODB_EVENTS_TABLE || "events";
    this.auditLogsTable = process.env.DYNAMODB_AUDIT_LOGS_TABLE || "audit_logs";
  }

  /**
   * Salvar mensagem
   */
  async saveMessage(message) {
    try {
      const record = {
        messageId: message.messageId,
        timestamp: message.timestamp,
        phoneNumber: message.phoneNumber,
        content: message.content,
        status: message.status || "pending",
        source: message.source || "whatsapp",
        correlationId: message.correlationId,
        ttl: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60, // 90 dias
      };

      await this.dynamodb.send(
        new PutCommand({
          TableName: this.messagesTable,
          Item: record,
        })
      );

      logger.debug("message_saved", {
        messageId: message.messageId,
        phoneNumber: message.phoneNumber,
      });

      return record;
    } catch (error) {
      logger.error("save_message_error", {
        error: error.message,
        messageId: message.messageId,
      });

      throw error;
    }
  }

  /**
   * Atualizar mensagem
   */
  async updateMessage(messageId, updates) {
    try {
      // Construir expressão de atualização
      const updateExpression = [];
      const expressionAttributeValues = {};
      const expressionAttributeNames = {};

      Object.entries(updates).forEach(([key, value], index) => {
        const placeholder = `#${key}`;
        const valuePlaceholder = `:${key}`;
        updateExpression.push(`${placeholder} = ${valuePlaceholder}`);
        expressionAttributeNames[placeholder] = key;
        expressionAttributeValues[valuePlaceholder] = value;
      });

      updateExpression.push("#updatedAt = :updatedAt");
      expressionAttributeNames["#updatedAt"] = "updatedAt";
      expressionAttributeValues[":updatedAt"] = Date.now();

      await this.dynamodb.send(
        new UpdateCommand({
          TableName: this.messagesTable,
          Key: {
            messageId,
            timestamp: Date.now(), // Usar timestamp atual ou recuperar
          },
          UpdateExpression: `SET ${updateExpression.join(", ")}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
        })
      );

      logger.debug("message_updated", { messageId });
    } catch (error) {
      logger.error("update_message_error", {
        error: error.message,
        messageId,
      });

      throw error;
    }
  }

  /**
   * Obter histórico de mensagens de um telefone
   */
  async getMessageHistory(phoneNumber, limit = 5) {
    try {
      const response = await this.dynamodb.send(
        new QueryCommand({
          TableName: this.messagesTable,
          IndexName: "phoneNumber-timestamp-index",
          KeyConditionExpression: "phoneNumber = :phoneNumber",
          ExpressionAttributeValues: {
            ":phoneNumber": phoneNumber,
          },
          ScanIndexForward: false, // DESC
          Limit: limit,
        })
      );

      logger.debug("message_history_retrieved", {
        phoneNumber,
        count: response.Items.length,
      });

      return response.Items || [];
    } catch (error) {
      logger.error("get_message_history_error", {
        error: error.message,
        phoneNumber,
      });

      return []; // Retornar array vazio em caso de erro
    }
  }

  /**
   * Obter mensagens com paginação
   */
  async getMessages(phoneNumber, limit = 50, offset = 0) {
    try {
      const response = await this.dynamodb.send(
        new QueryCommand({
          TableName: this.messagesTable,
          IndexName: "phoneNumber-timestamp-index",
          KeyConditionExpression: "phoneNumber = :phoneNumber",
          ExpressionAttributeValues: {
            ":phoneNumber": phoneNumber,
          },
          ScanIndexForward: false,
          Limit: limit,
          ExclusiveStartKey: offset > 0 ? { phoneNumber, timestamp: offset } : undefined,
        })
      );

      logger.debug("messages_retrieved", {
        phoneNumber,
        count: response.Items.length,
      });

      return response.Items || [];
    } catch (error) {
      logger.error("get_messages_error", {
        error: error.message,
        phoneNumber,
      });

      throw error;
    }
  }

  /**
   * Salvar evento
   */
  async saveEvent(event) {
    try {
      const record = {
        eventId: event.eventId,
        timestamp: event.timestamp,
        messageId: event.messageId,
        phoneNumber: event.phoneNumber,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        description: event.description,
        googleCalendarId: event.googleCalendarId,
        status: event.status || "pending",
        correlationId: event.correlationId,
      };

      await this.dynamodb.send(
        new PutCommand({
          TableName: this.eventsTable,
          Item: record,
        })
      );

      logger.debug("event_saved", {
        eventId: event.eventId,
        title: event.title,
      });

      return record;
    } catch (error) {
      logger.error("save_event_error", {
        error: error.message,
        eventId: event.eventId,
      });

      throw error;
    }
  }

  /**
   * Obter eventos por telefone
   */
  async getEventsByPhoneNumber(phoneNumber, limit = 50) {
    try {
      const response = await this.dynamodb.send(
        new QueryCommand({
          TableName: this.eventsTable,
          IndexName: "phoneNumber-timestamp-index",
          KeyConditionExpression: "phoneNumber = :phoneNumber",
          ExpressionAttributeValues: {
            ":phoneNumber": phoneNumber,
          },
          ScanIndexForward: false,
          Limit: limit,
        })
      );

      logger.debug("events_retrieved_by_phone", {
        phoneNumber,
        count: response.Items.length,
      });

      return response.Items || [];
    } catch (error) {
      logger.error("get_events_by_phone_error", {
        error: error.message,
        phoneNumber,
      });

      throw error;
    }
  }

  /**
   * Obter todos os eventos
   */
  async getAllEvents(limit = 50) {
    try {
      const response = await this.dynamodb.send(
        new ScanCommand({
          TableName: this.eventsTable,
          Limit: limit,
        })
      );

      logger.debug("all_events_retrieved", {
        count: response.Items.length,
      });

      return response.Items || [];
    } catch (error) {
      logger.error("get_all_events_error", {
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Registrar ação em audit log
   */
  async logAudit(action, details = {}) {
    try {
      const record = {
        logId: require("uuid").v4(),
        timestamp: Date.now(),
        action,
        details,
        ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 dias
      };

      await this.dynamodb.send(
        new PutCommand({
          TableName: this.auditLogsTable,
          Item: record,
        })
      );

      logger.debug("audit_logged", { action });
    } catch (error) {
      logger.error("audit_log_error", {
        error: error.message,
        action,
      });

      // Não falhar a requisição se auditoria falhar
    }
  }

  /**
   * Buscar eventos por data
   */
  async getEventsByDateRange(startDate, endDate) {
    try {
      const response = await this.dynamodb.send(
        new ScanCommand({
          TableName: this.eventsTable,
          FilterExpression:
            "startTime BETWEEN :startDate AND :endDate",
          ExpressionAttributeValues: {
            ":startDate": startDate,
            ":endDate": endDate,
          },
        })
      );

      logger.debug("events_retrieved_by_date_range", {
        count: response.Items.length,
        startDate,
        endDate,
      });

      return response.Items || [];
    } catch (error) {
      logger.error("get_events_by_date_error", {
        error: error.message,
        startDate,
        endDate,
      });

      throw error;
    }
  }

  /**
   * Verificar duplicatas de evento
   */
  async checkDuplicateEvent(phoneNumber, title, startTime) {
    try {
      const events = await this.getEventsByPhoneNumber(phoneNumber, 50);

      const duplicates = events.filter(
        (e) =>
          e.title.toLowerCase() === title.toLowerCase() &&
          new Date(e.startTime).toDateString() ===
            new Date(startTime).toDateString()
      );

      logger.debug("duplicates_checked", {
        phoneNumber,
        title,
        duplicates: duplicates.length,
      });

      return duplicates;
    } catch (error) {
      logger.error("duplicate_check_error", {
        error: error.message,
        phoneNumber,
        title,
      });

      return [];
    }
  }

  /**
   * Obter estatísticas
   */
  async getStats() {
    try {
      const messagesResponse = await this.dynamodb.send(
        new ScanCommand({
          TableName: this.messagesTable,
          Select: "COUNT",
        })
      );

      const eventsResponse = await this.dynamodb.send(
        new ScanCommand({
          TableName: this.eventsTable,
          Select: "COUNT",
        })
      );

      const stats = {
        totalMessages: messagesResponse.Count || 0,
        totalEvents: eventsResponse.Count || 0,
        timestamp: new Date().toISOString(),
      };

      logger.info("stats_retrieved", stats);

      return stats;
    } catch (error) {
      logger.error("stats_error", {
        error: error.message,
      });

      throw error;
    }
  }
}

module.exports = DynamoDBService;
