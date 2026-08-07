/**
 * WhatsApp Service
 * Integração com Evolution API para envio de mensagens
 */

import axios from "axios";
import type { AxiosInstance } from "axios";
import logger from "../utils/logger";
import * as sentMessageCache from "../utils/sent-message-cache";

interface AxiosLikeError {
  response?: { status?: number; data?: unknown };
  message: string;
}

interface SendMessageResult {
  key?: { id?: string };
  [key: string]: unknown;
}

interface MediaResult {
  base64: string;
  mimetype: string;
}

interface ConnectionState {
  instanceName?: string;
  state: string;
}

class WhatsAppService {
  baseUrl: string | undefined;
  apiKey: string | undefined;
  instance: string | undefined;
  client: AxiosInstance;

  constructor(instanceName?: string) {
    this.baseUrl = process.env.EVOLUTION_API_URL;
    this.apiKey = process.env.EVOLUTION_API_KEY;
    this.instance = instanceName || process.env.EVOLUTION_INSTANCE || process.env.EVOLUTION_PHONE_NUMBER;

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
  async sendMessage(to: string, text: string): Promise<SendMessageResult> {
    try {
      logger.debug("sending_whatsapp_message", { to });

      const response = await this.client.post(`/message/sendText/${this.instance}`, {
        number: to,
        text,
      });

      sentMessageCache.remember(response.data?.key?.id);

      logger.info("whatsapp_message_sent", {
        to,
        messageId: response.data?.key?.id,
      });

      return response.data;
    } catch (error) {
      const err = error as AxiosLikeError;
      logger.error("whatsapp_send_error", {
        to,
        error: err.response?.data || err.message,
      });

      throw new Error(`Falha ao enviar mensagem WhatsApp: ${err.message}`);
    }
  }

  /**
   * Busca o conteúdo (base64) de uma mídia recebida (áudio, imagem, etc.),
   * a partir da key da mensagem original do webhook.
   */
  async getMediaBase64(messageKey: Record<string, unknown>): Promise<MediaResult> {
    try {
      const response = await this.client.post(`/chat/getBase64FromMediaMessage/${this.instance}`, {
        message: { key: messageKey },
      });

      return response.data;
    } catch (error) {
      const err = error as AxiosLikeError;
      logger.error("whatsapp_get_media_error", {
        error: err.response?.data || err.message,
      });

      throw new Error(`Falha ao obter mídia do WhatsApp: ${err.message}`);
    }
  }

  /**
   * Cria a instância na Evolution API (idempotente: se já existir, ignora).
   */
  async createInstance(): Promise<unknown> {
    try {
      const response = await this.client.post("/instance/create", {
        instanceName: this.instance,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      });

      logger.info("whatsapp_instance_created", { instance: this.instance });
      return response.data;
    } catch (error) {
      const err = error as AxiosLikeError;
      const alreadyExists = err.response?.status === 403 || err.response?.status === 409;

      if (alreadyExists) {
        logger.debug("whatsapp_instance_already_exists", {
          instance: this.instance,
        });
        return null;
      }

      logger.error("whatsapp_create_instance_error", {
        error: err.response?.data || err.message,
      });

      throw new Error(`Falha ao criar instância WhatsApp: ${err.message}`);
    }
  }

  /**
   * Retorna o QR code para parear a instância (ou o estado, se já conectada).
   */
  async getQrCode(): Promise<unknown> {
    try {
      const response = await this.client.get(`/instance/connect/${this.instance}`);

      return response.data;
    } catch (error) {
      const err = error as AxiosLikeError;
      logger.error("whatsapp_qrcode_error", {
        error: err.response?.data || err.message,
      });

      throw new Error(`Falha ao obter QR code: ${err.message}`);
    }
  }

  /**
   * Retorna o estado de conexão da instância (open, connecting, close).
   */
  async getConnectionState(): Promise<ConnectionState> {
    try {
      const response = await this.client.get(`/instance/connectionState/${this.instance}`);

      return response.data?.instance;
    } catch (error) {
      const err = error as AxiosLikeError;
      const notFound = err.response?.status === 404;

      if (notFound) {
        return { instanceName: this.instance, state: "not_created" };
      }

      logger.error("whatsapp_connection_state_error", {
        error: err.response?.data || err.message,
      });

      throw new Error(`Falha ao obter status da conexão: ${err.message}`);
    }
  }

  /**
   * Desconecta a instância (logout). O registro da instância continua
   * existindo na Evolution API; um novo QR code pode ser gerado depois.
   */
  async disconnectInstance(): Promise<unknown> {
    try {
      const response = await this.client.delete(`/instance/logout/${this.instance}`);

      logger.info("whatsapp_instance_disconnected", { instance: this.instance });

      return response.data;
    } catch (error) {
      const err = error as AxiosLikeError;
      logger.error("whatsapp_disconnect_error", {
        error: err.response?.data || err.message,
      });

      throw new Error(`Falha ao desconectar instância: ${err.message}`);
    }
  }
}

export default WhatsAppService;
