import { useEffect, useState } from "react";
import { getEvents } from "../services/events";
import type { CalendarEvent } from "../types/event";

export function useEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getEvents()
      .then(({ data }) => setEvents(data))
      .catch((err) => setError(err instanceof Error ? err.message : "Erro desconhecido"))
      .finally(() => setLoading(false));
  }, []);

  return { events, loading, error };
}
