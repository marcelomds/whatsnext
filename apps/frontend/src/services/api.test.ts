import { describe, it, expect, vi, beforeEach } from "vitest";

describe("api", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("apiGet não envia Authorization quando não há token", async () => {
    const { apiGet } = await import("./api");
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    await apiGet("/health");

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });

  it("apiGet envia Authorization Bearer quando há token salvo", async () => {
    localStorage.setItem("whatsnext_token", "meu-token");
    const { apiGet } = await import("./api");

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    await apiGet("/api/auth/me");

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer meu-token");
  });

  it("apiPost envia método POST e body serializado", async () => {
    const { apiPost } = await import("./api");
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    await apiPost("/api/auth/login", { email: "a@a.com", password: "123456" });

    const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("/api/auth/login");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ email: "a@a.com", password: "123456" });
  });

  it("setToken/getToken persistem no localStorage", async () => {
    const { setToken, getToken } = await import("./api");

    setToken("abc123");
    expect(getToken()).toBe("abc123");
    expect(localStorage.getItem("whatsnext_token")).toBe("abc123");

    setToken(null);
    expect(getToken()).toBeNull();
    expect(localStorage.getItem("whatsnext_token")).toBeNull();
  });

  it("em resposta 401, limpa o token e dispara onUnauthorized", async () => {
    const { apiGet, setToken, getToken, onUnauthorized } = await import("./api");
    setToken("token-expirado");

    const handler = vi.fn();
    onUnauthorized(handler);

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: "Sessão expirada" }),
    });

    await expect(apiGet("/api/auth/me")).rejects.toThrow();

    expect(getToken()).toBeNull();
    expect(handler).toHaveBeenCalled();
  });

  it("lança erro com a mensagem do servidor quando a resposta não é ok (não-401)", async () => {
    const { apiGet } = await import("./api");

    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: "Não encontrado" }),
    });

    await expect(apiGet("/api/events/x")).rejects.toThrow("Não encontrado");
  });
});
