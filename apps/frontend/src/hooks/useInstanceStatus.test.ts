import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { getInstanceStatus } from "../services/instance";
import { useInstanceStatus } from "./useInstanceStatus";

vi.mock("../services/instance", () => ({ getInstanceStatus: vi.fn() }));

describe("useInstanceStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("busca o status ao montar", async () => {
    vi.mocked(getInstanceStatus).mockResolvedValue({
      success: true,
      data: { instanceName: "whatsnext-marcelo", state: "open" },
    });

    const { result } = renderHook(() => useInstanceStatus());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.status?.state).toBe("open");
  });

  it("refresh() rebusca e retorna o novo status", async () => {
    vi.mocked(getInstanceStatus)
      .mockResolvedValueOnce({ success: true, data: { instanceName: "x", state: "connecting" } })
      .mockResolvedValueOnce({ success: true, data: { instanceName: "x", state: "open" } });

    const { result } = renderHook(() => useInstanceStatus());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let refreshed;
    await act(async () => {
      refreshed = await result.current.refresh();
    });

    expect(refreshed).toEqual({ instanceName: "x", state: "open" });
    expect(result.current.status?.state).toBe("open");
  });

  it("expõe erro e retorna null quando a busca falha", async () => {
    vi.mocked(getInstanceStatus).mockRejectedValue(new Error("falhou"));

    const { result } = renderHook(() => useInstanceStatus());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("falhou");
    expect(result.current.status).toBeNull();
  });
});
