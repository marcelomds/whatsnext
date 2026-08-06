/**
 * Instance Controller
 * Gerenciamento da instância WhatsApp (Evolution API) — conexão single-user
 */

const logger = require("../utils/logger");
const { errorHandler } = require("../utils/error-handler");
const WhatsAppService = require("../services/whatsapp.service");

const whatsappService = new WhatsAppService();

/**
 * GET /api/instance/status
 * Retorna o estado de conexão da instância
 */
exports.getStatus = async (event) => {
  try {
    const state = await whatsappService.getConnectionState();

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data: state }),
    };
  } catch (error) {
    logger.error("get_instance_status_error", { error: error.message });
    return errorHandler(error);
  }
};

/**
 * POST /api/instance/connect
 * Cria a instância (se necessário) e retorna o QR code para pareamento,
 * ou o estado atual, se já estiver conectada.
 */
exports.connect = async (event) => {
  try {
    await whatsappService.createInstance();
    const data = await whatsappService.getQrCode();

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, data }),
    };
  } catch (error) {
    logger.error("connect_instance_error", { error: error.message });
    return errorHandler(error);
  }
};
