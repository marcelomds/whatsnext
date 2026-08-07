import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useLanguage } from "../../hooks/useLanguage";
import { translations } from "../../i18n/translations";
import { EventDetailsModal } from "./EventDetailsModal";

vi.mock("../../hooks/useLanguage", () => ({ useLanguage: vi.fn() }));

const event = {
  eventId: "e1",
  title: "Almoço",
  startTime: "2026-08-10T12:00:00",
  endTime: "2026-08-10T13:00:00",
  description: "Com a equipe",
  status: "created",
  phoneNumber: "5511999999999",
};

describe("EventDetailsModal", () => {
  beforeEach(() => {
    vi.mocked(useLanguage).mockReturnValue({
      language: "pt",
      setLanguage: vi.fn(),
      t: (key) => translations.pt[key],
    });
  });

  it("mostra título, descrição e status do evento", () => {
    render(<EventDetailsModal event={event} onClose={vi.fn()} />);

    expect(screen.getByText("Almoço")).toBeInTheDocument();
    expect(screen.getByText("Com a equipe")).toBeInTheDocument();
    expect(screen.getByText("Criado")).toBeInTheDocument();
  });

  it("chama onClose ao clicar no X", () => {
    const onClose = vi.fn();
    render(<EventDetailsModal event={event} onClose={onClose} />);

    fireEvent.click(screen.getByLabelText("Fechar"));
    expect(onClose).toHaveBeenCalled();
  });

  it("chama onClose ao clicar no fundo (backdrop)", () => {
    const onClose = vi.fn();
    const { container } = render(<EventDetailsModal event={event} onClose={onClose} />);

    fireEvent.click(container.firstChild as Element);
    expect(onClose).toHaveBeenCalled();
  });

  it("não chama onClose ao clicar dentro do card", () => {
    const onClose = vi.fn();
    render(<EventDetailsModal event={event} onClose={onClose} />);

    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("chama onClose ao pressionar Escape", () => {
    const onClose = vi.fn();
    render(<EventDetailsModal event={event} onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
