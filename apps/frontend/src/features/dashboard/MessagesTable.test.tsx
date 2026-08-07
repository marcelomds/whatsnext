import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useMessages } from "../../hooks/useMessages";
import { MessagesTable } from "./MessagesTable";

vi.mock("../../hooks/useMessages", () => ({ useMessages: vi.fn() }));

describe("MessagesTable", () => {
  const search = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(useMessages).mockReturnValue({ loading: false, error: null, messages: [], search });
  });

  it("pede pra digitar um número quando nada foi buscado ainda", () => {
    render(<MessagesTable />);
    expect(screen.getByText("Digite um número para buscar mensagens.")).toBeInTheDocument();
  });

  it("busca automaticamente o número salvo no localStorage ao montar", () => {
    localStorage.setItem("whatsnext_phone", "5511999999999");
    render(<MessagesTable />);
    expect(search).toHaveBeenCalledWith("5511999999999");
  });

  it("busca e salva o número ao submeter o formulário", async () => {
    render(<MessagesTable />);

    await userEvent.type(
      screen.getByPlaceholderText("Número de telefone (ex: 5511999999999)"),
      "5511988887777"
    );
    await userEvent.click(screen.getByRole("button", { name: "Buscar" }));

    expect(search).toHaveBeenCalledWith("5511988887777");
    expect(localStorage.getItem("whatsnext_phone")).toBe("5511988887777");
  });

  it("mostra as mensagens retornadas", () => {
    vi.mocked(useMessages).mockReturnValue({
      loading: false,
      error: null,
      messages: [
        { messageId: "m1", phoneNumber: "5511999999999", content: "Oi", status: "success", timestamp: 1723000000000 },
      ],
      search,
    });

    render(<MessagesTable />);
    expect(screen.getByText("Oi")).toBeInTheDocument();
    expect(screen.getByText("success")).toBeInTheDocument();
  });
});
