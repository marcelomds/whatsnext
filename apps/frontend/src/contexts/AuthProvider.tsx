import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getMe, login as loginRequest, register as registerRequest } from "../services/auth";
import { getToken, onUnauthorized, setToken } from "../services/api";
import type { User } from "../types/auth";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    onUnauthorized(() => setUser(null));

    let cancelled = false;

    (async () => {
      const token = getToken();

      if (token) {
        try {
          const current = await getMe();
          if (!cancelled) setUser(current);
        } catch {
          if (!cancelled) setUser(null);
        }
      }

      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginRequest(email, password);
    setToken(result.token);
    setUser(result.user);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string, evolutionInstance?: string) => {
      const result = await registerRequest(name, email, password, evolutionInstance);
      setToken(result.token);
      setUser(result.user);
    },
    []
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}
