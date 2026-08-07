import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiGet, apiPost } from "./api";
import { login, register, getMe } from "./auth";

vi.mock("./api", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

describe("services/auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("login desembrulha data da resposta", async () => {
    vi.mocked(apiPost).mockResolvedValue({
      success: true,
      data: { token: "jwt", user: { userId: "u1" } },
    });

    const result = await login("a@a.com", "123456");

    expect(apiPost).toHaveBeenCalledWith("/api/auth/login", {
      email: "a@a.com",
      password: "123456",
    });
    expect(result.token).toBe("jwt");
  });

  it("register envia evolutionInstance opcional", async () => {
    vi.mocked(apiPost).mockResolvedValue({
      success: true,
      data: { token: "jwt", user: { userId: "u1" } },
    });

    await register("Marcelo", "a@a.com", "123456", "whatsnext-marcelo");

    expect(apiPost).toHaveBeenCalledWith("/api/auth/register", {
      name: "Marcelo",
      email: "a@a.com",
      password: "123456",
      evolutionInstance: "whatsnext-marcelo",
    });
  });

  it("getMe desembrulha data do usuário autenticado", async () => {
    vi.mocked(apiGet).mockResolvedValue({
      success: true,
      data: { userId: "u1", email: "a@a.com" },
    });

    const result = await getMe();

    expect(apiGet).toHaveBeenCalledWith("/api/auth/me");
    expect(result.userId).toBe("u1");
  });
});
