/**
 * WhatsApp Service
 * Integração com Evolution API para envio de mensagens
 */

const axios = require("axios");
const logger = require("../utils/logger");

class WhatsAppService {
  constructor() {
    this.baseUrl = process.env.EVOLUTION_API_URL;
    this.apiKey = process.env.EVOLUTION_API_KEY;
    this.instance =
      process.env.EVOLUTION_INSTANCE || process.env.EVOLUTION_PHONE_NUMBER;

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        apikey: this.apiKey,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });
  }

  /**
   * Envia mensagem de texto via Evolution API
   */
  async sendMessage(to, text) {
    try {
      logger.debug("sending_whatsapp_message", { to });

      const response = await this.client.post(
        `/message/sendText/${this.instance}`,
        {
          number: to,
          text,
        }
      );

      logger.info("whatsapp_message_sent", {
        to,
        messageId: response.data?.key?.id,
      });

      return response.data;
    } catch (error) {
      logger.error("whatsapp_send_error", {
        to,
        error: error.response?.data || error.message,
      });

      throw new Error(`Falha ao enviar mensagem WhatsApp: ${error.message}`);
    }
  }
}

module.exports = WhatsAppService;
