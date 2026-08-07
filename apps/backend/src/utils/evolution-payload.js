/**
 * Evolution Payload
 * Normaliza o payload real do webhook MESSAGES_UPSERT da Evolution API
 * para o formato simples {from, message, timestamp} usado internamente.
 */

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

  // Ignora mensagens enviadas por nós mesmos (evita loop com nossa própria confirmação)
  if (data.key?.fromMe) return null;

  const remoteJid = data.key?.remoteJid;
  if (!remoteJid) return null;

  // Ignora grupos por enquanto (@g.us) — só conversas individuais (@s.whatsapp.net)
  if (!remoteJid.endsWith("@s.whatsapp.net")) return null;

  const from = remoteJid.replace("@s.whatsapp.net", "");
  const text = extractText(data.message);
  if (!text) return null;

  const timestamp = data.messageTimestamp
    ? Number(data.messageTimestamp) * 1000
    : Date.now();

  return { from, message: text, timestamp };
}

module.exports = { parseEvolutionWebhook };
