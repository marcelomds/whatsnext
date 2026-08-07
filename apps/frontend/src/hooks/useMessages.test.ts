import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { getMessages } from "../services/messages";
import { useMessages } from "./useMessages";

vi.mock("../services/messages", () => ({ getMessages: vi.fn() }));

describe("useMessages", () => {
  beforeEach(() => vi.clearAllMocks());

  it("começa vazio, sem buscar nada até search() ser chamado", () => {
    const { result } = renderHook(() => useMessages());

    expect(result.current.messages).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(getMessages).not.toHaveBeenCalled();
  });

  it("busca mensagens para o número informado", async () => {
    vi.mocked(getMessages).mockResolvedValue({
      success: true,
      count: 1,
      data: [{ messageId: "m1", phoneNumber: "5511999999999", content: "oi", status: "success", timestamp: 1 }],
    });

    const { result } = renderHook(() => useMessages());

    await act(async () => {
      await result.current.search("5511999999999");
    });

    expect(getMessages).toHaveBeenCalledWith("5511999999999");
    expect(result.current.messages).toHaveLength(1);
  });

  it("não busca quando o número está vazio", async () => {
    const { result } = renderHook(() => useMessages());

    await act(async () => {
      await result.current.search("");
    });

    expect(getMessages).not.toHaveBeenCalled();
  });

  it("expõe erro quando a busca falha", async () => {
    vi.mocked(getMessages).mockRejectedValue(new Error("falhou"));

    const { result } = renderHook(() => useMessages());

    await act(async () => {
      await result.current.search("5511999999999");
    });

    await waitFor(() => expect(result.current.error).toBe("falhou"));
  });
});
