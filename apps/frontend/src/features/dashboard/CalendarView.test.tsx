import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useEvents } from "../../hooks/useEvents";
import { useLanguage } from "../../hooks/useLanguage";
import { translations } from "../../i18n/translations";
import { CalendarView } from "./CalendarView";

vi.mock("../../hooks/useEvents", () => ({ useEvents: vi.fn() }));
vi.mock("../../hooks/useLanguage", () => ({ useLanguage: vi.fn() }));

function event(overrides: Partial<{ eventId: string; title: string; startTime: string }> = {}) {
  return {
    eventId: "e1",
    title: "Evento",
    startTime: "2026-08-10T14:00:00",
    endTime: "2026-08-10T15:00:00",
    status: "created",
    phoneNumber: "5511999999999",
    ...overrides,
  };
}

describe("CalendarView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useLanguage).mockReturnValue({
      language: "pt",
      setLanguage: vi.fn(),
      t: (key) => translations.pt[key],
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-10T09:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("mostra o mês/ano atual e o rótulo Hoje", () => {
    vi.mocked(useEvents).mockReturnValue({ loading: false, error: null, events: [] });
    render(<CalendarView />);

    expect(screen.getByText(/agosto de 2026/i)).toBeInTheDocument();
    expect(screen.getByText("Hoje")).toBeInTheDocument();
  });

  it("mostra o título do evento no dia correspondente", () => {
    vi.mocked(useEvents).mockReturnValue({
      loading: false,
      error: null,
      events: [event({ title: "Almoço", startTime: "2026-08-10T14:00:00" })],
    });
    render(<CalendarView />);

    expect(screen.getByText("Almoço")).toBeInTheDocument();
  });

  it("mostra '+N mais' quando o dia tem mais de 3 eventos", () => {
    vi.mocked(useEvents).mockReturnValue({
      loading: false,
      error: null,
      events: [
        event({ eventId: "e1", title: "Evento 1" }),
        event({ eventId: "e2", title: "Evento 2" }),
        event({ eventId: "e3", title: "Evento 3" }),
        event({ eventId: "e4", title: "Evento 4" }),
        event({ eventId: "e5", title: "Evento 5" }),
      ],
    });
    render(<CalendarView />);

    expect(screen.getByText("+2 mais")).toBeInTheDocument();
  });

  it("navega para o mês seguinte e anterior", () => {
    vi.mocked(useEvents).mockReturnValue({ loading: false, error: null, events: [] });
    render(<CalendarView />);

    fireEvent.click(screen.getByText("›"));
    expect(screen.getByText(/setembro de 2026/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText("‹"));
    fireEvent.click(screen.getByText("‹"));
    expect(screen.getByText(/julho de 2026/i)).toBeInTheDocument();
  });

  it("abre o modal de detalhes ao clicar num evento na visão de mês", () => {
    vi.mocked(useEvents).mockReturnValue({
      loading: false,
      error: null,
      events: [event({ title: "Almoço", startTime: "2026-08-10T14:00:00" })],
    });
    render(<CalendarView />);

    fireEvent.click(screen.getByText("Almoço"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Início")).toBeInTheDocument();
  });

  it("mostra o evento na visão de semana, com o horário", () => {
    vi.mocked(useEvents).mockReturnValue({
      loading: false,
      error: null,
      events: [event({ title: "Almoço", startTime: "2026-08-10T14:00:00" })],
    });
    render(<CalendarView />);

    fireEvent.click(screen.getByText("Semana"));
    expect(screen.getByText(/Almoço/)).toBeInTheDocument();
    expect(screen.getByText(/14:00/)).toBeInTheDocument();
  });

  it("mostra estado vazio na visão de dia quando não há eventos", () => {
    vi.mocked(useEvents).mockReturnValue({ loading: false, error: null, events: [] });
    render(<CalendarView />);

    fireEvent.click(screen.getByText("Dia"));
    expect(screen.getByText("Nenhum evento neste dia.")).toBeInTheDocument();
  });

  it("mostra o evento na visão de dia quando é hoje", () => {
    vi.mocked(useEvents).mockReturnValue({
      loading: false,
      error: null,
      events: [event({ title: "Almoço", startTime: "2026-08-10T14:00:00" })],
    });
    render(<CalendarView />);

    fireEvent.click(screen.getByText("Dia"));
    expect(screen.getByText("Almoço")).toBeInTheDocument();
  });
});
