import { useCallback, useEffect, useState } from "react";
import { getInstanceStatus } from "../services/instance";
import type { InstanceStatus } from "../types/instance";

export function useInstanceStatus() {
  const [status, setStatus] = useState<InstanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await getInstanceStatus();
      setStatus(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      return null;
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  return { status, loading, error, refresh };
}
