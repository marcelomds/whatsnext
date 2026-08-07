/**
 * Messages Controller
 * GET /api/messages
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import logger from "../utils/logger";
import { errorHandler } from "../utils/error-handler";
import DynamoDBService from "../services/dynamodb.service";

const dynamoDbService = new DynamoDBService();

/**
 * Retorna histórico de mensagens com paginação
 */
export const getMessages = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const phoneNumber = event.queryStringParameters?.phoneNumber;
    const limit = parseInt(event.queryStringParameters?.limit || "", 10) || 50;
    const offset = parseInt(event.queryStringParameters?.offset || "", 10) || 0;

    if (!phoneNumber) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "phoneNumber é obrigatório" }),
      };
    }

    const messages = await dynamoDbService.getMessages(phoneNumber, limit, offset);

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
    logger.error("get_messages_error", { error: (error as Error).message });
    return errorHandler(error as Error);
  }
};
