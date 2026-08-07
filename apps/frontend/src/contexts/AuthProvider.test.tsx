import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getMe, login as loginRequest, register as registerRequest } from "../services/auth";
import { getToken, setToken, onUnauthorized } from "../services/api";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "../hooks/useAuth";

vi.mock("../services/auth", () => ({
  getMe: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
}));

vi.mock("../services/api", () => ({
  getToken: vi.fn(),
  setToken: vi.fn(),
  onUnauthorized: vi.fn(),
}));

function Consumer() {
  const { user, loading, login, register, logout } = useAuth();

  return (
    <div>
      <p>loading: {String(loading)}</p>
      <p>user: {user ? user.name : "nenhum"}</p>
      <button onClick={() => login("a@a.com", "123456")}>login</button>
      <button onClick={() => register("Ana", "ana@a.com", "123456")}>register</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getToken).mockReturnValue(null);
  });

  it("sem token salvo: termina loading sem chamar getMe", async () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByText("loading: false")).toBeInTheDocument());
    expect(getMe).not.toHaveBeenCalled();
    expect(screen.getByText("user: nenhum")).toBeInTheDocument();
  });

  it("com token salvo: busca o usuário via getMe", async () => {
    vi.mocked(getToken).mockReturnValue("token-valido");
    vi.mocked(getMe).mockResolvedValue({
      userId: "u1",
      name: "Marcelo",
      email: "m@m.com",
      evolutionInstance: "x",
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByText("user: Marcelo")).toBeInTheDocument());
  });

  it("token inválido (getMe falha): mantém usuário nulo", async () => {
    vi.mocked(getToken).mockReturnValue("token-invalido");
    vi.mocked(getMe).mockRejectedValue(new Error("401"));

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByText("loading: false")).toBeInTheDocument());
    expect(screen.getByText("user: nenhum")).toBeInTheDocument();
  });

  it("register() salva o token e o usuário", async () => {
    vi.mocked(registerRequest).mockResolvedValue({
      token: "jwt",
      user: { userId: "u2", name: "Ana", email: "ana@a.com", evolutionInstance: "y" },
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText("loading: false")).toBeInTheDocument());

    await userEvent.click(screen.getByText("register"));

    expect(registerRequest).toHaveBeenCalledWith("Ana", "ana@a.com", "123456", undefined);
    expect(setToken).toHaveBeenCalledWith("jwt");
    await waitFor(() => expect(screen.getByText("user: Ana")).toBeInTheDocument());
  });

  it("login() salva o token e o usuário", async () => {
    vi.mocked(loginRequest).mockResolvedValue({
      token: "jwt",
      user: { userId: "u1", name: "Marcelo", email: "m@m.com", evolutionInstance: "x" },
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText("loading: false")).toBeInTheDocument());

    await userEvent.click(screen.getByText("login"));

    expect(setToken).toHaveBeenCalledWith("jwt");
    await waitFor(() => expect(screen.getByText("user: Marcelo")).toBeInTheDocument());
  });

  it("logout() limpa o token e o usuário", async () => {
    vi.mocked(loginRequest).mockResolvedValue({
      token: "jwt",
      user: { userId: "u1", name: "Marcelo", email: "m@m.com", evolutionInstance: "x" },
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText("loading: false")).toBeInTheDocument());

    await userEvent.click(screen.getByText("login"));
    await waitFor(() => expect(screen.getByText("user: Marcelo")).toBeInTheDocument());

    await userEvent.click(screen.getByText("logout"));

    expect(setToken).toHaveBeenCalledWith(null);
    expect(screen.getByText("user: nenhum")).toBeInTheDocument();
  });

  it("registra o handler onUnauthorized que zera o usuário", async () => {
    vi.mocked(loginRequest).mockResolvedValue({
      token: "jwt",
      user: { userId: "u1", name: "Marcelo", email: "m@m.com", evolutionInstance: "x" },
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText("loading: false")).toBeInTheDocument());
    await userEvent.click(screen.getByText("login"));
    await waitFor(() => expect(screen.getByText("user: Marcelo")).toBeInTheDocument());

    expect(onUnauthorized).toHaveBeenCalledWith(expect.any(Function));
    const handler = vi.mocked(onUnauthorized).mock.calls[0][0];
    handler();

    await waitFor(() => expect(screen.getByText("user: nenhum")).toBeInTheDocument());
  });
});
