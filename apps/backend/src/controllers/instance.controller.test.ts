/**
 * Testes para Instance Controller
 */

jest.mock("../services/whatsapp.service");

import WhatsAppService from "../services/whatsapp.service";
import { getStatus, connect, disconnect } from "./instance.controller";
import type { AuthenticatedEvent } from "../types/domain";

const MockedWhatsAppService = WhatsAppService as jest.MockedClass<typeof WhatsAppService>;

const event = {
  authUser: { userId: "u1", evolutionInstance: "whatsnext-marcelo-moreira" },
} as unknown as AuthenticatedEvent;

describe("Instance Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getStatus", () => {
    it("instancia o WhatsAppService com a instância do usuário logado", async () => {
      MockedWhatsAppService.prototype.getConnectionState.mockResolvedValue({ state: "open" });

      const result = await getStatus(event);

      expect(MockedWhatsAppService).toHaveBeenCalledWith("whatsnext-marcelo-moreira");
      expect(JSON.parse(result.body).data).toEqual({ state: "open" });
    });

    it("retorna erro tratado quando o service falha", async () => {
      MockedWhatsAppService.prototype.getConnectionState.mockRejectedValue(new Error("falhou"));

      const result = await getStatus(event);
      expect(result.statusCode).toBe(500);
    });
  });

  describe("connect", () => {
    it("cria a instância e retorna o QR code", async () => {
      MockedWhatsAppService.prototype.createInstance.mockResolvedValue(null);
      MockedWhatsAppService.prototype.getQrCode.mockResolvedValue({ base64: "img..." });

      const result = await connect(event);

      expect(MockedWhatsAppService.prototype.createInstance).toHaveBeenCalled();
      expect(JSON.parse(result.body).data.base64).toBe("img...");
    });
  });

  describe("disconnect", () => {
    it("desconecta a instância do usuário logado", async () => {
      MockedWhatsAppService.prototype.disconnectInstance.mockResolvedValue({});

      const result = await disconnect(event);

      expect(MockedWhatsAppService).toHaveBeenCalledWith("whatsnext-marcelo-moreira");
      expect(JSON.parse(result.body).success).toBe(true);
    });

    it("retorna erro tratado quando o service falha", async () => {
      MockedWhatsAppService.prototype.disconnectInstance.mockRejectedValue(new Error("falhou"));

      const result = await disconnect(event);
      expect(result.statusCode).toBe(500);
    });
  });
});
