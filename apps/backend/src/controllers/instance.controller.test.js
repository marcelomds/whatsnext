/**
 * Testes para Instance Controller
 */

jest.mock("../services/whatsapp.service");

const WhatsAppService = require("../services/whatsapp.service");
const { getStatus, connect, disconnect } = require("./instance.controller");

const event = { authUser: { userId: "u1", evolutionInstance: "whatsnext-marcelo-moreira" } };

describe("Instance Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getStatus", () => {
    it("instancia o WhatsAppService com a instância do usuário logado", async () => {
      WhatsAppService.prototype.getConnectionState.mockResolvedValue({ state: "open" });

      const result = await getStatus(event);

      expect(WhatsAppService).toHaveBeenCalledWith("whatsnext-marcelo-moreira");
      expect(JSON.parse(result.body).data).toEqual({ state: "open" });
    });

    it("retorna erro tratado quando o service falha", async () => {
      WhatsAppService.prototype.getConnectionState.mockRejectedValue(new Error("falhou"));

      const result = await getStatus(event);
      expect(result.statusCode).toBe(500);
    });
  });

  describe("connect", () => {
    it("cria a instância e retorna o QR code", async () => {
      WhatsAppService.prototype.createInstance.mockResolvedValue(null);
      WhatsAppService.prototype.getQrCode.mockResolvedValue({ base64: "img..." });

      const result = await connect(event);

      expect(WhatsAppService.prototype.createInstance).toHaveBeenCalled();
      expect(JSON.parse(result.body).data.base64).toBe("img...");
    });
  });

  describe("disconnect", () => {
    it("desconecta a instância do usuário logado", async () => {
      WhatsAppService.prototype.disconnectInstance.mockResolvedValue({});

      const result = await disconnect(event);

      expect(WhatsAppService).toHaveBeenCalledWith("whatsnext-marcelo-moreira");
      expect(JSON.parse(result.body).success).toBe(true);
    });

    it("retorna erro tratado quando o service falha", async () => {
      WhatsAppService.prototype.disconnectInstance.mockRejectedValue(new Error("falhou"));

      const result = await disconnect(event);
      expect(result.statusCode).toBe(500);
    });
  });
});
