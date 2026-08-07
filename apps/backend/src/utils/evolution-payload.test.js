/**
 * Testes para o parser de payload da Evolution API
 */

const { parseEvolutionWebhook } = require("./evolution-payload");

function buildPayload({ data: dataOverrides, ...topOverrides } = {}) {
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
  };
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

    expect(result.message).toBe("Terça 10h reunião");
  });

  it("extrai legenda de imageMessage", () => {
    const payload = buildPayload({
      data: { message: { imageMessage: { caption: "Marca isso pra sexta" } } },
    });

    expect(parseEvolutionWebhook(payload).message).toBe("Marca isso pra sexta");
  });

  it("ignora mensagens enviadas por nós mesmos (fromMe)", () => {
    const payload = buildPayload({ data: { key: { fromMe: true, remoteJid: "5585998193813@s.whatsapp.net" } } });

    expect(parseEvolutionWebhook(payload)).toBeNull();
  });

  it("ignora mensagens de grupo (@g.us)", () => {
    const payload = buildPayload({
      data: { key: { fromMe: false, remoteJid: "123456-group@g.us" } },
    });

    expect(parseEvolutionWebhook(payload)).toBeNull();
  });

  it("ignora mensagens sem texto extraível (ex: áudio)", () => {
    const payload = buildPayload({
      data: { message: { audioMessage: { url: "https://..." } } },
    });

    expect(parseEvolutionWebhook(payload)).toBeNull();
  });

  it("retorna null quando não há campo data", () => {
    expect(parseEvolutionWebhook({ event: "connection.update" })).toBeNull();
  });

  it("retorna null quando remoteJid está ausente", () => {
    const payload = buildPayload({ data: { key: { fromMe: false, remoteJid: undefined } } });

    expect(parseEvolutionWebhook(payload)).toBeNull();
  });

  it("usa Date.now() como timestamp quando messageTimestamp está ausente", () => {
    const before = Date.now();
    const payload = buildPayload({ data: { messageTimestamp: undefined } });

    const result = parseEvolutionWebhook(payload);

    expect(result.timestamp).toBeGreaterThanOrEqual(before);
  });
});
