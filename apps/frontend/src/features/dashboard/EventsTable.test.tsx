import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useEvents } from "../../hooks/useEvents";
import { useLanguage } from "../../hooks/useLanguage";
import { translations } from "../../i18n/translations";
import { EventsTable } from "./EventsTable";

vi.mock("../../hooks/useEvents", () => ({ useEvents: vi.fn() }));
vi.mock("../../hooks/useLanguage", () => ({ useLanguage: vi.fn() }));

describe("EventsTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useLanguage).mockReturnValue({
      language: "pt",
      setLanguage: vi.fn(),
      t: (key) => translations.pt[key],
    });
  });

  it("mostra a contagem e as linhas de eventos", () => {
    vi.mocked(useEvents).mockReturnValue({
      loading: false,
      error: null,
      events: [
        {
          eventId: "e1",
          title: "Reunião com João",
          startTime: "2026-08-10T14:00:00.000Z",
          endTime: "2026-08-10T15:00:00.000Z",
          status: "created",
          phoneNumber: "5511999999999",
        },
      ],
    });

    render(<EventsTable />);

    expect(screen.getByText("Eventos criados (1)")).toBeInTheDocument();
    expect(screen.getByText("Reunião com João")).toBeInTheDocument();
    expect(screen.getByText("Criado")).toBeInTheDocument();
  });

  it("mostra mensagem de vazio quando não há eventos", () => {
    vi.mocked(useEvents).mockReturnValue({ loading: false, error: null, events: [] });
    render(<EventsTable />);
    expect(screen.getByText("Nenhum evento ainda.")).toBeInTheDocument();
  });

  it("mostra erro quando presente", () => {
    vi.mocked(useEvents).mockReturnValue({
      loading: false,
      error: "Falha ao carregar",
      events: [],
    });
    render(<EventsTable />);
    expect(screen.getByText("Falha ao carregar")).toBeInTheDocument();
  });

  it("abre o modal de detalhes ao clicar numa linha", () => {
    vi.mocked(useEvents).mockReturnValue({
      loading: false,
      error: null,
      events: [
        {
          eventId: "e1",
          title: "Reunião com João",
          startTime: "2026-08-10T14:00:00.000Z",
          endTime: "2026-08-10T15:00:00.000Z",
          description: "Pauta do projeto",
          status: "created",
          phoneNumber: "5511999999999",
        },
      ],
    });

    render(<EventsTable />);
    expect(screen.queryByText("Pauta do projeto")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Reunião com João"));
    expect(screen.getByText("Pauta do projeto")).toBeInTheDocument();
  });
});
