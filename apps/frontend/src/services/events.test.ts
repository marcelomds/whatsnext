import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiGet } from "./api";
import { getEvents } from "./events";

vi.mock("./api", () => ({ apiGet: vi.fn() }));

describe("services/events", () => {
  beforeEach(() => vi.clearAllMocks());

  it("busca eventos com limit default 50", async () => {
    vi.mocked(apiGet).mockResolvedValue({ success: true, data: [], count: 0 });

    await getEvents();

    expect(apiGet).toHaveBeenCalledWith("/api/events?limit=50");
  });

  it("aceita limit customizado", async () => {
    vi.mocked(apiGet).mockResolvedValue({ success: true, data: [], count: 0 });

    await getEvents(10);

    expect(apiGet).toHaveBeenCalledWith("/api/events?limit=10");
  });
});
