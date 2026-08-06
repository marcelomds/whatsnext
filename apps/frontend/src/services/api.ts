const BASE_URL = import.meta.env.VITE_API_URL;
const TOKEN_STORAGE_KEY = "whatsnext_token";

let token: string | null = localStorage.getItem(TOKEN_STORAGE_KEY);
let unauthorizedHandler: (() => void) | null = null;

export function getToken(): string | null {
  return token;
}

export function setToken(newToken: string | null): void {
  token = newToken;

  if (newToken) {
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

// Deixa a camada de auth reagir (ex: voltar pra tela de login) sempre que
// uma requisição volta 401, sem esse módulo precisar conhecer estado do React.
export function onUnauthorized(handler: () => void): void {
  unauthorizedHandler = handler;
}

function authHeaders(): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    setToken(null);
    unauthorizedHandler?.();
    throw new Error("Sessão expirada, faça login novamente");
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || data?.error || `API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: "application/json", ...authHeaders() },
  });

  return parseResponse<T>(response);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return parseResponse<T>(response);
}
