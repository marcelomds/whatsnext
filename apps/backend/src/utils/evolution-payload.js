/**
 * Evolution Payload
 * Normaliza o payload real do webhook MESSAGES_UPSERT da Evolution API
 * para o formato simples {from, message, timestamp} usado internamente.
 */

const sentMessageCache = require("./sent-message-cache");

function extractText(message = {}) {
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    null
  );
}

/**
 * @returns {{from: string, message: string, timestamp: number} | null}
 * null significa "ignorar" (eco de mensagem própria, grupo, mídia sem texto, etc).
 */
function parseEvolutionWebhook(body) {
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
  const text = extractText(data.message);
  if (!text) return null;

  const timestamp = data.messageTimestamp
    ? Number(data.messageTimestamp) * 1000
    : Date.now();

  return { from, message: text, timestamp };
}

module.exports = { parseEvolutionWebhook };
