import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useEvents } from "../../hooks/useEvents";
import { useLanguage } from "../../hooks/useLanguage";
import { translations } from "../../i18n/translations";
import { NextEventCard } from "./NextEventCard";

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

describe("NextEventCard", () => {
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

  it("não renderiza nada enquanto carrega", () => {
    vi.mocked(useEvents).mockReturnValue({ loading: true, error: null, events: [] });
    const { container } = render(<NextEventCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it("não renderiza nada quando não há eventos futuros", () => {
    vi.mocked(useEvents).mockReturnValue({
      loading: false,
      error: null,
      events: [event({ startTime: "2026-08-01T10:00:00" })],
    });
    const { container } = render(<NextEventCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra o evento futuro mais próximo com 'hoje'", () => {
    vi.mocked(useEvents).mockReturnValue({
      loading: false,
      error: null,
      events: [
        event({ eventId: "e2", title: "Depois", startTime: "2026-08-20T10:00:00" }),
        event({ eventId: "e1", title: "Almoço", startTime: "2026-08-10T14:00:00" }),
      ],
    });

    render(<NextEventCard />);

    expect(screen.getByText("Almoço")).toBeInTheDocument();
    expect(screen.getByText(/hoje/)).toBeInTheDocument();
  });

  it("mostra 'amanhã' quando o evento é no dia seguinte", () => {
    vi.mocked(useEvents).mockReturnValue({
      loading: false,
      error: null,
      events: [event({ startTime: "2026-08-11T10:00:00" })],
    });

    render(<NextEventCard />);
    expect(screen.getByText(/amanhã/)).toBeInTheDocument();
  });

  it("mostra 'em N dias' para eventos mais distantes", () => {
    vi.mocked(useEvents).mockReturnValue({
      loading: false,
      error: null,
      events: [event({ startTime: "2026-08-15T10:00:00" })],
    });

    render(<NextEventCard />);
    expect(screen.getByText(/em 5 dias/)).toBeInTheDocument();
  });
});
