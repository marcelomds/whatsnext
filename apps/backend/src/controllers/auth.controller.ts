/**
 * Auth Controller
 * POST /api/auth/register, POST /api/auth/login, GET /api/auth/me
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import * as authService from "../services/auth.service";
import DynamoDBService from "../services/dynamodb.service";
import { errorHandler, ValidationError, NotFoundError } from "../utils/error-handler";
import type { AuthenticatedEvent } from "../types/domain";

const dynamoDbService = new DynamoDBService();

interface RegisterBody {
  email?: string;
  password?: string;
  name?: string;
  evolutionInstance?: string;
}

export const register = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body: RegisterBody = JSON.parse(event.body || "{}");
    const { email, password, name, evolutionInstance } = body;

    const missing = (["email", "password", "name"] as const).filter((field) => !body[field]);
    if (missing.length > 0) {
      throw new ValidationError(
        "Campos obrigatórios faltando",
        missing.map((field) => ({ field }))
      );
    }

    const result = await authService.register(email as string, password as string, name as string, evolutionInstance);

    return {
      statusCode: 201,
      body: JSON.stringify({ success: true, data: result }),
    };
  } catch (error) {
    return errorHandler(error as Error);
  }
};

interface LoginBody {
  email?: string;
  password?: string;
}

export const login = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body: LoginBody = JSON.parse(event.body || "{}");
    const { email, password } = body;

    const missing = (["email", "password"] as const).filter((field) => !body[field]);
    if (missing.length > 0) {
      throw new ValidationError(
        "Campos obrigatórios faltando",
        missing.map((field) => ({ field }))
      );
    }

    const result = await authService.login(email as string, password as string);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: result }),
    };
  } catch (error) {
    return errorHandler(error as Error);
  }
};

export const me = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
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
    return errorHandler(error as Error);
  }
};
