import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardScreen } from "./DashboardScreen";

vi.mock("./EventsTable", () => ({ EventsTable: () => <div>Events Table</div> }));
vi.mock("./MessagesTable", () => ({ MessagesTable: () => <div>Messages Table</div> }));

describe("DashboardScreen", () => {
  it("renderiza o título e as duas tabelas", () => {
    render(<DashboardScreen />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Events Table")).toBeInTheDocument();
    expect(screen.getByText("Messages Table")).toBeInTheDocument();
  });
});
