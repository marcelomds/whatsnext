import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLanguage } from "../../hooks/useLanguage";
import { translations } from "../../i18n/translations";
import { DashboardScreen } from "./DashboardScreen";

vi.mock("./EventsTable", () => ({ EventsTable: () => <div>Events Table</div> }));
vi.mock("./CalendarView", () => ({ CalendarView: () => <div>Calendar View</div> }));
vi.mock("./NextEventCard", () => ({ NextEventCard: () => <div>Next Event Card</div> }));
vi.mock("../../hooks/useLanguage", () => ({ useLanguage: vi.fn() }));

vi.mocked(useLanguage).mockReturnValue({
  language: "pt",
  setLanguage: vi.fn(),
  t: (key) => translations.pt[key],
});

describe("DashboardScreen", () => {
  it("renderiza o título, o próximo evento e a lista por padrão", () => {
    render(<DashboardScreen />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Next Event Card")).toBeInTheDocument();
    expect(screen.getByText("Events Table")).toBeInTheDocument();
    expect(screen.queryByText("Calendar View")).not.toBeInTheDocument();
  });

  it("troca para a visão de calendário ao clicar em Calendário", async () => {
    render(<DashboardScreen />);

    await userEvent.click(screen.getByText("Calendário"));

    expect(screen.getByText("Calendar View")).toBeInTheDocument();
    expect(screen.queryByText("Events Table")).not.toBeInTheDocument();
  });
});
