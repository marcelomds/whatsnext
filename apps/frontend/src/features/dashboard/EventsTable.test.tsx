import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useEvents } from "../../hooks/useEvents";
import { EventsTable } from "./EventsTable";

vi.mock("../../hooks/useEvents", () => ({ useEvents: vi.fn() }));

describe("EventsTable", () => {
  beforeEach(() => vi.clearAllMocks());

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
    expect(screen.getByText("created")).toBeInTheDocument();
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
});
