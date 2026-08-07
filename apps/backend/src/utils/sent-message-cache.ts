/**
 * Rastreia IDs de mensagens que o próprio bot enviou, pra distinguir
 * o eco da nossa confirmação (fromMe: true) de um comando real do
 * usuário mandado pra si mesmo (chat "Mensagens para você").
 */

import Cache from "node-cache";

const cache = new Cache({ stdTTL: 300 });

function remember(messageId: string | undefined): void {
  if (messageId) cache.set(messageId, true);
}

function wasSentByUs(messageId: string | undefined): boolean {
  return Boolean(messageId && cache.get(messageId));
}

export { remember, wasSentByUs };
