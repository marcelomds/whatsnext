/**
 * Events Controller
 * GET /api/events
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import logger from "../utils/logger";
import { errorHandler } from "../utils/error-handler";
import DynamoDBService from "../services/dynamodb.service";

const dynamoDbService = new DynamoDBService();

/**
 * Retorna eventos criados
 */
export const getEvents = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const phoneNumber = event.queryStringParameters?.phoneNumber;
    const status = event.queryStringParameters?.status;
    const limit = parseInt(event.queryStringParameters?.limit || "", 10) || 50;

    let events = phoneNumber
      ? await dynamoDbService.getEventsByPhoneNumber(phoneNumber, limit)
      : await dynamoDbService.getAllEvents(limit);

    if (status) {
      events = events.filter((e) => e.status === status);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: events,
        count: events.length,
      }),
    };
  } catch (error) {
    logger.error("get_events_error", { error: (error as Error).message });
    return errorHandler(error as Error);
  }
};
