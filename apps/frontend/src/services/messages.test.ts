import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiGet } from "./api";
import { getMessages } from "./messages";

vi.mock("./api", () => ({ apiGet: vi.fn() }));

describe("services/messages", () => {
  beforeEach(() => vi.clearAllMocks());

  it("codifica o phoneNumber na query string", async () => {
    vi.mocked(apiGet).mockResolvedValue({ success: true, data: [], count: 0 });

    await getMessages("+55 11 99999-9999");

    expect(apiGet).toHaveBeenCalledWith(
      "/api/messages?phoneNumber=%2B55%2011%2099999-9999&limit=50"
    );
  });

  it("aceita limit customizado", async () => {
    vi.mocked(apiGet).mockResolvedValue({ success: true, data: [], count: 0 });

    await getMessages("5511999999999", 5);

    expect(apiGet).toHaveBeenCalledWith("/api/messages?phoneNumber=5511999999999&limit=5");
  });
});
