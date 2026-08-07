import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../hooks/useLanguage";
import { translations } from "../../i18n/translations";
import { LoginScreen } from "./LoginScreen";

vi.mock("../../hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../../hooks/useLanguage", () => ({ useLanguage: vi.fn() }));

describe("LoginScreen", () => {
  const login = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      login,
      register: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(useLanguage).mockReturnValue({
      language: "pt",
      setLanguage: vi.fn(),
      t: (key) => translations.pt[key],
    });
  });

  it("desabilita o botão até e-mail e senha serem preenchidos", () => {
    render(<LoginScreen onSwitchToRegister={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Entrar" })).toBeDisabled();
  });

  it("chama login com e-mail e senha ao submeter", async () => {
    login.mockResolvedValue(undefined);
    render(<LoginScreen onSwitchToRegister={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("E-mail"), "marcelo@example.com");
    await userEvent.type(screen.getByLabelText("Senha"), "senha123");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(login).toHaveBeenCalledWith("marcelo@example.com", "senha123");
  });

  it("mostra mensagem de erro quando o login falha", async () => {
    login.mockRejectedValue(new Error("E-mail ou senha inválidos"));
    render(<LoginScreen onSwitchToRegister={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("E-mail"), "marcelo@example.com");
    await userEvent.type(screen.getByLabelText("Senha"), "senha-errada");
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("E-mail ou senha inválidos")).toBeInTheDocument();
  });

  it("chama onSwitchToRegister ao clicar em Criar conta", async () => {
    const onSwitchToRegister = vi.fn();
    render(<LoginScreen onSwitchToRegister={onSwitchToRegister} />);

    await userEvent.click(screen.getByText("Criar conta"));

    expect(onSwitchToRegister).toHaveBeenCalled();
  });
});
