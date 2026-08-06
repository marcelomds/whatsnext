import { apiGet } from "./api";
import type { CalendarEvent } from "../types/event";

interface EventsResponse {
  success: boolean;
  data: CalendarEvent[];
  count: number;
}

export function getEvents(limit = 50) {
  return apiGet<EventsResponse>(`/api/events?limit=${limit}`);
}
