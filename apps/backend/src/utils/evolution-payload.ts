/**
 * Evolution Payload
 * Normaliza o payload real do webhook MESSAGES_UPSERT da Evolution API
 * para o formato simples {from, message, timestamp} usado internamente.
 */

import * as sentMessageCache from "./sent-message-cache";
import type { EvolutionParsedMessage } from "../types/domain";

interface EvolutionWebhookKey {
  fromMe?: boolean;
  id?: string;
  remoteJid?: string;
  remoteJidAlt?: string;
}

interface EvolutionWebhookMessage {
  conversation?: string;
  extendedTextMessage?: { text?: string };
  imageMessage?: { caption?: string };
  videoMessage?: { caption?: string };
  audioMessage?: { mimetype?: string };
}

interface EvolutionWebhookData {
  key?: EvolutionWebhookKey;
  message?: EvolutionWebhookMessage;
  messageTimestamp?: number | string;
}

export interface EvolutionWebhookBody {
  data?: EvolutionWebhookData;
}

function extractText(message: EvolutionWebhookMessage = {}): string | null {
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    null
  );
}

/**
 * @returns null significa "ignorar" (eco de mensagem própria, grupo, mídia
 * sem texto/áudio, etc). Áudio vem sem "message" — quem chama precisa
 * transcrever antes de seguir.
 */
function parseEvolutionWebhook(body: EvolutionWebhookBody): EvolutionParsedMessage | null {
  const data = body?.data;
  if (!data) return null;

  // Ignora só o eco da nossa própria confirmação (evita loop). Mensagens
  // fromMe que não são esse eco são comandos do usuário pra si mesmo.
  if (data.key?.fromMe && sentMessageCache.wasSentByUs(data.key?.id)) return null;

  const remoteJid = data.key?.remoteJid;
  if (!remoteJid) return null;

  // Ignora grupos por enquanto (@g.us) — só conversas individuais
  if (remoteJid.endsWith("@g.us")) return null;

  // WhatsApp pode endereçar o contato pelo LID privado (@lid) em vez do
  // número de telefone; nesse caso o número real vem em remoteJidAlt.
  const phoneJid = remoteJid.endsWith("@lid") ? data.key?.remoteJidAlt : remoteJid;
  if (!phoneJid || !phoneJid.endsWith("@s.whatsapp.net")) return null;

  const from = phoneJid.replace("@s.whatsapp.net", "");
  const timestamp = data.messageTimestamp ? Number(data.messageTimestamp) * 1000 : Date.now();

  const audioMessage = data.message?.audioMessage;
  if (audioMessage) {
    return {
      from,
      timestamp,
      audio: { key: data.key as Record<string, unknown>, mimetype: audioMessage.mimetype || "audio/ogg" },
    };
  }

  const text = extractText(data.message);
  if (!text) return null;

  return { from, message: text, timestamp };
}

export { parseEvolutionWebhook };
