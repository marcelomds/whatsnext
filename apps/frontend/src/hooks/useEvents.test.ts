import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { getEvents } from "../services/events";
import { useEvents } from "./useEvents";

vi.mock("../services/events", () => ({ getEvents: vi.fn() }));

describe("useEvents", () => {
  beforeEach(() => vi.clearAllMocks());

  it("carrega os eventos ao montar", async () => {
    vi.mocked(getEvents).mockResolvedValue({
      success: true,
      count: 1,
      data: [{ eventId: "e1", title: "Reunião", startTime: "t", endTime: "t2", status: "created", phoneNumber: "x" }],
    });

    const { result } = renderHook(() => useEvents());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.events).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it("expõe o erro quando a busca falha", async () => {
    vi.mocked(getEvents).mockRejectedValue(new Error("falha no servidor"));

    const { result } = renderHook(() => useEvents());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("falha no servidor");
    expect(result.current.events).toEqual([]);
  });
});
