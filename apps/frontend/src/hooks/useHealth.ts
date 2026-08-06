import { useEffect, useState } from "react";
import { getHealth } from "../services/health";
import type { HealthResponse } from "../types/health";

type Status = "loading" | "online" | "offline";

export function useHealth() {
  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<HealthResponse | null>(null);

  useEffect(() => {
    getHealth()
      .then((response) => {
        setData(response);
        setStatus("online");
      })
      .catch(() => setStatus("offline"));
  }, []);

  return { status, data };
}
