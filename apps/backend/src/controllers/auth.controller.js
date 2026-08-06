/**
 * Auth Controller
 * POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
 */

const authService = require("../services/auth.service");
const DynamoDBService = require("../services/dynamodb.service");
const { errorHandler, ValidationError, NotFoundError } = require("../utils/error-handler");

const dynamoDbService = new DynamoDBService();

exports.register = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { email, password, name, evolutionInstance } = body;

    const missing = ["email", "password", "name"].filter((field) => !body[field]);
    if (missing.length > 0) {
      throw new ValidationError("Campos obrigatórios faltando", missing);
    }

    const result = await authService.register(email, password, name, evolutionInstance);

    return {
      statusCode: 201,
      body: JSON.stringify({ success: true, data: result }),
    };
  } catch (error) {
    return errorHandler(error);
  }
};

exports.login = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { email, password } = body;

    const missing = ["email", "password"].filter((field) => !body[field]);
    if (missing.length > 0) {
      throw new ValidationError("Campos obrigatórios faltando", missing);
    }

    const result = await authService.login(email, password);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: result }),
    };
  } catch (error) {
    return errorHandler(error);
  }
};

exports.me = async (event) => {
  try {
    const user = await dynamoDbService.getUserById(event.authUser.userId);

    if (!user) {
      throw new NotFoundError("Usuário");
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: {
          userId: user.userId,
          email: user.email,
          name: user.name,
          evolutionInstance: user.evolutionInstance,
        },
      }),
    };
  } catch (error) {
    return errorHandler(error);
  }
};
