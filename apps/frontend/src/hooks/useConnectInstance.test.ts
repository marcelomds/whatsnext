import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { getInstanceStatus, connectInstance, disconnectInstance } from "../services/instance";
import { useConnectInstance } from "./useConnectInstance";

vi.mock("../services/instance", () => ({
  getInstanceStatus: vi.fn(),
  connectInstance: vi.fn(),
  disconnectInstance: vi.fn(),
}));

describe("useConnectInstance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getInstanceStatus).mockResolvedValue({
      success: true,
      data: { instanceName: "whatsnext-marcelo", state: "close" },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("gera o QR code quando a instância ainda não está conectada", async () => {
    vi.mocked(connectInstance).mockResolvedValue({
      success: true,
      data: { base64: "data:image/png;base64,abc" },
    });

    const { result } = renderHook(() => useConnectInstance());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.startConnect();
    });

    expect(result.current.qrCode).toBe("data:image/png;base64,abc");
    expect(result.current.connecting).toBe(false);
  });

  it("não mostra QR code quando a Evolution já responde conectado", async () => {
    vi.mocked(connectInstance).mockResolvedValue({
      success: true,
      data: { instance: { instanceName: "x", state: "open" } },
    });

    const { result } = renderHook(() => useConnectInstance());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.startConnect();
    });

    expect(result.current.qrCode).toBeNull();
  });

  it("faz polling do status e limpa o QR code quando o usuário escaneia", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    vi.mocked(connectInstance).mockResolvedValue({
      success: true,
      data: { base64: "data:image/png;base64,abc" },
    });
    vi.mocked(getInstanceStatus)
      .mockResolvedValueOnce({ success: true, data: { instanceName: "x", state: "close" } })
      .mockResolvedValueOnce({ success: true, data: { instanceName: "x", state: "connecting" } })
      .mockResolvedValueOnce({ success: true, data: { instanceName: "x", state: "open" } });

    const { result } = renderHook(() => useConnectInstance());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.startConnect();
    });
    expect(result.current.qrCode).toBe("data:image/png;base64,abc");

    // primeira tentativa de polling: ainda "connecting"
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(result.current.qrCode).toBe("data:image/png;base64,abc");

    // segunda tentativa: "open" -> limpa o QR code
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(result.current.qrCode).toBeNull();
  });

  it("desconecta e atualiza o status", async () => {
    vi.mocked(disconnectInstance).mockResolvedValue({ success: true, data: null });
    vi.mocked(getInstanceStatus)
      .mockResolvedValueOnce({ success: true, data: { instanceName: "x", state: "open" } })
      .mockResolvedValueOnce({ success: true, data: { instanceName: "x", state: "close" } });

    const { result } = renderHook(() => useConnectInstance());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.disconnect();
    });

    expect(disconnectInstance).toHaveBeenCalled();
    expect(result.current.status?.state).toBe("close");
    expect(result.current.disconnecting).toBe(false);
  });

  it("expõe erro quando startConnect falha", async () => {
    vi.mocked(connectInstance).mockRejectedValue(new Error("Evolution indisponível"));

    const { result } = renderHook(() => useConnectInstance());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.startConnect();
    });

    expect(result.current.error).toBe("Evolution indisponível");
  });
});
