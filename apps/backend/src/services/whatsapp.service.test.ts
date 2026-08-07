/**
 * Testes para WhatsApp Service
 */

const mockClient = {
  post: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
};

jest.mock("axios", () => ({
  create: jest.fn(() => mockClient),
}));

import WhatsAppService from "./whatsapp.service";

describe("WhatsApp Service", () => {
  let service: WhatsAppService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WhatsAppService("whatsnext-marcelo-moreira");
  });

  it("usa o instanceName passado no construtor em vez da env var global", () => {
    process.env.EVOLUTION_INSTANCE = "instancia-global";
    const scoped = new WhatsAppService("instancia-do-usuario");

    expect(scoped.instance).toBe("instancia-do-usuario");
  });

  describe("sendMessage", () => {
    it("envia number/text pro endpoint correto", async () => {
      mockClient.post.mockResolvedValue({ data: { key: { id: "msg1" } } });

      const result = await service.sendMessage("5511999999999", "Olá");

      expect(mockClient.post).toHaveBeenCalledWith("/message/sendText/whatsnext-marcelo-moreira", {
        number: "5511999999999",
        text: "Olá",
      });
      expect(result.key?.id).toBe("msg1");
    });

    it("envolve erro numa mensagem em português", async () => {
      mockClient.post.mockRejectedValue(new Error("timeout"));

      await expect(service.sendMessage("5511999999999", "Olá")).rejects.toThrow(
        "Falha ao enviar mensagem WhatsApp: timeout"
      );
    });
  });

  describe("createInstance", () => {
    it("cria a instância com integration WHATSAPP-BAILEYS", async () => {
      mockClient.post.mockResolvedValue({ data: { instance: {} } });

      await service.createInstance();

      expect(mockClient.post).toHaveBeenCalledWith("/instance/create", {
        instanceName: "whatsnext-marcelo-moreira",
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      });
    });

    it("retorna null (idempotente) quando a instância já existe (403/409)", async () => {
      mockClient.post.mockRejectedValue({ response: { status: 409 } });
      expect(await service.createInstance()).toBeNull();
    });

    it("lança erro para falhas que não são de duplicidade", async () => {
      mockClient.post.mockRejectedValue({ message: "network error" });
      await expect(service.createInstance()).rejects.toThrow("Falha ao criar instância WhatsApp: network error");
    });
  });

  describe("getQrCode", () => {
    it("retorna os dados do QR code", async () => {
      mockClient.get.mockResolvedValue({ data: { base64: "data:image/png;base64,..." } });
      const result = (await service.getQrCode()) as { base64: string };
      expect(result.base64).toContain("base64");
    });
  });

  describe("getConnectionState", () => {
    it("retorna o estado da instância", async () => {
      mockClient.get.mockResolvedValue({ data: { instance: { state: "open" } } });
      expect(await service.getConnectionState()).toEqual({ state: "open" });
    });

    it("retorna not_created quando a Evolution API responde 404", async () => {
      mockClient.get.mockRejectedValue({ response: { status: 404 } });

      const result = await service.getConnectionState();
      expect(result).toEqual({ instanceName: "whatsnext-marcelo-moreira", state: "not_created" });
    });

    it("lança erro para falhas inesperadas", async () => {
      mockClient.get.mockRejectedValue({ message: "falha de rede" });
      await expect(service.getConnectionState()).rejects.toThrow("Falha ao obter status da conexão: falha de rede");
    });
  });

  describe("getMediaBase64", () => {
    it("busca o base64 da mídia a partir da key da mensagem", async () => {
      mockClient.post.mockResolvedValue({
        data: { base64: "AAAA", mimetype: "audio/ogg; codecs=opus" },
      });

      const key = { id: "3EB0", remoteJid: "5511999999999@s.whatsapp.net" };
      const result = await service.getMediaBase64(key);

      expect(mockClient.post).toHaveBeenCalledWith("/chat/getBase64FromMediaMessage/whatsnext-marcelo-moreira", {
        message: { key },
      });
      expect(result).toEqual({ base64: "AAAA", mimetype: "audio/ogg; codecs=opus" });
    });

    it("envolve erro numa mensagem em português", async () => {
      mockClient.post.mockRejectedValue({ message: "falhou" });
      await expect(service.getMediaBase64({ id: "x" })).rejects.toThrow("Falha ao obter mídia do WhatsApp: falhou");
    });
  });

  describe("disconnectInstance", () => {
    it("chama o endpoint de logout da instância", async () => {
      mockClient.delete.mockResolvedValue({ data: { success: true } });

      await service.disconnectInstance();

      expect(mockClient.delete).toHaveBeenCalledWith("/instance/logout/whatsnext-marcelo-moreira");
    });

    it("envolve erro numa mensagem em português", async () => {
      mockClient.delete.mockRejectedValue({ message: "falhou" });
      await expect(service.disconnectInstance()).rejects.toThrow("Falha ao desconectar instância: falhou");
    });
  });
});
