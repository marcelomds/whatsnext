/**
 * Testes para o parser de payload da Evolution API
 */

import { parseEvolutionWebhook } from "./evolution-payload";
import type { EvolutionWebhookBody } from "./evolution-payload";
import * as sentMessageCache from "./sent-message-cache";

function buildPayload(overrides: { data?: Record<string, unknown> } = {}): EvolutionWebhookBody {
  const { data: dataOverrides, ...topOverrides } = overrides;

  return {
    event: "messages.upsert",
    instance: "whatsnext-marcelo-moreira",
    data: {
      key: {
        remoteJid: "5585998193813@s.whatsapp.net",
        fromMe: false,
        id: "3EB0ABC123",
      },
      pushName: "Marcelo",
      message: { conversation: "Segunda 15h dentista" },
      messageType: "conversation",
      messageTimestamp: 1723000000,
      ...dataOverrides,
    },
    ...topOverrides,
  } as unknown as EvolutionWebhookBody;
}

describe("parseEvolutionWebhook", () => {
  it("extrai from/message/timestamp de uma mensagem de texto simples", () => {
    const result = parseEvolutionWebhook(buildPayload());

    expect(result).toEqual({
      from: "5585998193813",
      message: "Segunda 15h dentista",
      timestamp: 1723000000000,
    });
  });

  it("extrai texto de extendedTextMessage", () => {
    const payload = buildPayload({
      data: {
        message: { extendedTextMessage: { text: "Terça 10h reunião" } },
      },
    });

    const result = parseEvolutionWebhook(payload);

    expect(result?.message).toBe("Terça 10h reunião");
  });

  it("extrai legenda de imageMessage", () => {
    const payload = buildPayload({
      data: { message: { imageMessage: { caption: "Marca isso pra sexta" } } },
    });

    expect(parseEvolutionWebhook(payload)?.message).toBe("Marca isso pra sexta");
  });

  it("processa mensagem fromMe quando não é eco da nossa confirmação (anotação pra si mesmo)", () => {
    const payload = buildPayload({
      data: { key: { fromMe: true, remoteJid: "5585998193813@s.whatsapp.net", id: "MINHA-MSG-1" } },
    });

    expect(parseEvolutionWebhook(payload)).toEqual({
      from: "5585998193813",
      message: "Segunda 15h dentista",
      timestamp: 1723000000000,
    });
  });

  it("ignora o eco da nossa própria confirmação (fromMe com id que nós enviamos)", () => {
    sentMessageCache.remember("BOT-CONFIRMACAO-1");
    const payload = buildPayload({
      data: { key: { fromMe: true, remoteJid: "5585998193813@s.whatsapp.net", id: "BOT-CONFIRMACAO-1" } },
    });

    expect(parseEvolutionWebhook(payload)).toBeNull();
  });

  it("ignora mensagens de grupo (@g.us)", () => {
    const payload = buildPayload({
      data: { key: { fromMe: false, remoteJid: "123456-group@g.us" } },
    });

    expect(parseEvolutionWebhook(payload)).toBeNull();
  });

  it("usa remoteJidAlt quando o WhatsApp endereça pelo LID privado (@lid)", () => {
    const payload = buildPayload({
      data: {
        key: {
          fromMe: true,
          remoteJid: "29549559599289@lid",
          remoteJidAlt: "5585998193813@s.whatsapp.net",
          id: "MINHA-MSG-LID-1",
        },
      },
    });

    expect(parseEvolutionWebhook(payload)).toEqual({
      from: "5585998193813",
      message: "Segunda 15h dentista",
      timestamp: 1723000000000,
    });
  });

  it("ignora @lid sem remoteJidAlt utilizável", () => {
    const payload = buildPayload({
      data: { key: { fromMe: false, remoteJid: "29549559599289@lid", remoteJidAlt: undefined } },
    });

    expect(parseEvolutionWebhook(payload)).toBeNull();
  });

  it("retorna dados de áudio (key + mimetype) pra mensagem de voz", () => {
    const payload = buildPayload({
      data: { message: { audioMessage: { url: "https://...", mimetype: "audio/ogg; codecs=opus" } } },
    });

    const result = parseEvolutionWebhook(payload);

    expect(result?.from).toBe("5585998193813");
    expect(result?.message).toBeUndefined();
    expect(result?.audio).toEqual({
      key: expect.objectContaining({ id: "3EB0ABC123" }),
      mimetype: "audio/ogg; codecs=opus",
    });
  });

  it("ignora mensagens sem texto nem áudio extraível (ex: figurinha)", () => {
    const payload = buildPayload({
      data: { message: { stickerMessage: { url: "https://..." } } },
    });

    expect(parseEvolutionWebhook(payload)).toBeNull();
  });

  it("retorna null quando não há campo data", () => {
    expect(parseEvolutionWebhook({ event: "connection.update" } as unknown as EvolutionWebhookBody)).toBeNull();
  });

  it("retorna null quando remoteJid está ausente", () => {
    const payload = buildPayload({ data: { key: { fromMe: false, remoteJid: undefined } } });

    expect(parseEvolutionWebhook(payload)).toBeNull();
  });

  it("usa Date.now() como timestamp quando messageTimestamp está ausente", () => {
    const before = Date.now();
    const payload = buildPayload({ data: { messageTimestamp: undefined } });

    const result = parseEvolutionWebhook(payload);

    expect(result?.timestamp).toBeGreaterThanOrEqual(before);
  });
});
