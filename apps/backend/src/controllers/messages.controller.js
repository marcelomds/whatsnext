/**
 * Messages Controller
 * GET /api/messages
 */

const logger = require("../utils/logger");
const { errorHandler } = require("../utils/error-handler");
const DynamoDBService = require("../services/dynamodb.service");

const dynamoDbService = new DynamoDBService();

/**
 * Retorna histórico de mensagens com paginação
 */
exports.getMessages = async (event) => {
  try {
    const phoneNumber = event.queryStringParameters?.phoneNumber;
    const limit = parseInt(event.queryStringParameters?.limit) || 50;
    const offset = parseInt(event.queryStringParameters?.offset) || 0;

    if (!phoneNumber) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "phoneNumber é obrigatório" }),
      };
    }

    const messages = await dynamoDbService.getMessages(
      phoneNumber,
      limit,
      offset
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: messages,
        count: messages.length,
        pagination: {
          limit,
          offset,
          hasMore: messages.length === limit,
        },
      }),
    };
  } catch (error) {
    logger.error("get_messages_error", { error: error.message });
    return errorHandler(error);
  }
};
