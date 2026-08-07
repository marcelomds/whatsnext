import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useConnectInstance } from "../../hooks/useConnectInstance";
import { ConnectScreen } from "./ConnectScreen";

vi.mock("../../hooks/useConnectInstance", () => ({ useConnectInstance: vi.fn() }));

function mockHook(overrides = {}) {
  vi.mocked(useConnectInstance).mockReturnValue({
    status: null,
    loading: false,
    connecting: false,
    disconnecting: false,
    qrCode: null,
    error: null,
    startConnect: vi.fn(),
    disconnect: vi.fn(),
    ...overrides,
  });
}

describe("ConnectScreen", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mostra 'Verificando conexão...' enquanto carrega", () => {
    mockHook({ loading: true });
    render(<ConnectScreen />);
    expect(screen.getByText("Verificando conexão...")).toBeInTheDocument();
  });

  it("mostra botão de gerar QR code quando desconectado", () => {
    mockHook({ status: { state: "close" } });
    render(<ConnectScreen />);
    expect(screen.getByRole("button", { name: "Gerar QR Code" })).toBeInTheDocument();
  });

  it("chama startConnect ao clicar em Gerar QR Code", async () => {
    const startConnect = vi.fn();
    mockHook({ status: { state: "close" }, startConnect });

    render(<ConnectScreen />);
    await userEvent.click(screen.getByRole("button", { name: "Gerar QR Code" }));

    expect(startConnect).toHaveBeenCalled();
  });

  it("mostra a imagem do QR code quando disponível", () => {
    mockHook({ status: { state: "connecting" }, qrCode: "data:image/png;base64,abc" });
    render(<ConnectScreen />);

    expect(screen.getByAltText("QR Code de pareamento")).toHaveAttribute(
      "src",
      "data:image/png;base64,abc"
    );
  });

  it("mostra estado conectado com opção de desconectar", async () => {
    mockHook({ status: { state: "open" } });
    render(<ConnectScreen />);

    expect(screen.getByText(/WhatsApp conectado/)).toBeInTheDocument();

    await userEvent.click(screen.getByText("Desconectar / trocar de número"));
    expect(screen.getByText(/Tem certeza\?/)).toBeInTheDocument();
  });

  it("confirma a desconexão chamando disconnect()", async () => {
    const disconnect = vi.fn().mockResolvedValue(undefined);
    mockHook({ status: { state: "open" }, disconnect });

    render(<ConnectScreen />);
    await userEvent.click(screen.getByText("Desconectar / trocar de número"));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(disconnect).toHaveBeenCalled();
  });

  it("cancela a desconexão sem chamar disconnect()", async () => {
    const disconnect = vi.fn();
    mockHook({ status: { state: "open" }, disconnect });

    render(<ConnectScreen />);
    await userEvent.click(screen.getByText("Desconectar / trocar de número"));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(disconnect).not.toHaveBeenCalled();
    expect(screen.getByText("Desconectar / trocar de número")).toBeInTheDocument();
  });

  it("mostra mensagem de erro quando presente", () => {
    mockHook({ status: { state: "close" }, error: "Falha ao conectar" });
    render(<ConnectScreen />);
    expect(screen.getByText("Falha ao conectar")).toBeInTheDocument();
  });
});
