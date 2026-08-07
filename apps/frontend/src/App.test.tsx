import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useHealth } from "./hooks/useHealth";
import { useAuth } from "./hooks/useAuth";
import App from "./App";

vi.mock("./hooks/useHealth", () => ({ useHealth: vi.fn() }));
vi.mock("./hooks/useAuth", () => ({ useAuth: vi.fn() }));

vi.mock("./features/dashboard/DashboardScreen", () => ({
  DashboardScreen: () => <div>Dashboard Screen</div>,
}));
vi.mock("./features/connect/ConnectScreen", () => ({
  ConnectScreen: () => <div>Connect Screen</div>,
}));
vi.mock("./features/auth/LoginScreen", () => ({
  LoginScreen: ({ onSwitchToRegister }: { onSwitchToRegister: () => void }) => (
    <div>
      Login Screen
      <button onClick={onSwitchToRegister}>ir para registro</button>
    </div>
  ),
}));
vi.mock("./features/auth/RegisterScreen", () => ({
  RegisterScreen: () => <div>Register Screen</div>,
}));

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useHealth).mockReturnValue({ status: "online", data: null });
  });

  it("mostra spinner enquanto a sessão está carregando", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    const { container } = render(<App />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("mostra a tela de login quando não há usuário autenticado", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    render(<App />);
    expect(screen.getByText("Login Screen")).toBeInTheDocument();
  });

  it("troca para a tela de registro", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    render(<App />);
    await userEvent.click(screen.getByText("ir para registro"));

    expect(screen.getByText("Register Screen")).toBeInTheDocument();
  });

  it("mostra o painel (Dashboard por padrão) quando há usuário autenticado", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: "u1", name: "Marcelo", email: "m@m.com", evolutionInstance: "x" },
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    render(<App />);

    expect(screen.getByText("WhatsNext")).toBeInTheDocument();
    expect(screen.getByText("Marcelo")).toBeInTheDocument();
    expect(screen.getByText("Dashboard Screen")).toBeInTheDocument();
  });

  it("troca para a aba Conectar WhatsApp", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: "u1", name: "Marcelo", email: "m@m.com", evolutionInstance: "x" },
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    render(<App />);
    await userEvent.click(screen.getByText("Conectar WhatsApp"));

    expect(screen.getByText("Connect Screen")).toBeInTheDocument();
  });

  it("chama logout ao clicar em Sair", async () => {
    const logout = vi.fn();
    vi.mocked(useAuth).mockReturnValue({
      user: { userId: "u1", name: "Marcelo", email: "m@m.com", evolutionInstance: "x" },
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout,
    });

    render(<App />);
    await userEvent.click(screen.getByText("Sair"));

    expect(logout).toHaveBeenCalled();
  });
});
