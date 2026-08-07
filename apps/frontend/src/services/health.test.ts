import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiGet } from "./api";
import { getHealth } from "./health";

vi.mock("./api", () => ({ apiGet: vi.fn() }));

describe("services/health", () => {
  beforeEach(() => vi.clearAllMocks());

  it("faz GET em /health", async () => {
    vi.mocked(apiGet).mockResolvedValue({ status: "healthy" });

    const result = await getHealth();

    expect(apiGet).toHaveBeenCalledWith("/health");
    expect(result.status).toBe("healthy");
  });
});
