import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAuth } from "../../hooks/useAuth";
import { RegisterScreen } from "./RegisterScreen";

vi.mock("../../hooks/useAuth", () => ({ useAuth: vi.fn() }));

describe("RegisterScreen", () => {
  const register = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      register,
      logout: vi.fn(),
    });
  });

  it("desabilita o botão com senha menor que 6 caracteres", async () => {
    render(<RegisterScreen onSwitchToLogin={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Nome"), "Marcelo");
    await userEvent.type(screen.getByLabelText("E-mail"), "marcelo@example.com");
    await userEvent.type(screen.getByLabelText("Senha"), "123");

    expect(screen.getByRole("button", { name: "Criar conta" })).toBeDisabled();
  });

  it("chama register com evolutionInstance quando informado", async () => {
    register.mockResolvedValue(undefined);
    render(<RegisterScreen onSwitchToLogin={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Nome"), "Marcelo Moreira");
    await userEvent.type(screen.getByLabelText("E-mail"), "marcelo@example.com");
    await userEvent.type(screen.getByLabelText("Senha"), "senha123");
    await userEvent.type(
      screen.getByLabelText(/Nome da instância Evolution API/),
      "whatsnext-marcelo-moreira"
    );
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(register).toHaveBeenCalledWith(
      "Marcelo Moreira",
      "marcelo@example.com",
      "senha123",
      "whatsnext-marcelo-moreira"
    );
  });

  it("chama register com evolutionInstance undefined quando não informado", async () => {
    register.mockResolvedValue(undefined);
    render(<RegisterScreen onSwitchToLogin={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Nome"), "Ana");
    await userEvent.type(screen.getByLabelText("E-mail"), "ana@example.com");
    await userEvent.type(screen.getByLabelText("Senha"), "senha123");
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(register).toHaveBeenCalledWith("Ana", "ana@example.com", "senha123", undefined);
  });

  it("mostra erro quando o registro falha (ex: e-mail já cadastrado)", async () => {
    register.mockRejectedValue(new Error("E-mail já cadastrado"));
    render(<RegisterScreen onSwitchToLogin={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Nome"), "Marcelo");
    await userEvent.type(screen.getByLabelText("E-mail"), "marcelo@example.com");
    await userEvent.type(screen.getByLabelText("Senha"), "senha123");
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));

    expect(await screen.findByText("E-mail já cadastrado")).toBeInTheDocument();
  });
});
