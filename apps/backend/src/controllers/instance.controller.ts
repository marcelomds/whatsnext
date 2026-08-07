/**
 * Instance Controller
 * Gerenciamento da instância WhatsApp (Evolution API) do usuário autenticado
 */

import type { APIGatewayProxyResult } from "aws-lambda";
import logger from "../utils/logger";
import { errorHandler } from "../utils/error-handler";
import WhatsAppService from "../services/whatsapp.service";
import type { AuthenticatedEvent } from "../types/domain";

/**
 * GET /api/instance/status
 * Retorna o estado de conexão da instância do usuário logado
 */
export const getStatus = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  try {
    const whatsappService = new WhatsAppService(event.authUser.evolutionInstance);
    const state = await whatsappService.getConnectionState();

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: state }),
    };
  } catch (error) {
    logger.error("get_instance_status_error", { error: (error as Error).message });
    return errorHandler(error as Error);
  }
};

/**
 * POST /api/instance/connect
 * Cria a instância (se necessário) e retorna o QR code para pareamento,
 * ou o estado atual, se já estiver conectada.
 */
export const connect = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  try {
    const whatsappService = new WhatsAppService(event.authUser.evolutionInstance);
    await whatsappService.createInstance();
    const data = await whatsappService.getQrCode();

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data }),
    };
  } catch (error) {
    logger.error("connect_instance_error", { error: (error as Error).message });
    return errorHandler(error as Error);
  }
};

/**
 * POST /api/instance/disconnect
 * Desconecta a instância do usuário logado (logout)
 */
export const disconnect = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  try {
    const whatsappService = new WhatsAppService(event.authUser.evolutionInstance);
    await whatsappService.disconnectInstance();

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    logger.error("disconnect_instance_error", { error: (error as Error).message });
    return errorHandler(error as Error);
  }
};
