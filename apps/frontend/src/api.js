const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/dev";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.error || "Erro na requisição");
  }

  return data;
}

export const api = {
  getInstanceStatus: () => request("/api/instance/status"),
  connectInstance: () => request("/api/instance/connect", { method: "POST" }),
  getMessages: (phoneNumber, limit = 50) =>
    request(
      `/api/messages?phoneNumber=${encodeURIComponent(phoneNumber)}&limit=${limit}`
    ),
  getEvents: (limit = 50) => request(`/api/events?limit=${limit}`),
};
