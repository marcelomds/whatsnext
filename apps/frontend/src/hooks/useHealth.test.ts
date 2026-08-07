import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { getHealth } from "../services/health";
import { useHealth } from "./useHealth";

vi.mock("../services/health", () => ({ getHealth: vi.fn() }));

describe("useHealth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("começa em loading e vai para online quando a API responde", async () => {
    vi.mocked(getHealth).mockResolvedValue({
      status: "healthy",
      timestamp: "t",
      checks: { dynamodb: true, claude: true, googleCalendar: true },
    });

    const { result } = renderHook(() => useHealth());

    expect(result.current.status).toBe("loading");

    await waitFor(() => expect(result.current.status).toBe("online"));
    expect(result.current.data?.status).toBe("healthy");
  });

  it("vai para offline quando a API falha", async () => {
    vi.mocked(getHealth).mockRejectedValue(new Error("falhou"));

    const { result } = renderHook(() => useHealth());

    await waitFor(() => expect(result.current.status).toBe("offline"));
  });
});
