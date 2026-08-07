import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiGet, apiPost } from "./api";
import { getInstanceStatus, connectInstance, disconnectInstance } from "./instance";

vi.mock("./api", () => ({ apiGet: vi.fn(), apiPost: vi.fn() }));

describe("services/instance", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getInstanceStatus faz GET em /api/instance/status", async () => {
    vi.mocked(apiGet).mockResolvedValue({ success: true, data: { state: "open" } });

    const result = await getInstanceStatus();

    expect(apiGet).toHaveBeenCalledWith("/api/instance/status");
    expect(result.data.state).toBe("open");
  });

  it("connectInstance faz POST em /api/instance/connect", async () => {
    vi.mocked(apiPost).mockResolvedValue({ success: true, data: { base64: "img" } });

    await connectInstance();

    expect(apiPost).toHaveBeenCalledWith("/api/instance/connect");
  });

  it("disconnectInstance faz POST em /api/instance/disconnect", async () => {
    vi.mocked(apiPost).mockResolvedValue({ success: true, data: null });

    await disconnectInstance();

    expect(apiPost).toHaveBeenCalledWith("/api/instance/disconnect");
  });
});
