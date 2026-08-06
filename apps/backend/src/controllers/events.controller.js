/**
 * Events Controller
 * GET /api/events
 */

const logger = require("../utils/logger");
const { errorHandler } = require("../utils/error-handler");
const DynamoDBService = require("../services/dynamodb.service");

const dynamoDbService = new DynamoDBService();

/**
 * Retorna eventos criados
 */
exports.getEvents = async (event) => {
  try {
    const phoneNumber = event.queryStringParameters?.phoneNumber;
    const status = event.queryStringParameters?.status;
    const limit = parseInt(event.queryStringParameters?.limit) || 50;

    let events;
    if (phoneNumber) {
      events = await dynamoDbService.getEventsByPhoneNumber(
        phoneNumber,
        limit
      );
    } else {
      events = await dynamoDbService.getAllEvents(limit);
    }

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
    logger.error("get_events_error", { error: error.message });
    return errorHandler(error);
  }
};
