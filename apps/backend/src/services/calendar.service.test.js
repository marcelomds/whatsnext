/**
 * Testes para Calendar Service
 */

const mockOAuth2Instance = {
  setCredentials: jest.fn(),
  refreshAccessToken: jest.fn(),
};

const mockCalendarEvents = {
  insert: jest.fn(),
  get: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  list: jest.fn(),
};

const mockCalendarList = { list: jest.fn() };

jest.mock("googleapis", () => ({
  google: {
    auth: { OAuth2: jest.fn(() => mockOAuth2Instance) },
    calendar: jest.fn(() => ({ events: mockCalendarEvents, calendarList: mockCalendarList })),
  },
}));

const CalendarService = require("./calendar.service");

describe("Calendar Service", () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CalendarService();
  });

  describe("createEvent", () => {
    it("cria evento e retorna dados normalizados", async () => {
      mockCalendarEvents.insert.mockResolvedValue({
        data: {
          id: "evt1",
          summary: "Reunião com João",
          start: { dateTime: "2026-08-10T14:00:00-03:00" },
          end: { dateTime: "2026-08-10T15:00:00-03:00" },
          htmlLink: "https://calendar.google.com/evt1",
        },
      });

      const result = await service.createEvent({
        title: "Reunião com João",
        startTime: "2026-08-10T14:00:00",
        endTime: "2026-08-10T15:00:00",
      });

      expect(result.id).toBe("evt1");
      expect(result.htmlLink).toBe("https://calendar.google.com/evt1");

      const insertArgs = mockCalendarEvents.insert.mock.calls[0][0];
      expect(insertArgs.resource.reminders.overrides).toEqual([
        { method: "popup", minutes: 10 },
        { method: "email", minutes: 24 * 60 },
      ]);
    });

    it("usa descrição default quando não informada", async () => {
      mockCalendarEvents.insert.mockResolvedValue({
        data: { id: "e1", summary: "X", start: {}, end: {} },
      });

      await service.createEvent({ title: "X", startTime: "t1", endTime: "t2" });

      const insertArgs = mockCalendarEvents.insert.mock.calls[0][0];
      expect(insertArgs.resource.description).toContain("Criado via WhatsApp");
    });

    it("envolve erro da API do Google numa mensagem em português", async () => {
      mockCalendarEvents.insert.mockRejectedValue(new Error("insufficient permission"));

      await expect(
        service.createEvent({ title: "X", startTime: "t1", endTime: "t2" })
      ).rejects.toThrow("Falha ao criar evento no Google Calendar: insufficient permission");
    });
  });

  describe("getEvent", () => {
    it("retorna o evento normalizado", async () => {
      mockCalendarEvents.get.mockResolvedValue({
        data: { id: "e1", summary: "X", start: { dateTime: "t1" }, end: { dateTime: "t2" } },
      });

      expect(await service.getEvent("e1")).toEqual({
        id: "e1",
        title: "X",
        startTime: "t1",
        endTime: "t2",
      });
    });
  });

  describe("updateEvent", () => {
    it("envia os campos atualizados pro Google Calendar", async () => {
      mockCalendarEvents.update.mockResolvedValue({
        data: { id: "e1", summary: "Novo título", start: { dateTime: "t1" }, end: { dateTime: "t2" } },
      });

      const result = await service.updateEvent("e1", {
        title: "Novo título",
        startTime: "t1",
        endTime: "t2",
      });

      expect(result.title).toBe("Novo título");
      expect(mockCalendarEvents.update).toHaveBeenCalledWith(
        expect.objectContaining({ eventId: "e1" })
      );
    });
  });

  describe("deleteEvent", () => {
    it("retorna success true", async () => {
      mockCalendarEvents.delete.mockResolvedValue({});
      expect(await service.deleteEvent("e1")).toEqual({ success: true });
    });
  });

  describe("listEvents", () => {
    it("normaliza eventos com dateTime", async () => {
      mockCalendarEvents.list.mockResolvedValue({
        data: {
          items: [
            { id: "e1", summary: "A", start: { dateTime: "t1" }, end: { dateTime: "t2" } },
          ],
        },
      });

      const result = await service.listEvents();
      expect(result).toEqual([{ id: "e1", title: "A", startTime: "t1", endTime: "t2", description: undefined }]);
    });

    it("usa 'date' (dia inteiro) quando dateTime não existe", async () => {
      mockCalendarEvents.list.mockResolvedValue({
        data: {
          items: [{ id: "e1", summary: "Feriado", start: { date: "2026-08-10" }, end: { date: "2026-08-11" } }],
        },
      });

      const result = await service.listEvents();
      expect(result[0].startTime).toBe("2026-08-10");
    });
  });

  describe("searchEvents", () => {
    it("filtra por título, case-insensitive", async () => {
      mockCalendarEvents.list.mockResolvedValue({
        data: {
          items: [
            { id: "e1", summary: "Reunião com João", start: { dateTime: "t1" }, end: { dateTime: "t2" } },
            { id: "e2", summary: "Almoço", start: { dateTime: "t1" }, end: { dateTime: "t2" } },
          ],
        },
      });

      const result = await service.searchEvents("joão");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("e1");
    });
  });

  describe("isTimeAvailable", () => {
    it("disponível quando não há conflitos", async () => {
      mockCalendarEvents.list.mockResolvedValue({ data: { items: [] } });

      const result = await service.isTimeAvailable("t1", "t2");
      expect(result.available).toBe(true);
    });

    it("indisponível quando há eventos no período", async () => {
      mockCalendarEvents.list.mockResolvedValue({
        data: { items: [{ id: "e1", summary: "X", start: { dateTime: "t1" }, end: { dateTime: "t2" } }] },
      });

      const result = await service.isTimeAvailable("t1", "t2");
      expect(result.available).toBe(false);
      expect(result.conflicts).toHaveLength(1);
    });
  });

  describe("refreshAccessToken", () => {
    it("atualiza as credenciais do client", async () => {
      mockOAuth2Instance.refreshAccessToken.mockResolvedValue({
        credentials: { access_token: "novo-token" },
      });

      const result = await service.refreshAccessToken();

      expect(result.access_token).toBe("novo-token");
      expect(mockOAuth2Instance.setCredentials).toHaveBeenCalledWith({ access_token: "novo-token" });
    });
  });

  describe("getAvailableCalendars", () => {
    it("normaliza a lista de calendários", async () => {
      mockCalendarList.list.mockResolvedValue({
        data: { items: [{ id: "primary", summary: "Marcelo", primary: true }] },
      });

      const result = await service.getAvailableCalendars();
      expect(result).toEqual([{ id: "primary", summary: "Marcelo", primary: true }]);
    });
  });
});
