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

  /**
   * Cria a instância na Evolution API (idempotente: se já existir, ignora).
   */
  async createInstance() {
    try {
      const response = await this.client.post("/instance/create", {
        instanceName: this.instance,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      });

      logger.info("whatsapp_instance_created", { instance: this.instance });
      return response.data;
    } catch (error) {
      const alreadyExists =
        error.response?.status === 403 || error.response?.status === 409;

      if (alreadyExists) {
        logger.debug("whatsapp_instance_already_exists", {
          instance: this.instance,
        });
        return null;
      }

      logger.error("whatsapp_create_instance_error", {
        error: error.response?.data || error.message,
      });

      throw new Error(`Falha ao criar instância WhatsApp: ${error.message}`);
    }
  }

  /**
   * Retorna o QR code para parear a instância (ou o estado, se já conectada).
   */
  async getQrCode() {
    try {
      const response = await this.client.get(
        `/instance/connect/${this.instance}`
      );

      return response.data;
    } catch (error) {
      logger.error("whatsapp_qrcode_error", {
        error: error.response?.data || error.message,
      });

      throw new Error(`Falha ao obter QR code: ${error.message}`);
    }
  }

  /**
   * Retorna o estado de conexão da instância (open, connecting, close).
   */
  async getConnectionState() {
    try {
      const response = await this.client.get(
        `/instance/connectionState/${this.instance}`
      );

      return response.data?.instance;
    } catch (error) {
      const notFound = error.response?.status === 404;

      if (notFound) {
        return { instanceName: this.instance, state: "not_created" };
      }

      logger.error("whatsapp_connection_state_error", {
        error: error.response?.data || error.message,
      });

      throw new Error(`Falha ao obter status da conexão: ${error.message}`);
    }
  }
}

module.exports = WhatsAppService;
